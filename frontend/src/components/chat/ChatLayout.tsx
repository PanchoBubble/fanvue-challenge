import { useCallback, useEffect, useRef } from 'react'
import { useSearch, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/authStore'
import { useThreadsStream } from '@/hooks/useThreadsStream'
import type { Thread } from '@/types/api'
import { ThreadList } from './ThreadList'
import { MessagePanel } from './MessagePanel'

export function ChatLayout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { threadId: selectedThreadId } = useSearch({
    from: '/_authenticated/threads',
  })
  const navigate = useNavigate()
  const qc = useQueryClient()
  const selectedRef = useRef(selectedThreadId)
  useEffect(() => {
    selectedRef.current = selectedThreadId
  }, [selectedThreadId])

  const setSelectedThreadId = useCallback(
    (id: string) =>
      navigate({ to: '/threads', search: id ? { threadId: id } : {} }),
    [navigate],
  )

  // Subscribe to global thread events (e.g. new thread created)
  useThreadsStream()

  // Navigate away if the currently selected thread disappears from cache (SSE delete from another tab)
  useEffect(() => {
    const unsub = qc.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated' || !selectedRef.current) return
      const query = event.query
      if (!query.queryKey[0] || query.queryKey[0] !== 'threads') return
      const data = query.state.data as Thread[] | undefined
      if (data && !data.some((t) => t.id === selectedRef.current)) {
        setSelectedThreadId('')
      }
    })
    return unsub
  }, [qc, setSelectedThreadId])

  return (
    <div className="bg-surface-page flex h-screen flex-col">
      {/* Header */}
      <header className="border-border-subtle bg-surface-page flex h-14 shrink-0 items-center justify-between border-b px-5">
        <img src="/logo.svg" alt="Fanvue" className="h-5" />
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">{user?.username}</span>
          <button
            onClick={() => {
              logout()
              navigate({ to: '/auth' })
            }}
            className="text-dim flex h-[34px] cursor-pointer items-center rounded-md border border-white/[0.13] px-3.5 text-sm transition-colors hover:bg-white/5"
          >
            Log out
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        <div
          className={`${selectedThreadId ? 'hidden md:flex' : 'flex'} w-full shrink-0 md:w-80`}
        >
          <ThreadList
            selectedThreadId={selectedThreadId}
            onSelectThread={setSelectedThreadId}
          />
        </div>
        <div
          className={`${selectedThreadId ? 'flex' : 'hidden md:flex'} min-w-0 flex-1`}
        >
          <MessagePanel
            threadId={selectedThreadId}
            onBack={() => navigate({ to: '/threads' })}
          />
        </div>
      </div>
    </div>
  )
}
