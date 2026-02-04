import { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Check, X } from 'lucide-react'
import {
  useThreads,
  useCreateThread,
  useUpdateThread,
  useDeleteThread,
} from '@/hooks/useThreads'
import { useAuthStore } from '@/lib/authStore'
import { ThreadMenu } from './ThreadMenu'
import { ConfirmModal } from './ConfirmModal'

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

export function ThreadList({
  selectedThreadId,
  onSelectThread,
}: ThreadListProps) {
  const [search, setSearch] = useState('')
  const currentUsername = useAuthStore((s) => s.user?.username)
  const { data: allThreads = [], isLoading } = useThreads()
  const threads = search
    ? allThreads.filter((t) =>
        t.title.toLowerCase().includes(search.toLowerCase()),
      )
    : allThreads
  const createThread = useCreateThread()
  const updateThread = useUpdateThread()
  const deleteThread = useDeleteThread()
  const [isCreating, setIsCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    title: string
  } | null>(null)

  // Track flashing dots for threads that just received a new message
  const [flashingIds, setFlashingIds] = useState<Set<string>>(new Set())
  const [prevTimestamps, setPrevTimestamps] = useState<Record<string, string>>(
    {},
  )

  // Detect new messages (adjust-state-during-render pattern — no effect, no ref reads)
  let timestampsChanged = false
  for (const t of threads) {
    if (prevTimestamps[t.id] !== t.lastMessageAt) {
      timestampsChanged = true
      break
    }
  }
  if (
    !timestampsChanged &&
    Object.keys(prevTimestamps).length !== threads.length
  ) {
    timestampsChanged = true
  }

  if (timestampsChanged) {
    const newlyFlashing: string[] = []
    for (const t of threads) {
      const prev = prevTimestamps[t.id]
      // Only flash if message is from someone else
      const isFromOther = t.lastMessageUser !== currentUsername
      if (
        prev &&
        prev !== t.lastMessageAt &&
        !flashingIds.has(t.id) &&
        isFromOther
      ) {
        newlyFlashing.push(t.id)
      }
    }
    const next: Record<string, string> = {}
    for (const t of threads) next[t.id] = t.lastMessageAt
    setPrevTimestamps(next)
    if (newlyFlashing.length > 0) {
      setFlashingIds(new Set([...flashingIds, ...newlyFlashing]))
    }
  }

  // Auto-clear flashing dots after 2s
  useEffect(() => {
    if (flashingIds.size === 0) return
    const timer = setTimeout(() => setFlashingIds(new Set()), 2000)
    return () => clearTimeout(timer)
  }, [flashingIds])

  useEffect(() => {
    if (editingId) {
      editInputRef.current?.focus()
      editInputRef.current?.select()
    }
  }, [editingId])

  const handleStartCreate = () => {
    setIsCreating(true)
    setNewTitle('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleConfirm = () => {
    if (!newTitle.trim()) return
    createThread.mutate(newTitle.trim(), {
      onSuccess: (thread) => {
        setIsCreating(false)
        setNewTitle('')
        onSelectThread(thread.id)
      },
    })
  }

  const handleCancel = () => {
    setIsCreating(false)
    setNewTitle('')
  }

  const handleEditSave = (id: string) => {
    const trimmed = editTitle.trim()
    if (trimmed.length >= 2) {
      updateThread.mutate({ id, title: trimmed })
    }
    setEditingId(null)
    setEditTitle('')
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditTitle('')
  }

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return
    deleteThread.mutate(deleteTarget.id, {
      onSuccess: () => {
        if (selectedThreadId === deleteTarget.id) {
          onSelectThread('')
        }
        setDeleteTarget(null)
      },
    })
  }

  return (
    <div className="bg-surface-page flex w-full flex-col gap-3 px-4 py-3">
      {/* Search */}
      <div className="border-border-subtle bg-surface-page focus-within:border-brand flex h-10 items-center gap-2 border-b px-3">
        <Search className="text-placeholder h-4 w-4" />
        <input
          type="text"
          placeholder="Search threads..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="placeholder:text-placeholder flex-1 bg-transparent text-[13px] text-white outline-none"
        />
      </div>

      {/* Thread list */}
      <div className="scrollbar-thin flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {isLoading &&
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex h-16 animate-pulse items-center gap-3 rounded-lg p-3"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="h-3.5 w-3/4 rounded bg-white/10" />
                <div className="h-2.5 w-1/3 rounded bg-white/5" />
              </div>
            </div>
          ))}
        {!isLoading && threads.length === 0 && (
          <p className="text-dim py-8 text-center text-sm">No threads yet</p>
        )}
        <AnimatePresence initial={false}>
          {threads.map((thread) => {
            const isActive = thread.id === selectedThreadId
            const isEditing = editingId === thread.id
            const isFlashing = flashingIds.has(thread.id)
            return (
              <motion.button
                key={thread.id}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.15 }}
                onClick={() => !isEditing && onSelectThread(thread.id)}
                className={`group outline-surface-active relative flex h-16 cursor-pointer items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                  isActive
                    ? 'bg-surface-active outline-surface-active outline outline-1'
                    : 'hover:bg-white/5'
                }`}
              >
                {isFlashing && (
                  <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                    <span className="animate-ping-brand bg-brand absolute inline-flex h-full w-full rounded-full opacity-75" />
                    <span className="bg-brand relative inline-flex h-2.5 w-2.5 rounded-full" />
                  </span>
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    {isEditing ? (
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          e.stopPropagation()
                          if (e.key === 'Enter') handleEditSave(thread.id)
                          if (e.key === 'Escape') handleEditCancel()
                        }}
                        onBlur={() => handleEditSave(thread.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="border-brand min-w-0 flex-1 rounded border bg-transparent px-1.5 py-0.5 text-sm text-white outline-none"
                      />
                    ) : (
                      <span
                        className={`truncate text-sm ${isActive ? 'font-medium' : ''}`}
                      >
                        {thread.title}
                      </span>
                    )}
                    <div className="flex shrink-0 items-center gap-1">
                      {thread.unreadCount > 0 && !isEditing && (
                        <span
                          className={`flex h-5 items-center rounded-[10px] px-1.5 text-[11px] ${
                            isActive ? 'bg-badge' : 'bg-badge-dim'
                          }`}
                        >
                          {thread.unreadCount}
                        </span>
                      )}
                      {!isEditing && (
                        <ThreadMenu
                          onEdit={() => {
                            setEditingId(thread.id)
                            setEditTitle(thread.title)
                          }}
                          onDelete={() =>
                            setDeleteTarget({
                              id: thread.id,
                              title: thread.title,
                            })
                          }
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-dim truncate text-[12px]">
                      {thread.lastMessageText ?? ''}
                    </span>
                    <span className="text-dim shrink-0 text-[11px]">
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
      {isCreating ? (
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Thread title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirm()
              if (e.key === 'Escape') handleCancel()
            }}
            className="border-border-card bg-surface-page placeholder:text-placeholder focus:ring-brand h-10 rounded-lg border px-3 text-sm text-white focus:ring-2 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={createThread.isPending || !newTitle.trim()}
              className="bg-brand text-surface-page flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors hover:brightness-110 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              Confirm
            </button>
            <button
              onClick={handleCancel}
              disabled={createThread.isPending}
              className="border-border-card text-dim flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border text-sm font-semibold transition-colors hover:bg-white/5 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleStartCreate}
          className="border-surface-active flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border text-sm font-semibold text-white transition-colors hover:bg-white/5"
        >
          <Plus className="h-4 w-4" />
          New Thread
        </button>
      )}

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete thread"
        description={`Are you sure you want to delete "${deleteTarget?.title ?? ''}"? This will permanently remove the thread and all its messages.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteThread.isPending}
      />
    </div>
  )
}
