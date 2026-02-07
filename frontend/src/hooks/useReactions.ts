import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { useAuthStore } from '@/lib/authStore'
import type { PaginatedMessages, ReactionSummary } from '@/types/api'

interface ToggleReactionVars {
  messageId: string
  threadId: string
  type: string
}

interface ToggleReactionResponse {
  action: 'added' | 'removed' | 'changed'
  reactions: Record<string, ReactionSummary>
}

export function useToggleReaction() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)

  return useMutation({
    mutationFn: ({ messageId, type }: ToggleReactionVars) =>
      apiFetch<ToggleReactionResponse>(`/api/messages/${messageId}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ type }),
      }),

    // Optimistic update
    onMutate: async ({ messageId, threadId, type }) => {
      const key = queryKeys.messages.byThread(threadId)
      await qc.cancelQueries({ queryKey: key })

      const previous = qc.getQueryData<{
        pages: PaginatedMessages[]
        pageParams: unknown[]
      }>(key)

      qc.setQueryData<{ pages: PaginatedMessages[]; pageParams: unknown[] }>(
        key,
        (old) => {
          if (!old || !userId) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((msg) => {
                if (msg.id !== messageId) return msg

                const reactions = { ...msg.reactions }

                // Find if user already reacted
                const existingType = Object.entries(reactions).find(([, v]) =>
                  v.userIds.includes(userId),
                )?.[0]

                if (existingType) {
                  // Remove from old type
                  const old = reactions[existingType]
                  const filtered = old.userIds.filter((id) => id !== userId)
                  if (filtered.length === 0) {
                    delete reactions[existingType]
                  } else {
                    reactions[existingType] = {
                      count: filtered.length,
                      userIds: filtered,
                    }
                  }
                }

                // If toggling same type, we just removed it. Otherwise add new type.
                if (existingType !== type) {
                  const existing = reactions[type] || { count: 0, userIds: [] }
                  reactions[type] = {
                    count: existing.count + 1,
                    userIds: [...existing.userIds, userId],
                  }
                }

                return { ...msg, reactions }
              }),
            })),
          }
        },
      )

      return { previous }
    },

    onError: (_err, { threadId }, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.messages.byThread(threadId), context.previous)
      }
    },
  })
}
