import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { useAuthStore } from '@/lib/authStore'
import { API_BASE } from '@/lib/api'
import type { Message, PaginatedMessages } from '@/types/api'

export function useThreadStream(threadId?: string) {
  const qc = useQueryClient()
  const token = useAuthStore((s) => s.token)

  useEffect(() => {
    if (!threadId || !token) return

    const url = `${API_BASE}/api/threads/${threadId}/messages/stream?token=${encodeURIComponent(token)}`
    const es = new EventSource(url)

    es.addEventListener('message', (e) => {
      const msg: Message = JSON.parse(e.data)
      const key = queryKeys.messages.byThread(threadId)

      qc.setQueryData<{ pages: PaginatedMessages[]; pageParams: unknown[] }>(
        key,
        (old) => {
          if (!old) return old
          const lastPage = old.pages[old.pages.length - 1]
          // Avoid duplicates
          if (lastPage.items.some((m) => m.id === msg.id)) return old
          return {
            ...old,
            pages: [
              ...old.pages.slice(0, -1),
              { ...lastPage, items: [...lastPage.items, msg] },
            ],
          }
        },
      )
    })

    return () => es.close()
  }, [threadId, qc, token])
}
