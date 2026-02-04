# Fanvue Inbox — Thread Viewer

A 2-pane inbox-style thread viewer with real-time messaging, built as a full-stack TypeScript application.

**Left pane:** searchable list of threads — **Right pane:** messages for the selected thread with live updates via SSE.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite, TanStack Router & Query, Zustand, Tailwind CSS, Framer Motion |
| Backend | Express, TypeORM, PostgreSQL 16, Redis 7, JWT auth |
| Infra | Docker Compose, Caddy (prod), GitHub Actions CI/CD |

## Prerequisites

- **Docker & Docker Compose** (recommended) — or —
- **Node.js 20+**, PostgreSQL 16, and Redis 7 running locally

## Running Locally

### Option 1: Docker Compose (easiest)

```bash
# 1. Clone the repo
git clone <repo-url> && cd fanvue-challenge

# 2. Copy env file (defaults work out of the box for dev)
cp .env.example .env

# 3. Start backend + Postgres + Redis
docker compose up -d

# 4. Start the frontend dev server
cd frontend && npm install && npm run dev
```

The API will be available at `http://localhost:3001` and the frontend at `http://localhost:5173`.

Docker Compose starts **three services**:
- `api` — Express backend on port 3001 (auto-runs build, migrations, and seed)
- `postgres` — PostgreSQL 16 on port 5432
- `redis` — Redis 7 on port 6379

### Option 2: Run Everything Manually

You'll need PostgreSQL and Redis running locally first.

```bash
# 1. Copy and edit env file
cp .env.example .env
# Adjust DB_HOST, DB_PORT, REDIS_URL etc. if needed

# 2. Backend
cd backend
npm install
npm run build
npm run migration:run
npm run seed
npm run dev          # starts on http://localhost:3001

# 3. Frontend (in a separate terminal)
cd frontend
npm install
npm run dev          # starts on http://localhost:5173
```

### Default credentials (from seed data)

The seed script creates sample users and threads with 20,000+ messages for performance testing. Check the seed output for login credentials, or register a new account from the UI.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment |
| `PORT` | `3001` | API server port |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `fanvue` | PostgreSQL user |
| `DB_PASSWORD` | `fanvue_dev` | PostgreSQL password |
| `DB_NAME` | `fanvue_inbox` | PostgreSQL database name |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `JWT_SECRET` | `fanvue-dev-secret-change-in-prod` | JWT signing secret |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login, returns JWT |
| `GET` | `/api/threads` | List threads (sorted by lastMessageAt) |
| `GET` | `/api/threads/:id/messages?cursor=&limit=` | Paginated messages (cursor-based) |
| `POST` | `/api/threads/:id/messages` | Send a message `{ text: string }` |
| `GET` | `/api/threads/:id/stream` | SSE — real-time messages for a thread |
| `GET` | `/api/threads/stream` | SSE — real-time thread list updates |

## Project Structure

```
fanvue-challenge/
├── backend/
│   └── src/
│       ├── config/         # Database & env config
│       ├── entities/       # TypeORM entities (User, Thread, Message)
│       ├── routes/         # Express route handlers
│       ├── services/       # Business logic (Auth, Thread, Message, SSE)
│       ├── middleware/      # Auth, CORS, error handling, validation
│       ├── migrations/     # Database migrations
│       ├── seed/           # Seed data (20k+ messages)
│       └── utils/          # Cursor pagination, logger
├── frontend/
│   └── src/
│       ├── routes/         # TanStack file-based routing
│       ├── components/     # Chat & auth UI components
│       ├── hooks/          # Custom hooks (useThreads, useMessages, SSE streams)
│       ├── lib/            # API client, auth store, query config
│       └── types/          # TypeScript API types
├── docs/                   # Architecture & CI/CD docs
├── docker-compose.yml      # Dev environment
├── docker-compose.prod.yml # Production environment
└── Caddyfile               # Reverse proxy config
```

## Available Scripts

### Backend (`cd backend`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled JS |
| `npm run migration:run` | Run database migrations |
| `npm run seed` | Seed sample data |
| `npm test` | Run tests (Jest) |
| `npm run typecheck` | Type-check without emitting |
| `npm run format` | Format code with Prettier |

### Frontend (`cd frontend`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check & build for production |
| `npm run lint` | Lint with ESLint |
| `npm run preview` | Preview production build |

## Key Features

- **Real-time messaging** via Server-Sent Events (SSE) with Redis pub/sub
- **Cursor-based pagination** for efficient message loading in threads with 20k+ messages
- **Virtual scrolling** (`@tanstack/react-virtual`) to render large message lists without DOM bloat
- **Smart scroll behavior** — auto-scrolls on new messages when at bottom; shows a "new messages" indicator when scrolled up
- **Client-side thread search** with debounced filtering
- **JWT authentication** with protected routes
- **Optimistic UI updates** via React Query mutation callbacks
- **Proper cleanup** of SSE connections, AbortController cancellation on thread switches, and no state updates after unmount

## Assumptions & Tradeoffs

- **PostgreSQL + Redis instead of in-memory** — the challenge spec allowed in-memory data, but a real database was chosen to demonstrate production-readiness and to properly handle 20k+ message volumes with cursor pagination at the DB level.
- **SSE over WebSockets** — SSE is simpler for the unidirectional push pattern needed here (server → client) and works with standard HTTP infrastructure. Messages are sent via REST POST.
- **Cursor-based over offset pagination** — cursors are more performant for large datasets and stable when new messages arrive during pagination.
- **TanStack Virtual** — chose virtualization to handle the performance requirement of rendering large message lists without creating thousands of DOM nodes.
