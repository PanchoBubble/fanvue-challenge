# Frontend Architecture & Implementation Plan

## Implementation Steps

### Step 1 — Scaffold Project

```bash
npm create vite@latest frontend -- --template react-ts
```

**Dependencies:**

Core:
- `@tanstack/react-router`
- `@tanstack/react-query`
- `framer-motion`

Dev/tooling:
- `@tanstack/router-plugin`
- `@tanstack/router-devtools`
- `@tanstack/react-query-devtools`
- `tailwindcss`
- `@tailwindcss/vite`
- `eslint`
- `@eslint/js`
- `typescript-eslint`
- `eslint-plugin-react-hooks`
- `eslint-config-prettier`
- `prettier`
- `prettier-plugin-tailwindcss`

### Step 2 — Config Files

| File | Key Content |
|---|---|
| `vite.config.ts` | TanStack Router plugin, Tailwind plugin, `/api` proxy to `:3001` |
| `tsconfig.json` | Strict, `@/` path alias |
| `tsconfig.app.json` | App-specific TS config |
| `eslint.config.js` | ESLint 9 flat config with TS, React hooks, Prettier compat |
| `.prettierrc` | `semi: false`, `singleQuote: true`, tailwind plugin |
| `src/app.css` | `@import "tailwindcss";` |

### Step 3 — Types (`src/types/api.ts`)

```ts
export interface User { id: string; username: string }

export interface Thread {
  id: string; title: string; lastMessageAt: string;
  unreadCount: number; messageCount: number;
  createdAt: string; updatedAt: string;
}

export interface Message {
  id: string; threadId: string; text: string;
  author: string; createdAt: string;
}

export interface AuthResponse { user: User; token: string }

export interface PaginatedMessages { items: Message[]; nextCursor: string | null }
```

### Step 4 — Auth Lib (`src/lib/auth.tsx`)

- React context + provider
- `localStorage` persistence for token + user
- Exposes: `useAuth()` → `{ token, user, login(), register(), logout(), isAuthenticated }`
- `login()` / `register()` call API, store result
- `logout()` clears storage, navigates to `/auth`

### Step 5 — API Client (`src/lib/api.ts`)

- `apiFetch<T>(path, options)` wrapper
- Auto-attaches `Authorization: Bearer` header from auth store
- On 401 response → clear auth, redirect to `/auth`
- JSON parsing + error handling

### Step 6 — Query Client (`src/lib/queryClient.ts`)

- `staleTime: 30_000`
- `retry: 1`
- Global error handler for 401s

### Step 7 — Query Keys (`src/lib/queryKeys.ts`)

`threads.all`, `threads.list(search?)`, `messages.byThread(threadId)`

### Step 8 — Root Route (`src/routes/__root.tsx`)

- `QueryClientProvider`
- `AuthProvider`
- `<Outlet />`
- Devtools (Router + Query) in dev mode

### Step 9 — Auth Route (`src/routes/auth.tsx`)

- `beforeLoad`: if authenticated → redirect to `/threads`
- Renders `AuthPage` component with Login/Register tabs
- Tab state managed locally, animated with Framer Motion

### Step 10 — Auth Components (`src/components/auth/`)

- `AuthPage.tsx` — tab switcher (Login | Register)
- `LoginForm.tsx` — username + password + submit
- `RegisterForm.tsx` — username + password + submit
- Both call auth context methods, handle errors inline

### Step 11 — Authenticated Layout (`src/routes/_authenticated.tsx`)

- `beforeLoad`: check `localStorage` for token, if missing → `redirect({ to: '/auth' })`
- Renders `<Outlet />`

### Step 12 — Threads Layout + Hooks (`src/routes/_authenticated/threads.tsx`)

- Search params validation: `{ search?: string }`
- 3-panel layout: Header + LeftPanel + RightPanel (`<Outlet />`)
- `useThreads(search)` hook — `useQuery` calling `GET /api/threads?search=`

