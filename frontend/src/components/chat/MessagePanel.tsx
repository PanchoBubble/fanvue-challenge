import { useEffect, useRef, useCallback } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useMessages } from '@/hooks/useMessages'
import { useThreads } from '@/hooks/useThreads'
import { useThreadStream } from '@/hooks/useThreadStream'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'

interface MessagePanelProps {
  threadId?: string
  onBack?: () => void
}

export function MessagePanel({ threadId, onBack }: MessagePanelProps) {
  const { user } = useAuth()
  const {
    data: messages = [],
    isLoading,
    hasPreviousPage,
    isFetchingPreviousPage,
    fetchPreviousPage,
  } = useMessages(threadId)
  const { data: threads = [] } = useThreads()
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevMessageCount = useRef(0)
  useThreadStream(threadId)

  const thread = threads.find((t) => t.id === threadId)

  // Scroll to bottom on initial load and new messages at the end
  useEffect(() => {
    if (messages.length === 0) return
    // Only auto-scroll if new messages were added at the end (not loading older)
    if (messages.length > prevMessageCount.current) {
      const addedAtEnd =
        prevMessageCount.current === 0 || !isFetchingPreviousPage
      if (addedAtEnd) {
        bottomRef.current?.scrollIntoView({ behavior: prevMessageCount.current === 0 ? 'instant' : 'smooth' })
      }
    }
    prevMessageCount.current = messages.length
  }, [messages.length, isFetchingPreviousPage])

  const handleLoadOlder = useCallback(() => {
    if (!hasPreviousPage || isFetchingPreviousPage) return
    const el = scrollRef.current
    const prevHeight = el?.scrollHeight ?? 0
    fetchPreviousPage().then(() => {
      // Preserve scroll position after prepending older messages
      requestAnimationFrame(() => {
        if (el) {
          el.scrollTop = el.scrollHeight - prevHeight
        }
      })
    })
  }, [hasPreviousPage, isFetchingPreviousPage, fetchPreviousPage])

  if (!threadId) {
    return (
      <div className="flex flex-1 items-center justify-center bg-surface-card">
        <p className="text-sm text-dim">Select a thread to start chatting</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col bg-surface-card">
      {/* Thread header */}
      <div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-surface-page px-5">
        {onBack && (
          <button onClick={onBack} className="md:hidden -ml-1 p-1 text-dim hover:text-white transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <h2 className="text-base font-semibold">{thread?.title ?? ''}</h2>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
        {/* Load older */}
        {hasPreviousPage && (
          <button
            onClick={handleLoadOlder}
            disabled={isFetchingPreviousPage}
            className="self-center rounded-lg px-3 py-1.5 text-xs text-dim hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            {isFetchingPreviousPage ? 'Loading…' : 'Load older messages'}
          </button>
        )}

        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`flex w-full ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}
            >
              <div className="flex max-w-[380px] animate-pulse flex-col gap-2 rounded-xl bg-surface-page px-3.5 py-2.5">
                <div className="h-2.5 w-16 rounded bg-white/10" />
                <div className="h-3 w-48 rounded bg-white/10" />
                <div className="h-2 w-12 rounded bg-white/5" />
              </div>
            </div>
          ))}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isSelf={msg.author === user?.username}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput threadId={threadId} />
    </div>
  )
}
