import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import type { Thread } from '@/types/api'

/**
 * Global SSE stream for thread-level events (e.g. new thread created).
 * Updates the thread list cache in real-time.
 */
export function useThreadsStream() {
  const qc = useQueryClient()

  useEffect(() => {
    const token = localStorage.getItem('fanvue_token')
    if (!token) return

    const url = `/api/threads/stream?token=${encodeURIComponent(token)}`
    const es = new EventSource(url)

    es.addEventListener('thread_created', (e) => {
      const thread: Thread = JSON.parse(e.data)

      // Update all thread list queries by prepending the new thread
      qc.setQueriesData<Thread[]>(
        { queryKey: queryKeys.threads.all },
        (old) => {
          if (!old) return [thread]
          if (old.some((t) => t.id === thread.id)) return old
          return [thread, ...old]
        },
      )
    })

    es.addEventListener('thread_updated', (e) => {
      const thread: Thread = JSON.parse(e.data)

      // Update the thread and re-sort by lastMessageAt descending
      qc.setQueriesData<Thread[]>(
        { queryKey: queryKeys.threads.all },
        (old) => {
          if (!old) return old
          return old
            .map((t) => (t.id === thread.id ? thread : t))
            .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
        },
      )
    })

    return () => es.close()
  }, [qc])
}
