import { createFileRoute } from '@tanstack/react-router'
import { ChatLayout } from '@/components/chat/ChatLayout'

type ChatSearch = {
  threadId?: string
}

export const Route = createFileRoute('/_authenticated/threads')({
  validateSearch: (search: Record<string, unknown>): ChatSearch => ({
    threadId: typeof search.threadId === 'string' ? search.threadId : undefined,
  }),
  component: ChatLayout,
})
