# DECISIONS.md

## Part 1: Challenge Requirements

### Approach to Handling Large Numbers of Messages

The thread "Project Alpha - Sprint Planning" contains 20,000 messages, which would be unusable if rendered as a flat DOM list. I addressed this at two levels.

**Virtualized rendering with TanStack Virtual.** Only the visible messages plus an overscan buffer of 10 items are mounted in the DOM. Each row is absolutely positioned via `transform: translateY()` inside a container whose height equals the virtualizer's computed total size. The virtualizer uses `measureElement` ref callbacks for dynamic row heights since messages vary in length, and stable keys (`message.id`) to avoid unnecessary reconciliation.

**Cursor-based pagination.** Messages are fetched in pages of 50 (configurable up to 100). The API uses a `createdAt` based cursor encoded as base64url, backed by a database index on `(threadId, createdAt)`. This avoids the performance cliff of `OFFSET` based pagination on large datasets. On the frontend, TanStack Query's `useInfiniteQuery` manages the page cache, fetching older pages via `getPreviousPageParam` when the user scrolls near the top (`scrollTop < 200px`).

The combination means the browser never holds more than a few hundred DOM nodes regardless of thread size, and the database query remains O(log n) per page fetch.


### Scroll Anchoring and "New Messages" Behavior

Scroll anchoring is the trickiest part of a chat UI. I use `useLayoutEffect` (not `useEffect`) to measure and adjust the scroll container **before the browser paints**, which eliminates visible jitter.

Three scenarios are handled:

1. **Initial load or thread switch:** Scroll instantly to the last message via `virtualizer.scrollToIndex(messages.length - 1, { align: 'end' })`.

2. **Older messages prepended (infinite scroll upward):** When the user scrolls up and a new page loads, messages are prepended to the array. I track the previous `scrollHeight` and the previous first message ID in refs. In `useLayoutEffect`, I detect that the first message changed, compute the height delta (`el.scrollHeight - prevScrollHeight`), and add it to `el.scrollTop`. This keeps the user's viewport pinned to the same message they were reading.

3. **New message arrives via SSE:**
   - If the current user sent it (`pendingSend` ref is set), scroll to bottom instantly.
   - If another participant sent it, scroll to bottom with `behavior: 'smooth'` for a less jarring experience.
   - If the user has scrolled up, the new message is appended to the cache silently without disrupting their scroll position. The virtualizer handles this naturally since the new item is outside the viewport.

The thread list also shows a flashing dot indicator on threads that received new messages, using a compare-during-render pattern (no effects needed) that checks timestamp changes between renders.


### Race Conditions and Cancellation

**Thread switching.** When the user rapidly switches between threads, in-flight message fetches for the previous thread could return stale data. TanStack Query handles this automatically. When the query key changes from `['messages', threadA]` to `['messages', threadB]`, it marks the previous query as inactive. The response for thread A, if it arrives late, updates thread A's cache entry, not the currently displayed thread B. You could also implement this manually with fetch and Zustand, using AbortSignal to cancel on thread change, or checking if the current query parameters still match when the response arrives and discarding stale results. Zustand would let you access this data from anywhere in the app without triggering multiple requests. Both approaches work but that's basically reimplementing what TanStack Query does under the hood with a lot more code.

**SSE lifecycle.** Each `useThreadStream` hook opens an `EventSource` for the selected thread and returns a cleanup function (`() => es.close()`) that fires when the thread ID changes or the component unmounts. This prevents messages from thread A leaking into thread B's view. The same pattern applies to the global `useThreadsStream` hook.

**SSE vs mutation race.** When a user sends a message, the `POST` response and the SSE event for that same message can arrive in any order. To handle this, the SSE handler in `useThreadStream` deduplicates by checking `items.some(m => m.id === msg.id)` before appending. Also the `useSendMessage` mutation intentionally does **not** invalidate the messages query on success. If it did, the refetch would race with the SSE cache update, potentially causing scroll jumps or duplicate flashes.

**Subscription cleanup.** All `useEffect` hooks that create subscriptions (SSE connections, scroll listeners) return cleanup functions. Scroll listeners use `{ passive: true }` for performance since they don't call `preventDefault`.


### State Management and Lifecycle Hooks

I split state into two categories based on its nature.

**Server state with TanStack Query.** Threads and messages are server-owned data that needs caching, background refetching, pagination, and deduplication. TanStack Query manages all of this declaratively. Query keys are centralized in a `queryKeys` factory (`queryKeys.messages.byThread(id)`) so invalidation is consistent and typo-proof. The query client is configured with `staleTime: 30_000` and `retry: 1` to balance freshness with network efficiency.

**Client state with Zustand.** Authentication (token, user, login/logout actions) is app-wide client state that persists across page reloads. Zustand's `persist` middleware stores the token in localStorage, and `onRehydrateStorage` recomputes the `isAuthenticated` derived state on page load. Zustand was chosen over React Context because it doesn't cause re-renders in unrelated components when auth state changes, and over Redux because the auth slice is simple enough that Redux's boilerplate isn't justified.

