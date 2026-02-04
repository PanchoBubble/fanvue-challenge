import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus } from 'lucide-react'
import { useThreads, useCreateThread } from '@/hooks/useThreads'

interface ThreadListProps {
  selectedThreadId?: string
  onSelectThread: (id: string) => void
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function ThreadList({ selectedThreadId, onSelectThread }: ThreadListProps) {
  const [search, setSearch] = useState('')
  const { data: threads = [], isLoading } = useThreads(search || undefined)
  const createThread = useCreateThread()

  const handleNewThread = () => {
    const title = prompt('Thread title:')
    if (!title?.trim()) return
    createThread.mutate(title.trim(), {
      onSuccess: (thread) => onSelectThread(thread.id),
    })
  }

  return (
    <div className="flex w-full flex-col gap-3 bg-surface-page p-4">
      {/* Search */}
      <div className="flex h-10 items-center gap-2 rounded-lg border-b border-border-card bg-surface-page px-3">
        <Search className="h-4 w-4 text-placeholder" />
        <input
          type="text"
          placeholder="Search threads..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-placeholder"
        />
      </div>

      {/* Thread list */}
      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {isLoading &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex h-16 animate-pulse items-center gap-3 rounded-lg p-3">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="h-3.5 w-3/4 rounded bg-white/10" />
                <div className="h-2.5 w-1/3 rounded bg-white/5" />
              </div>
            </div>
          ))}
        {!isLoading && threads.length === 0 && (
          <p className="py-8 text-center text-sm text-dim">No threads yet</p>
        )}
        <AnimatePresence initial={false}>
          {threads.map((thread) => {
            const isActive = thread.id === selectedThreadId
            return (
              <motion.button
                key={thread.id}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.15 }}
                onClick={() => onSelectThread(thread.id)}
                className={`flex h-16 items-center gap-3 rounded-lg p-3 text-left transition-colors outline-surface-active ${
                  isActive
                    ? 'bg-surface-active outline outline-1 outline-surface-active'
                    : 'hover:bg-white/5'
                }`}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`truncate text-sm ${isActive ? 'font-medium' : ''}`}
                    >
                      {thread.title}
                    </span>
                    {thread.unreadCount > 0 && (
                      <span
                        className={`flex h-5 shrink-0 items-center rounded-[10px] px-1.5 text-[11px] ${
                          isActive ? 'bg-badge' : 'bg-badge-dim'
                        }`}
                      >
                        {thread.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[12px] text-dim">
                      {thread.lastMessageText ?? ''}
                    </span>
                    <span className="shrink-0 text-[11px] text-dim">
                      {formatTimeAgo(thread.lastMessageAt)}
                    </span>
                  </div>
                </div>
              </motion.button>
            )
          })}
        </AnimatePresence>
      </div>

      {/* New thread */}
      <button
        onClick={handleNewThread}
        disabled={createThread.isPending}
        className="flex h-10 items-center justify-center gap-2 rounded-lg bg-brand font-semibold text-surface-page text-sm transition-colors hover:brightness-110 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        New Thread
      </button>
    </div>
  )
}
