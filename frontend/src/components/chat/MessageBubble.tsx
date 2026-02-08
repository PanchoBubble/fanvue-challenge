import { useState, useRef, useCallback } from 'react'
import type { Message } from '@/types/api'
import { useToggleReaction } from '@/hooks/useReactions'
import { useAuthStore } from '@/lib/authStore'

interface MessageBubbleProps {
  message: Message
  isSelf: boolean
}

const NAME_COLORS = [
  '#48f264', // green (brand)
  '#FF6B6B', // red
  '#6BB5FF', // blue
  '#FFD96B', // yellow
  '#C06BFF', // purple
  '#FF9F6B', // orange
  '#6BFFD9', // teal
  '#FF6BB5', // pink
]

const REACTION_TYPES = [
  { type: 'heart', emoji: '\u2764\uFE0F' },
  { type: 'thumbs_up', emoji: '\uD83D\uDC4D' },
  { type: 'thumbs_down', emoji: '\uD83D\uDC4E' },
] as const

const REACTION_EMOJI: Record<string, string> = {
  heart: '\u2764\uFE0F',
  thumbs_up: '\uD83D\uDC4D',
  thumbs_down: '\uD83D\uDC4E',
}

function authorColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return NAME_COLORS[Math.abs(hash) % NAME_COLORS.length]
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function MessageBubble({ message, isSelf }: MessageBubbleProps) {
  const [showPicker, setShowPicker] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toggleReaction = useToggleReaction()
  const userId = useAuthStore((s) => s.user?.id)

  const reactions = message.reactions || {}

  const handleReaction = useCallback(
    (type: string) => {
      toggleReaction.mutate({
        messageId: message.id,
        threadId: message.threadId,
        type,
      })
      setShowPicker(false)
    },
    [toggleReaction, message.id, message.threadId],
  )

  const handleTouchStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setShowPicker(true)
    }, 500)
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const reactionEntries = Object.entries(reactions).filter(
    ([, v]) => v.count > 0,
  )

  return (
    <div className={`flex w-full ${isSelf ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`group relative${message.pending ? 'opacity-50' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {/* Hover trigger for desktop — smiley button */}
        <button
          type="button"
          onClick={() => setShowPicker((p) => !p)}
          className={`absolute -top-3 ${isSelf ? 'left-0 -translate-x-1/2' : 'right-0 translate-x-1/2'} bg-surface-page z-10 hidden h-6 w-6 items-center justify-center rounded-full text-xs opacity-0 shadow transition-opacity group-hover:flex group-hover:opacity-100`}
        >
          {'\u263A\uFE0F'}
        </button>

        {/* Reaction picker popover */}
        {showPicker && (
          <>
            <div
              className="fixed inset-0 z-20"
              onClick={() => setShowPicker(false)}
            />
            <div
              className={`absolute -top-10 ${isSelf ? 'right-0' : 'left-0'} bg-surface-page z-30 flex gap-1 rounded-lg p-1.5 shadow-lg`}
            >
              {REACTION_TYPES.map(({ type, emoji }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleReaction(type)}
                  className="hover:bg-surface-active flex h-7 w-7 items-center justify-center rounded-md text-base transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Message bubble */}
        <div
          className={`flex max-w-[380px] flex-col gap-1 px-3.5 py-2.5 ${
            isSelf
              ? 'bg-surface-active rounded-xl rounded-tr-none'
              : 'bg-surface-page rounded-xl rounded-tl-none'
          }`}
        >
          <div className="flex justify-between gap-3">
            {!isSelf ? (
              <span
                className="text-[11px] font-semibold"
                style={{ color: authorColor(message.author) }}
              >
                {message.author}
              </span>
            ) : (
              <div> </div>
            )}

            <span
              className={`text-[10px] ${isSelf ? 'text-white/40' : 'text-dim'}`}
            >
              {formatTime(message.createdAt)}
            </span>
          </div>
          <p className="text-sm break-words">{message.text}</p>

          {/* Reaction pills */}
          {reactionEntries.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {reactionEntries.map(([type, { count, userIds }]) => {
                const isReacted = userId ? userIds.includes(userId) : false
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleReaction(type)}
                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors ${
                      isReacted
                        ? 'bg-brand/20 ring-brand/40 ring-1'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <span>{REACTION_EMOJI[type] || type}</span>
                    <span>{count}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