### Step 13 — Thread List Components

- `ThreadList.tsx` — maps threads, highlights active (from URL param)
- `ThreadItem.tsx` — title, message count, last message time, active state
- `ThreadSearch.tsx` — input that updates `?search=` URL param via `useNavigate`
- `ThreadCreateForm.tsx` — inline: title input + button, calls `POST /api/threads`

### Step 14 — Index Route (`src/routes/_authenticated/index.tsx`)

Redirects to `/threads`.

### Step 15 — Thread Messages Route (`src/routes/_authenticated/threads/$threadId.tsx`)

- `useMessages(threadId)` — `useInfiniteQuery` with cursor pagination, passes `AbortSignal` to cancel in-flight requests on thread switch
- `useSendMessage(threadId)` — mutation, optimistic update
- `useThreadSSE(threadId)` — `EventSource` to `/api/threads/:id/stream?token=<jwt>`, appends new messages to query cache
- Renders: thread header, `MessageList`, `MessageInput`

### Step 16 — Message Components

- `MessageList.tsx` — scrollable container, infinite scroll trigger (intersection observer), auto-scroll to bottom on new messages
- `MessageItem.tsx` — message bubble with author, text, timestamp; different alignment for current user vs others
- `MessageInput.tsx` — text input + send button, Enter to send
- `MessageSkeleton.tsx` — loading placeholder

### Step 17 — Framer Motion Animations

- `<AnimatePresence>` on route transitions
- Thread list: layout animation for reordering
- New messages: slide-up + fade-in
- Auth tabs: horizontal slide
- Thread selection: background color transition

### Step 18 — Docker Setup

- `frontend/Dockerfile` (multi-stage: build with node, serve with nginx)
- Add frontend service to `docker-compose.yml`
- `.dockerignore`

### Step 19 — Polish

- Empty states ("Select a thread", "No threads found", "No messages yet")
- Loading skeletons
- Error boundaries
- Responsive considerations (basic)

---

## File Tree

```
frontend/
├── Dockerfile
├── .dockerignore
├── .prettierrc
├── eslint.config.js
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
└── src/
    ├── main.tsx
    ├── app.css
    ├── routeTree.gen.ts          # auto-generated
    ├── types/
    │   └── api.ts
    ├── lib/
    │   ├── api.ts
    │   ├── auth.tsx
    │   ├── queryClient.ts
    │   └── queryKeys.ts
    ├── hooks/
    │   ├── useThreads.ts
    │   ├── useCreateThread.ts
    │   ├── useMessages.ts
    │   ├── useSendMessage.ts
    │   ├── useThreadSSE.ts
    │   ├── useLogin.ts
    │   └── useRegister.ts
    ├── routes/
    │   ├── __root.tsx
    │   ├── _authenticated.tsx
    │   ├── _authenticated/
    │   │   ├── index.tsx
    │   │   ├── threads.tsx
    │   │   └── threads/
    │   │       └── $threadId.tsx
    │   └── auth.tsx
    └── components/
        ├── layout/
        │   ├── AppLayout.tsx
        │   ├── Header.tsx
        │   ├── LeftPanel.tsx
        │   └── RightPanel.tsx
        ├── threads/
        │   ├── ThreadList.tsx
        │   ├── ThreadItem.tsx
        │   ├── ThreadSearch.tsx
        │   ├── ThreadCreateForm.tsx
        │   └── ThreadEmptyState.tsx
        ├── messages/
        │   ├── MessageList.tsx
        │   ├── MessageItem.tsx
        │   ├── MessageInput.tsx
        │   └── MessageSkeleton.tsx
        ├── auth/
        │   ├── AuthPage.tsx
        │   ├── LoginForm.tsx
        │   └── RegisterForm.tsx
        └── ui/
            ├── Button.tsx
            ├── Input.tsx
            └── Spinner.tsx
```

