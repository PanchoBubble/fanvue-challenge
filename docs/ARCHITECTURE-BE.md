# Fanvue Challenge - Backend Architecture Plan

## Challenge Overview

Building the backend for an inbox-style thread viewer:
- Node.js/Express API server (TypeScript)
- PostgreSQL + TypeORM for persistence
- Real-time messaging via SSE
- Performance optimization for 20,000+ messages
- Dockerized environment

> Frontend will be planned separately.

## Architecture Decisions

### Backend Stack

| Technology | Why | Alternative | Why Not |
|---|---|---|---|
| **Express.js + TypeScript** | Lightweight, typed API server | Next.js API routes | Overkill for API-only backend |
| **PostgreSQL** | Relational data (threads→messages), first-class TypeORM support, migrations, indexes | MongoDB | Weak TypeORM support, no migrations, schema-less overkill for structured data |
| **TypeORM** | Decorator-based entities, migrations, query builder, great Postgres support | Prisma / Knex | TypeORM specified in requirements |
| **SSE** | Specified as extra credit in challenge | WebSockets | More complex, bidirectional not needed |
| **Redis** | Pub/sub for SSE broadcasting across instances, optional caching | In-process EventEmitter | Won't scale past single process |
| **Docker** | Consistent environment, easy setup | Local install | Ensures reproducibility |

### Why PostgreSQL over MongoDB

- **Relational fit**: Threads have many Messages — natural FK + JOIN
- **TypeORM**: Full feature set (migrations, relations, query builder, decorators) vs MongoDB's limited TypeORM support (no migrations, no relations)
- **Cursor pagination**: `WHERE created_at > :cursor ORDER BY created_at LIMIT :n` with B-tree index is extremely fast
- **Docker image**: ~80MB (alpine) vs MongoDB's ~700MB
- **ACID transactions**: Guaranteed consistency for message creation + thread metadata updates

### Real-time Communication: SSE

**Decision: Server-Sent Events (SSE)**

- Challenge specifically mentions SSE as extra credit
- Perfect for one-way server→client message push
- Automatic reconnection via EventSource API
- Better HTTP/2 compatibility than WebSockets
- Redis pub/sub backs the SSE broadcasting (allows horizontal scaling)
- Heartbeat mechanism keeps connections alive
- Fallback: polling if SSE connection fails

## Project Structure

```
fanvue-challenge/
├── docker-compose.yml
├── .env.example
├── README.md
├── DECISIONS.md
├── ARCHITECTURE.md
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── tsconfig.json
│   ├── package.json
│   ├── src/
│   │   ├── index.ts                  # Entry point — starts server
│   │   ├── app.ts                    # Express app setup (middleware, routes)
│   │   ├── config/
│   │   │   ├── database.ts           # TypeORM DataSource configuration
│   │   │   └── env.ts                # Environment variable validation
│   │   ├── entities/
│   │   │   ├── Thread.ts             # TypeORM Thread entity
│   │   │   └── Message.ts            # TypeORM Message entity
│   │   ├── migrations/
│   │   │   └── 001-CreateSchema.ts   # Initial schema migration
│   │   ├── routes/
│   │   │   ├── threads.ts            # GET /threads, POST /threads
│   │   │   └── messages.ts           # GET/POST messages, GET stream
│   │   ├── services/
│   │   │   ├── ThreadService.ts      # Thread business logic
│   │   │   ├── MessageService.ts     # Message CRUD + pagination
│   │   │   └── SSEService.ts         # SSE connection management + Redis pub/sub
│   │   ├── middleware/
│   │   │   ├── auth.ts               # requireAuth + requireAuthFlexible (header + query param)
│   │   │   ├── cors.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── validation.ts         # Request body/param validation
│   │   ├── utils/
│   │   │   ├── logger.ts
│   │   │   └── cursor.ts             # Cursor encode/decode helpers
│   │   └── seed/
│   │       └── seedData.ts           # Generate 20,000+ messages
│   └── tests/
│       ├── services/
│       │   ├── ThreadService.test.ts
│       │   └── MessageService.test.ts
│       └── routes/
│           ├── threads.test.ts
│           └── messages.test.ts
└── frontend/                         # (planned separately)
```

## API Design

### Endpoints

```
GET /api/threads
  - Returns list of threads with metadata
  - Query: ?search= (optional, filters by title — server-side ILIKE)
  - Response: { threads: Thread[] }

POST /api/threads
  - Creates a new thread
  - Body: { title: string }
  - Validation: title must be non-empty string, min 2 chars, max 255
  - Response: { thread: Thread }

GET /api/threads/:id/messages?cursor=<string>&limit=<number>
  - Paginated messages for a thread (chronological order, oldest first)
  - Default limit: 50
  - Cursor: base64-encoded timestamp of last message
  - Response: { items: Message[], nextCursor: string | null }

POST /api/threads/:id/messages
  - Add new message to thread
  - Body: { text: string }
  - Validates: text is non-empty string, thread exists
  - Side effects: updates thread.lastMessageAt, broadcasts via SSE
  - Response: { message: Message }

GET /api/threads/:id/stream
  - SSE endpoint for real-time messages
  - Auth: supports ?token=<jwt> query param (EventSource cannot send headers)
  - Headers: Content-Type: text/event-stream
  - Events: { type: "message", data: Message }
  - Heartbeat: every 30s to keep connection alive
  - Cleanup: on client disconnect
```

### TypeORM Entities

