import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useMessages } from '@/hooks/useMessages'
import {
  useThreads,
  useUpdateThread,
  useDeleteThread,
} from '@/hooks/useThreads'
import { useThreadStream } from '@/hooks/useThreadStream'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { ThreadMenu } from './ThreadMenu'
import { ConfirmModal } from './ConfirmModal'

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
  const updateThread = useUpdateThread()
  const deleteThread = useDeleteThread()
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevThreadId = useRef(threadId)
  const prevFirstId = useRef<string>('')
  const prevCount = useRef(0)
  const prevScrollHeight = useRef(0)
  useThreadStream(threadId)

  const thread = threads.find((t) => t.id === threadId)

  // Inline edit state
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (isEditingTitle) {
      editInputRef.current?.focus()
      editInputRef.current?.select()
    }
  }, [isEditingTitle])

  // Cancel edit when switching threads
  useEffect(() => {
    setIsEditingTitle(false)
    setShowDeleteConfirm(false)
  }, [threadId])

  const handleEditSave = () => {
    const trimmed = editTitle.trim()
    if (trimmed.length >= 2 && threadId) {
      updateThread.mutate({ id: threadId, title: trimmed })
    }
    setIsEditingTitle(false)
  }

  const handleDeleteConfirm = () => {
    if (!threadId) return
    deleteThread.mutate(threadId, {
      onSuccess: () => {
        setShowDeleteConfirm(false)
        onBack?.()
      },
    })
  }

  // Reset when switching threads
  if (prevThreadId.current !== threadId) {
    prevThreadId.current = threadId
    prevFirstId.current = ''
    prevCount.current = 0
    prevScrollHeight.current = 0
  }

  // eslint-disable-next-line react-hooks/incompatible-library
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
      <div className="bg-surface-card flex flex-1 items-center justify-center">
        <p className="text-dim text-sm">Select a thread to start chatting</p>
      </div>
    )
  }

  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div className="bg-surface-card flex flex-1 flex-col">
      {/* Thread header */}
      <div className="bg-surface-page border-border-subtle group flex shrink-0 items-center gap-2 border-b px-5 py-2">
        {onBack && (
          <button
            onClick={onBack}
            className="text-dim -ml-1 p-1 transition-colors hover:text-white md:hidden"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          {isEditingTitle ? (
            <input
              ref={editInputRef}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEditSave()
                if (e.key === 'Escape') setIsEditingTitle(false)
              }}
              onBlur={handleEditSave}
              className="border-brand min-w-0 rounded border bg-transparent px-1.5 py-0.5 text-base font-semibold text-white outline-none"
            />
          ) : (
            <h2 className="truncate text-base font-semibold">
              {thread?.title ?? ''}
            </h2>
          )}
          {thread && !isEditingTitle && (
            <p className="text-dim truncate text-xs">
              {thread.messageCount}{' '}
              {thread.messageCount === 1 ? 'message' : 'messages'}
              {thread.lastMessageAt && (
                <span>
                  {' '}
                  · last {new Date(thread.lastMessageAt).toLocaleString()}
                </span>
              )}
            </p>
          )}
        </div>
        {thread && !isEditingTitle && (
          <ThreadMenu
            onEdit={() => {
              setEditTitle(thread.title)
              setIsEditingTitle(true)
            }}
            onDelete={() => setShowDeleteConfirm(true)}
          />
        )}
      </div>

      {/* Delete confirmation */}
      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete thread"
        description={`Are you sure you want to delete "${thread?.title ?? ''}"? This will permanently remove the thread and all its messages.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        isLoading={deleteThread.isPending}
      />

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex flex-col gap-4 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={`flex w-full ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}
              >
                <div className="bg-surface-page flex max-w-[380px] animate-pulse flex-col gap-2 rounded-xl px-3.5 py-2.5">
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
              <div className="text-dim absolute top-2 right-0 left-0 z-10 text-center text-xs">
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