**Key lifecycle patterns:**
- `useLayoutEffect` for scroll anchoring (synchronous DOM measurement before paint, avoids jitter that `useEffect` would cause)
- `useCallback` for stable function references passed as props (e.g., `setSelectedThreadId` wrapping router navigation)
- Refs (`useRef`) for values that need to persist across renders without triggering re-renders: previous scroll height, previous message count, pending send flag
- Effect cleanup functions for all subscriptions and timers (SSE close, scroll listener removal, setTimeout clearing for flash indicators)


## Part 2: Implementation Approach and Tradeoffs

### Stack Choices

**TanStack Start (Vite) over Next.js.** I chose a Vite-based SPA with TanStack Router instead of Next.js because this is a real-time chat application, not a content site that benefits from SSR/SSG. Vite provides faster dev server startup and HMR, and the SPA model is simpler for an SSE-heavy app where every page requires authentication anyway. It's also straightforward to deploy as static files on Cloudflare or any CDN.

**PostgreSQL over MongoDB.** The Docker image for PostgreSQL is significantly smaller (around 80MB for alpine vs 700MB+ for MongoDB), which speeds up CI and deployments. More importantly, PostgreSQL handles relational queries and indexing better for this use case. The `(threadId, createdAt)` index makes cursor pagination efficient.

**Express + PostgreSQL + Redis over in-memory data.** The challenge allows in-memory data, but I chose a persistent stack because PostgreSQL gives us proper indexing for cursor pagination on 20k+ messages, Redis pub/sub enables SSE to work across multiple API instances (horizontally scalable), and it demonstrates production-readiness without adding much complexity via TypeORM migrations.

**SSE over WebSockets.** SSE is unidirectional (server to client), which is all we need for push notifications. It works over standard HTTP, is automatically reconnected by the browser's `EventSource` API, and doesn't require a separate protocol upgrade. For sending messages, a regular `POST` request is simpler and more reliable than a bidirectional WebSocket.

**TypeORM migrations over synchronize.** I used migrations instead of `synchronize: true` to give it a production-ready feel. The migration scripts weren't hard to set up and I already have a couple repos that handle it this way. For simpler applications where you don't need high volume or search performance, I'd suggest using something like MongoDB which synchronizes everything automatically and you don't need to worry about data structure. But given this task focuses on performance, I went with migrations.

### Authentication

The spec didn't require authentication, but I added it for two reasons. First, it gives the app more of a production feel. Second, it allows users to create an account with a username that gets displayed in the chat. This makes it an actual online chat where you can see who sent each message, not just a mock UI.

### Thread Search

The spec said client-side filtering is fine, and that's what I went with. We fetch all threads on load and filter in the frontend. I did implement a server-side solution with ILIKE at first, but removed it since it's not efficient for this test in particular. We only have a handful of threads, so there's no need for server-side filtering or pagination. If we were thinking about having over 500 threads, I would do it server-side and add pagination to the thread list.

### Memoization and Re-renders

I only used `useMemo` in a couple places throughout the repo. The core optimization to prevent unnecessary re-renders isn't something we really need to do manually because the TanStack tools already handle it for us. The virtualizer only renders visible items, so even if the parent re-renders, only the visible message components are in the DOM. TanStack Query also handles caching and deduplication, so we're not re-fetching or re-rendering on every state change.

### Real-Time Architecture

The backend uses Redis pub/sub as a message broker between API instances and SSE connections.

When a message is created via `POST`, the `MessageService` saves it to PostgreSQL, then publishes to Redis channel `thread:<threadId>`. The `SSEService` subscribes to these channels and forwards events to connected clients. A separate `threads:global` channel broadcasts thread-level events (created, updated, deleted) to the thread list. Heartbeats are sent every 30 seconds to keep connections alive through proxies and load balancers.

This architecture means adding a second API server just works. Both instances subscribe to the same Redis channels.

### Seed Data Strategy

The seeder creates 10 threads with varying message counts (75 to 20,000), totaling around 23,000 messages. Messages are inserted in batches of 1,000 to avoid overwhelming PostgreSQL. Each message gets a sequential `messageNumber` and a timestamp spread 1-5 minutes apart to simulate realistic activity patterns. The seed is idempotent so it skips if data already exists.

### Pre-commit Hooks and Code Quality

Husky v9 runs `lint-staged` on every commit, which runs ESLint with auto-fix on frontend `.ts/.tsx` files (includes `react-hooks/recommended` rules that catch missing dependencies, stale closures, and incorrect hook usage) and runs Prettier on both frontend and backend files.

The `react-hooks/recommended` ESLint plugin is particularly valuable here. It enforces that all `useEffect`/`useCallback`/`useMemo` dependency arrays are correct, which prevents a whole class of stale-closure bugs in the scroll anchoring and SSE subscription logic.

### Design Process

I used Pencil.dev to mock the UI, pulling visual styles from the Fanvue site. The MCP integration allowed me to extract component structures directly into skeleton code, which I then implemented with Tailwind CSS and Framer Motion for animations.

### Deployment

The application runs on a Hetzner server with Docker Compose (PostgreSQL 16, Redis 7, Node 20). GitHub Actions deploys automatically on push to main. The Docker entrypoint runs migrations and seeds before starting the server, making deployment zero-touch.
