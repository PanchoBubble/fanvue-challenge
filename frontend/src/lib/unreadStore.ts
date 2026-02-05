import { create } from 'zustand'

interface UnreadState {
  counts: Record<string, number>
  increment: (threadId: string) => void
  reset: (threadId: string) => void
}

export const useUnreadStore = create<UnreadState>((set) => ({
  counts: {},

  increment: (threadId) =>
    set((state) => ({
      counts: {
        ...state.counts,
        [threadId]: (state.counts[threadId] || 0) + 1,
      },
    })),

  reset: (threadId) =>
    set((state) => ({
      counts: {
        ...state.counts,
        [threadId]: 0,
      },
    })),
}))
