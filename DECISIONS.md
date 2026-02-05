# Technical Decisions

## Table of Contents

**Part 1: Challenge Requirements**
- [Handling Large Numbers of Messages](#handling-large-numbers-of-messages)
- [Scroll Anchoring and New Messages](#scroll-anchoring-and-new-messages)
- [Race Conditions and Cancellation](#race-conditions-and-cancellation)
- [State Management and Lifecycle Hooks](#state-management-and-lifecycle-hooks)

**Part 2: Implementation Approach**
- [Stack Choices](#stack-choices)
- [Authentication](#authentication)
- [Thread Search](#thread-search)
- [Memoization and Re-renders](#memoization-and-re-renders)
- [Real-Time Architecture](#real-time-architecture)
- [Seed Data Strategy](#seed-data-strategy)
- [Pre-commit Hooks and Code Quality](#pre-commit-hooks-and-code-quality)
- [Design Process](#design-process)
- [Deployment](#deployment)

---

## Part 1: Challenge Requirements

### Handling Large Numbers of Messages

The thread "Project Alpha - Sprint Planning" contains 20,000 messages, which would be unusable if rendered as a flat DOM list. I addressed this at two levels.

#### Virtualized Rendering

Using TanStack Virtual, only the visible messages plus an overscan buffer of 10 items are mounted in the DOM.

- Each row is absolutely positioned via `transform: translateY()`
- Container height equals the virtualizer's computed total size
- `measureElement` ref callbacks handle dynamic row heights (messages vary in length)
- Stable keys (`message.id`) avoid unnecessary reconciliation

#### Cursor-Based Pagination

Messages are fetched in pages of 50 (configurable up to 100).

- The API uses a `createdAt` based cursor encoded as base64url
- Backed by a database index on `(threadId, createdAt)`
- Avoids the performance cliff of `OFFSET` based pagination on large datasets
- TanStack Query's `useInfiniteQuery` manages the page cache
- Fetches older pages via `getPreviousPageParam` when `scrollTop < 800px` (higher threshold for smoother UX)

> The combination means the browser never holds more than a few hundred DOM nodes regardless of thread size, and the database query remains O(log n) per page fetch.

---

### Scroll Anchoring and New Messages

Scroll anchoring is the trickiest part of a chat UI. I use `useLayoutEffect` (not `useEffect`) to measure and adjust the scroll container **before the browser paints**, which eliminates visible jitter.

#### Scenario 1: Initial Load or Thread Switch

Scroll instantly to the last message:
```typescript
virtualizer.scrollToIndex(messages.length - 1, { align: 'end' })
```

#### Scenario 2: Older Messages Prepended (Infinite Scroll)

When the user scrolls up and a new page loads, messages are prepended to the array.

I use a **bottom distance preservation** approach:

1. During scroll events, continuously track distance from bottom: `bottomDistance = virtualizer.getTotalSize() - scrollTop`
2. In `useLayoutEffect` after prepend, restore position: `newOffset = newTotalSize - bottomDistance`

```typescript
// In scroll handler (captures state BEFORE messages change)
bottomDistance.current = virtualizer.getTotalSize() - el.scrollTop

// In useLayoutEffect (runs AFTER messages change)
if (prependedCount > 0) {
  const newOffset = virtualizer.getTotalSize() - bottomDistance.current
  virtualizer.scrollToOffset(newOffset, { align: 'start' })
}
```

**Why this approach?** Earlier attempts using `scrollHeight` differences or `estimateSize * prependedCount` caused jumps because:
- With `@tanstack/react-virtual`, `scrollHeight` is unreliable due to dynamic `measureElement`
- The virtualizer's internal scroll state can conflict with direct `scrollTop` manipulation
- `virtualizer.scrollOffset` at effect time has already been affected by DOM changes

The bottom distance method works because it captures scroll state during scroll events (before React updates), then uses the virtualizer's own `scrollToOffset` API to restore relative position after the total size changes.

References: [TanStack/virtual Discussion #195](https://github.com/TanStack/virtual/discussions/195), [Mattermost's dynamic-virtualized-list](https://github.com/mattermost/dynamic-virtualized-list)

Using `useLayoutEffect` is critical here because it runs synchronously before paint, so there's no visible jump.

#### Scenario 3: New Message Arrives via SSE

| Condition | Behavior |
|-----------|----------|
| Current user sent it (`pendingSend` ref is set) | Scroll to bottom instantly |
| Another participant sent it | Scroll to bottom with `behavior: 'smooth'` |
| User has scrolled up | Append silently, don't disrupt scroll position |

The thread list also shows a flashing dot indicator on threads that received new messages, using a compare-during-render pattern that checks timestamp changes between renders.

---

### Race Conditions and Cancellation

#### Thread Switching

When the user rapidly switches between threads, in-flight message fetches for the previous thread could return stale data. TanStack Query handles this with automatic request cancellation.

When the query key changes from `['messages', threadA]` to `['messages', threadB]`, TanStack Query provides an `AbortSignal` to the `queryFn`. We pass this signal to `fetch`, which cancels the in-flight request immediately. This prevents wasted network resources and ensures only the current thread's data is fetched.

```typescript
queryFn: ({ pageParam, signal }) => {
  return apiFetch(`/api/threads/${threadId}/messages`, { signal })
}
```

Without the signal, TanStack Query would still handle staleness correctly by updating the previous thread's cache entry rather than the current one. But passing the signal is better because it actually cancels the HTTP request rather than letting it complete and discarding the result.

#### SSE Lifecycle

Each `useThreadStream` hook opens an `EventSource` for the selected thread and returns a cleanup function:

```typescript
return () => es.close()
```

This fires when the thread ID changes or the component unmounts, preventing messages from thread A leaking into thread B's view.

#### SSE vs Mutation Race

When a user sends a message, the `POST` response and the SSE event for that same message can arrive in any order.

- The SSE handler deduplicates by checking `items.some(m => m.id === msg.id)` before appending
- `useSendMessage` intentionally does **not** invalidate the messages query on success
- If it did, the refetch would race with the SSE cache update, causing scroll jumps or duplicate flashes

#### Subscription Cleanup

All `useEffect` hooks that create subscriptions return cleanup functions. Scroll listeners use `{ passive: true }` for performance since they don't call `preventDefault`.

---

### State Management and Lifecycle Hooks

I split state into two categories based on its nature.

#### Server State: TanStack Query

Threads and messages are server-owned data that needs caching, background refetching, pagination, and deduplication. TanStack Query manages all of this declaratively.

- Query keys centralized in a `queryKeys` factory for consistent invalidation
- Query client configured with `staleTime: 30_000` and `retry: 1`

#### Client State: Zustand

Authentication (token, user, login/logout actions) is app-wide client state that persists across page reloads.

- `persist` middleware stores the token in localStorage
- `onRehydrateStorage` recomputes `isAuthenticated` on page load
- Chosen over React Context because it doesn't cause re-renders in unrelated components
- Chosen over Redux because the auth slice is simple enough that Redux's boilerplate isn't justified

#### Key Lifecycle Patterns

| Pattern | Usage |
|---------|-------|
| `useLayoutEffect` | Scroll anchoring (synchronous DOM measurement before paint) |
| `useCallback` | Stable function references passed as props |
| `useRef` | Values that persist across renders without triggering re-renders |
| Effect cleanup | All subscriptions and timers (SSE, scroll listeners, timeouts) |

---

## Part 2: Implementation Approach

### Stack Choices

| Choice | Reasoning |
|--------|-----------|
| **Vite over Next.js** | Real-time chat app, not a content site. Vite has faster dev server and HMR. SPA model is simpler for SSE-heavy apps where every page requires auth anyway. Easy to deploy as static files. |
| **PostgreSQL over MongoDB** | Docker image is ~80MB (alpine) vs 700MB+. Better relational queries and indexing. The `(threadId, createdAt)` index makes cursor pagination efficient. |
| **Persistent stack over in-memory** | Proper indexing for 20k+ messages, Redis pub/sub enables horizontal scaling, demonstrates production-readiness. |
| **SSE over WebSockets** | Unidirectional (server to client) is all we need. Works over standard HTTP, auto-reconnects via EventSource API, no protocol upgrade needed. |
| **Migrations over synchronize** | Production-ready feel. For simpler apps I'd use MongoDB with auto-sync, but this task focuses on performance. |

---

### Authentication

The spec didn't require authentication, but I added it for two reasons.

1. It gives the app more of a production feel
2. It allows users to create an account with a username that gets displayed in the chat

This makes it an actual online chat where you can see who sent each message, not just a mock UI.

---

### Thread Search

The spec said client-side filtering is fine, and that's what I went with. We fetch all threads on load and filter in the frontend.

I did implement a server-side solution with ILIKE at first, but removed it since it's not efficient for this test in particular. We only have a handful of threads, so there's no need for server-side filtering or pagination.

> If we were thinking about having over 500 threads, I would do it server-side and add pagination to the thread list.

---

### Memoization and Re-renders

I only used `useMemo` in a couple places throughout the repo. The core optimization to prevent unnecessary re-renders isn't something we really need to do manually because the TanStack tools already handle it for us.

- The virtualizer only renders visible items, so even if the parent re-renders, only visible message components are in the DOM
- TanStack Query handles caching and deduplication, so we're not re-fetching or re-rendering on every state change

#### Derived State over Effect-Driven State

For computed values like unread counts, I use `useMemo` to derive state rather than tracking it with `useState` + `useEffect`. This avoids calling `setState` synchronously inside effect bodies, which can cause extra render cycles.

The pattern: instead of tracking "unread count" as state that gets incremented by effects, track "last read timestamp" and derive unread status by comparing against the thread's `lastMessageAt`. The `lastReadAt` state only updates on user interaction (selecting a thread), not in an effect.

---

### Real-Time Architecture

The backend uses Redis pub/sub as a message broker between API instances and SSE connections.

```
POST /message → Save to PostgreSQL → Publish to Redis → SSE to clients
```

- Thread messages go to `thread:<threadId>` channel
- Thread-level events (created, updated, deleted) go to `threads:global` channel
- Heartbeats every 30 seconds keep connections alive through proxies

> This architecture means adding a second API server just works. Both instances subscribe to the same Redis channels.

---

### Seed Data Strategy

The seeder creates 10 threads with varying message counts (75 to 20,000), totaling around 23,000 messages.

- Messages inserted in batches of 1,000 to avoid overwhelming PostgreSQL
- Sequential `messageNumber` per message
- Timestamps spread 1-5 minutes apart for realistic activity patterns
- Idempotent: skips if data already exists

---

### Pre-commit Hooks and Code Quality

Husky v9 runs `lint-staged` on every commit:

- ESLint with auto-fix on frontend `.ts/.tsx` files
- Includes `react-hooks/recommended` rules (catches missing dependencies, stale closures, incorrect hook usage)
- Prettier on both frontend and backend files

> The `react-hooks/recommended` plugin is particularly valuable here. It enforces correct dependency arrays in all hooks, which prevents stale-closure bugs in the scroll anchoring and SSE subscription logic.

---

### Design Process

I used Pencil.dev to mock the UI, pulling visual styles from the Fanvue site. The MCP integration allowed me to extract component structures directly into skeleton code, which I then implemented with Tailwind CSS and Framer Motion for animations.

---

### Deployment

The backend runs on a Hetzner server with Docker Compose:

- PostgreSQL 16
- Redis 7
- Node 20 (API)

The frontend is deployed to Cloudflare as static files.

GitHub Actions deploys automatically on push to main. The Docker entrypoint runs migrations and seeds before starting the server, making deployment zero-touch.
