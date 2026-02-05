import type { Message } from '@/types/api'

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
  return (
    <div className={`flex w-full ${isSelf ? 'justify-end' : 'justify-start'}`}>
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
            #{message.messageNumber}
          </span>
        </div>
        <p className="text-sm break-words">{message.text}</p>
        <span
          className={`text-[10px] ${isSelf ? 'text-white/40' : 'text-dim'}`}
        >
          Sent at {formatTime(message.createdAt)}
        </span>
      </div>
    </div>
  )
}
