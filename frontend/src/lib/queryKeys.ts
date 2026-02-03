export const queryKeys = {
  threads: {
    all: ['threads'] as const,
    list: (search?: string) => ['threads', 'list', search] as const,
  },
  messages: {
    byThread: (threadId: string) => ['messages', threadId] as const,
  },
}
