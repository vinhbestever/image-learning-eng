import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'
import ThinkingBubble from './ThinkingBubble'
import type { Message } from '../types'

interface Props {
  messages: Message[]
  thinkingText?: string
  isThinking?: boolean
  thinkingDuration?: number
  showThinking?: boolean
}

export default function MessageList({
  messages,
  thinkingText = '',
  isThinking = false,
  thinkingDuration = 0,
  showThinking = false,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
  }, [messages, thinkingText, isThinking])

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 24px 8px',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(20,18,16,0.12) transparent',
      }}
    >
      {messages.map((m, i) => (
        <MessageBubble key={`${m.role}-${i}-${m.text.slice(0, 12)}`} message={m} />
      ))}

      {showThinking && (thinkingText.length > 0 || isThinking) && (
        <ThinkingBubble
          text={thinkingText}
          isActive={isThinking}
          duration={thinkingDuration}
        />
      )}

      <div ref={bottomRef} style={{ height: 1 }} />
    </div>
  )
}
