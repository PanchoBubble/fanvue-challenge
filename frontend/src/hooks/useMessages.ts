import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { useAuthStore } from '@/lib/authStore'
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

type MessagesCache = { pages: PaginatedMessages[]; pageParams: unknown[] }

export function useSendMessage(threadId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (text: string) =>
      apiFetch<{ message: Message }>(`/api/threads/${threadId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      }).then((r) => r.message),
    onMutate: async (text: string) => {
      const key = queryKeys.messages.byThread(threadId)
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<MessagesCache>(key)
      const user = useAuthStore.getState().user
      const tempId = `temp-${Date.now()}`
      const optimistic: Message = {
        id: tempId,
        threadId,
        text,
        author: user?.username ?? '',
        messageNumber: 0,
        createdAt: new Date().toISOString(),
        reactions: {},
        pending: true,
      }
      qc.setQueryData<MessagesCache>(key, (old) => {
        if (!old) return old
        const lastPage = old.pages[old.pages.length - 1]
        return {
          ...old,
          pages: [
            ...old.pages.slice(0, -1),
            { ...lastPage, items: [...lastPage.items, optimistic] },
          ],
        }
      })
      return { previous, tempId }
    },
    onSuccess: (realMessage, _text, context) => {
      const key = queryKeys.messages.byThread(threadId)
      qc.setQueryData<MessagesCache>(key, (old) => {
        if (!old) return old
        const hasReal = old.pages.some((p) =>
          p.items.some((m) => m.id === realMessage.id),
        )
        return {
          ...old,
          pages: old.pages.map((page, i) => ({
            ...page,
            items: page.items
              .filter((m) => m.id !== context?.tempId)
              .concat(
                !hasReal && i === old.pages.length - 1
                  ? [{ ...realMessage, reactions: realMessage.reactions || {} }]
                  : [],
              ),
          })),
        }
      })
      qc.invalidateQueries({ queryKey: queryKeys.threads.all })
    },
    onError: (_err, _text, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.messages.byThread(threadId), context.previous)
      }
    },
  })
}
