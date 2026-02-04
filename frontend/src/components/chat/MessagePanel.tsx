import { useEffect, useLayoutEffect, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
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
  const prevThreadId = useRef(threadId)
  const prevFirstId = useRef<string>()
  const prevCount = useRef(0)
  const prevScrollHeight = useRef(0)
  useThreadStream(threadId)

  const thread = threads.find((t) => t.id === threadId)

  // Reset when switching threads
  if (prevThreadId.current !== threadId) {
    prevThreadId.current = threadId
    prevFirstId.current = undefined
    prevCount.current = 0
    prevScrollHeight.current = 0
  }

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 72,
    overscan: 10,
    getItemKey: (index) => messages[index]?.id ?? index,
    paddingStart: 20,
    paddingEnd: 20,
  })

  // Runs before paint — compensate scroll position when older messages are prepended
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || messages.length === 0) return

    if (prevCount.current === 0) {
      // Initial load → instant scroll to bottom
      virtualizer.scrollToIndex(messages.length - 1, { align: 'end' })
    } else if (messages.length > prevCount.current) {
      if (prevFirstId.current && messages[0]?.id !== prevFirstId.current) {
        // Older messages prepended → adjust scrollTop by the height delta before paint
        const heightDiff = el.scrollHeight - prevScrollHeight.current
        if (heightDiff > 0) {
          el.scrollTop += heightDiff
        }
      } else {
        // New message at end → smooth scroll to bottom
        virtualizer.scrollToIndex(messages.length - 1, {
          align: 'end',
          behavior: 'smooth',
        })
      }
    }

    prevCount.current = messages.length
    prevFirstId.current = messages[0]?.id
    prevScrollHeight.current = el.scrollHeight
  }, [messages, virtualizer])

  // Infinite scroll: fetch older when near top
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const onScroll = () => {
      if (el.scrollTop < 200 && hasPreviousPage && !isFetchingPreviousPage) {
        fetchPreviousPage()
      }
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [hasPreviousPage, isFetchingPreviousPage, fetchPreviousPage])

  if (!threadId) {
    return (
      <div className="flex flex-1 items-center justify-center bg-surface-card">
        <p className="text-sm text-dim">Select a thread to start chatting</p>
      </div>
    )
  }

  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div className="flex flex-1 flex-col bg-surface-card">
      {/* Thread header */}
      <div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-surface-page px-5 bg-surface-page border-b border-border-card">
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden -ml-1 p-1 text-dim hover:text-white transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <h2 className="text-base font-semibold">{thread?.title ?? ''}</h2>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex flex-col gap-4 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
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
          </div>
        )}

        {!isLoading && messages.length > 0 && (
          <div
            style={{
              height: virtualizer.getTotalSize(),
              width: '100%',
              position: 'relative',
            }}
          >
            {isFetchingPreviousPage && (
              <div className="absolute top-2 left-0 right-0 z-10 text-center text-xs text-dim">
                Loading…
              </div>
            )}
            {virtualItems.map((virtualRow) => {
              const msg = messages[virtualRow.index]
              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="px-5 py-2">
                    <MessageBubble
                      message={msg}
                      isSelf={msg.author === user?.username}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Input */}
      <MessageInput threadId={threadId} />
    </div>
  )
}