```typescript
// entities/Thread.ts
@Entity()
class Thread {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  title: string;

  @Column({ type: "timestamp", default: () => "NOW()" })
  lastMessageAt: Date;

  @Column({ default: 0 })
  unreadCount: number;

  @OneToMany(() => Message, (message) => message.thread)
  messages: Message[];

  @Column({ default: 0 })
  messageCount: number;
}

// entities/Message.ts
@Entity()
@Index(["thread", "createdAt"])  // Composite index for cursor pagination
class Message {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Thread, (thread) => thread.messages, { onDelete: "CASCADE" })
  thread: Thread;

  @Column()
  threadId: string;

  @Column("text")
  text: string;

  @Column()
  author: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

### Database Indexes

```sql
-- Auto-created by TypeORM
CREATE INDEX idx_message_thread_created ON message (thread_id, created_at);
-- For thread search
CREATE INDEX idx_thread_title ON thread USING gin (title gin_trgm_ops);
-- For ordering threads
CREATE INDEX idx_thread_last_message ON thread (last_message_at DESC);
```

## Performance Strategy

### Cursor-Based Pagination (20,000+ messages)

```typescript
// MessageService.ts — efficient cursor pagination
async getMessages(threadId: string, cursor?: string, limit = 50) {
  const qb = this.messageRepo
    .createQueryBuilder("msg")
    .where("msg.threadId = :threadId", { threadId })
    .orderBy("msg.createdAt", "ASC")
    .limit(limit + 1); // fetch one extra to determine nextCursor

  if (cursor) {
    const decoded = decodeCursor(cursor); // base64 → { createdAt }
    qb.andWhere("msg.createdAt > :cursor", { cursor: decoded.createdAt });
  }

  const messages = await qb.getMany();
  const hasMore = messages.length > limit;
  if (hasMore) messages.pop();

  return {
    items: messages,
    nextCursor: hasMore ? encodeCursor(messages[messages.length - 1]) : null,
  };
}
```

**Why cursor > offset:**
- `OFFSET 10000` scans and discards 10K rows — O(n)
- `WHERE created_at > cursor` uses B-tree index — O(log n)
- Stable under concurrent inserts (no skipped/duplicate rows)

### SSE + Redis Pub/Sub

```typescript
// SSEService.ts
class SSEService {
  private connections = new Map<string, Set<Response>>(); // threadId → clients
  private redisSubscriber: Redis;
  private redisPublisher: Redis;

  // On POST /threads/:id/messages → publish to Redis
  async broadcastMessage(threadId: string, message: Message) {
    await this.redisPublisher.publish(
      `thread:${threadId}`,
      JSON.stringify(message)
    );
  }

  // Redis subscriber forwards to SSE clients
  private onRedisMessage(channel: string, data: string) {
    const threadId = channel.replace("thread:", "");
    const clients = this.connections.get(threadId);
    clients?.forEach((res) => {
      res.write(`event: message\ndata: ${data}\n\n`);
    });
  }

  // Heartbeat to keep connections alive
  private startHeartbeat(res: Response) {
    const interval = setInterval(() => {
      res.write(`:heartbeat\n\n`);
    }, 30_000);
    res.on("close", () => clearInterval(interval));
  }
}
```

## Docker Configuration

```yaml
# docker-compose.yml
services:
  api:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USER=fanvue
      - DB_PASSWORD=fanvue_dev
      - DB_NAME=fanvue_inbox
      - REDIS_URL=redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    volumes:
      - ./backend/src:/app/src  # Hot reload in dev

  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=fanvue
      - POSTGRES_PASSWORD=fanvue_dev
      - POSTGRES_DB=fanvue_inbox
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U fanvue -d fanvue_inbox"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  pg_data:
  redis_data:
```

### Backend Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

EXPOSE 3001

# Run migrations, seed, then start
CMD ["sh", "-c", "npm run migration:run && npm run seed && npm start"]
```

## Seed Data Strategy

```typescript
// seed/seedData.ts
// Generate realistic test data:
// - 10 threads with varied titles
// - 1 thread with 20,000+ messages (performance testing)
// - Other threads with 50-500 messages each
// - Messages spread over realistic time ranges
// - Multiple authors per thread
// - Idempotent: check if data exists before seeding
```

## Error Handling

```typescript
// middleware/errorHandler.ts
// - 400: Invalid request body (missing text, bad cursor)
// - 404: Thread not found
// - 422: Validation errors (empty text, invalid limit)
// - 500: Internal server error with sanitized message
// - All errors return: { error: string, details?: string }
```

## Implementation Checklist

### Backend
- [ ] Docker environment (docker-compose + Dockerfile)
- [ ] Express + TypeScript project setup
- [ ] TypeORM configuration + DataSource
- [ ] Thread entity + Message entity
- [ ] Initial migration (001-CreateSchema)
- [ ] ThreadService (list, get by id, search, create)
- [ ] MessageService (paginated get, create)
- [ ] Thread routes (GET /api/threads, POST /api/threads)
- [ ] Message routes (GET messages, POST message)
- [ ] Cursor encode/decode utilities
- [ ] SSE endpoint (GET /api/threads/:id/stream)
- [ ] SSEService + Redis pub/sub
- [ ] CORS middleware
- [ ] Error handling middleware
- [ ] Input validation middleware
- [ ] Seed data generation (20,000+ messages)
- [ ] Unit tests for services
- [ ] Integration tests for API routes
- [ ] README with setup instructions

## Performance Benchmarks (Target)

- **Thread list retrieval**: < 50ms
- **Message pagination (50 items from 20K)**: < 30ms (indexed query)
- **Message posting + broadcast**: < 50ms
- **SSE message delivery**: < 100ms
- **Seed 20K messages**: < 10s

---

*Backend-focused plan. Frontend architecture will be planned separately.*
