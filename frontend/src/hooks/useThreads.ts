import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import type { Thread } from '@/types/api'

export function useThreads(search?: string) {
  return useQuery({
    queryKey: queryKeys.threads.list(search),
    queryFn: () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : ''
      return apiFetch<{ threads: Thread[] }>(`/api/threads${params}`).then(
        (r) => r.threads,
      )
    },
  })
}

export function useUpdateThread() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      apiFetch<{ thread: Thread }>(`/api/threads/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title }),
      }).then((r) => r.thread),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.threads.all })
    },
  })
}

export function useDeleteThread() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/threads/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.threads.all })
    },
  })
}

export function useCreateThread() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (title: string) =>
      apiFetch<{ thread: Thread }>('/api/threads', {
        method: 'POST',
        body: JSON.stringify({ title }),
      }).then((r) => r.thread),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.threads.all })
    },
  })
}
