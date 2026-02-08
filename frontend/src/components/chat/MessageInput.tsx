import { useState } from 'react'
import { Send } from 'lucide-react'
import { useSendMessage } from '@/hooks/useMessages'

interface MessageInputProps {
  threadId: string
  onSent?: () => void
}

export function MessageInput({ threadId, onSent }: MessageInputProps) {
  const [text, setText] = useState('')
  const sendMessage = useSendMessage(threadId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || sendMessage.isPending) return
    const trimmed = text.trim()
    setText('')
    onSent?.()
    sendMessage.mutate(trimmed)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-border-subtle bg-surface-page flex h-16 shrink-0 items-center gap-3 border-t px-5"
    >
      <input
        type="text"
        placeholder="Type a message..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="border-border-input placeholder:text-placeholder h-[42px] flex-1 rounded-lg border bg-white/[0.04] px-3.5 text-sm text-white outline-none"
      />
      <button
        type="submit"
        disabled={!text.trim() || sendMessage.isPending}
        className="bg-brand text-surface-page flex h-[42px] w-[42px] cursor-pointer items-center justify-center rounded-lg transition-colors disabled:opacity-50"
      >
        <Send className="h-[18px] w-[18px]" />
      </button>
    </form>
  )
}
