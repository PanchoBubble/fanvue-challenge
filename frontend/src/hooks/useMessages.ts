import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import type { Message, PaginatedMessages } from '@/types/api'

export function useMessages(threadId?: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.messages.byThread(threadId!),
    queryFn: ({ pageParam, signal }) => {
      const params = pageParam ? `?cursor=${pageParam}` : ''
      return apiFetch<PaginatedMessages>(
        `/api/threads/${threadId}/messages${params}`,
        { signal },
      )
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: () => undefined,
    getPreviousPageParam: (firstPage) => firstPage.nextCursor ?? undefined,
    enabled: !!threadId,
    select: (data) => data.pages.flatMap((p) => p.items),
  })
}

export function useSendMessage(threadId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (text: string) =>
      apiFetch<{ message: Message }>(`/api/threads/${threadId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      }).then((r) => r.message),
    onSuccess: () => {
      // SSE already adds the message to the cache in real-time.
      // Invalidating messages here causes a full refetch that races with SSE,
      // interrupting scroll-to-bottom when the user is scrolled up.
      qc.invalidateQueries({ queryKey: queryKeys.threads.all })
    },
  })
}
