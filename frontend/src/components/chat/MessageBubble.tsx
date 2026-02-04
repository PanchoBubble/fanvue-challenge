import { motion } from 'framer-motion'
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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`flex w-full ${isSelf ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`flex max-w-[380px] flex-col gap-1 px-3.5 py-2.5 ${
          isSelf
            ? 'rounded-xl rounded-tr-none bg-surface-active'
            : 'rounded-xl rounded-tl-none bg-surface-page'
        }`}
      >
        {!isSelf && (
          <span
            className="text-[11px] font-semibold"
            style={{ color: authorColor(message.author) }}
          >
            {message.author}
          </span>
        )}
        <p className="text-sm">{message.text}</p>
        <span
          className={`text-[10px] ${isSelf ? 'text-white/40' : 'text-dim'}`}
        >
          {formatTime(message.createdAt)}
        </span>
      </div>
    </motion.div>
  )
}
