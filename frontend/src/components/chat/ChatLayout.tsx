import { useSearch, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/lib/auth'
import { useThreadsStream } from '@/hooks/useThreadsStream'
import { ThreadList } from './ThreadList'
import { MessagePanel } from './MessagePanel'

export function ChatLayout() {
  const { user, logout } = useAuth()
  const { threadId: selectedThreadId } = useSearch({ from: '/_authenticated/threads' })
  const navigate = useNavigate()
  const setSelectedThreadId = (id: string) =>
    navigate({ to: '/threads', search: { threadId: id } })

  // Subscribe to global thread events (e.g. new thread created)
  useThreadsStream()

  return (
    <div className="flex h-screen flex-col bg-surface-page">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border-subtle px-5 bg-surface-page">
        <img src="/logo.svg" alt="Fanvue" className="h-5" />
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">{user?.username}</span>
          <button
            onClick={logout}
            className="flex h-[34px] items-center rounded-md border border-white/[0.13] px-3.5 text-sm text-dim hover:bg-white/5 transition-colors"
          >
            Log out
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        <div className={`${selectedThreadId ? 'hidden md:flex' : 'flex'} w-full md:w-80 shrink-0`}>
          <ThreadList
            selectedThreadId={selectedThreadId}
            onSelectThread={setSelectedThreadId}
          />
        </div>
        <div className={`${selectedThreadId ? 'flex' : 'hidden md:flex'} min-w-0 flex-1`}>
          <MessagePanel
            threadId={selectedThreadId}
            onBack={() => navigate({ to: '/threads' })}
          />
        </div>
      </div>
    </div>
  )
}
