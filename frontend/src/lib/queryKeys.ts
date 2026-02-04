export const queryKeys = {
  threads: {
    all: ['threads'] as const,
    list: () => ['threads', 'list'] as const,
  },
  messages: {
    byThread: (threadId: string) => ['messages', threadId] as const,
  },
}
