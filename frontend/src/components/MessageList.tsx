import type { Message } from '../types'
import MessageBubble from './MessageBubble'

interface Props { messages: Message[] }

export default function MessageList({ messages }: Props) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
      {messages.map((msg, i) => (
        <MessageBubble key={i} message={msg} />
      ))}
    </div>
  )
}
