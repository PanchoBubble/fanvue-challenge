import { useState } from 'react'
import { Send } from 'lucide-react'
import { useSendMessage } from '@/hooks/useMessages'

interface MessageInputProps {
  threadId: string
}

export function MessageInput({ threadId }: MessageInputProps) {
  const [text, setText] = useState('')
  const sendMessage = useSendMessage(threadId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || sendMessage.isPending) return
    sendMessage.mutate(text.trim(), {
      onSuccess: () => setText(''),
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-16 shrink-0 items-center gap-3 border-t border-surface-page bg-surface-page px-5"
    >
      <input
        type="text"
        placeholder="Type a message..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="flex-1 h-[42px] rounded-lg border border-border-input bg-white/[0.04] px-3.5 text-sm text-white outline-none placeholder:text-placeholder"
      />
      <button
        type="submit"
        disabled={!text.trim() || sendMessage.isPending}
        className="flex h-[42px] w-[42px] items-center justify-center rounded-lg bg-brand text-surface-page transition-colors disabled:opacity-50"
      >
        <Send className="h-[18px] w-[18px]" />
      </button>
    </form>
  )
}
