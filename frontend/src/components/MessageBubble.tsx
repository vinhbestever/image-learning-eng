import type { Message } from '../types'

interface Props { message: Message }

export default function MessageBubble({ message }: Props) {
  const isAgent = message.role === 'agent'
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isAgent ? 'flex-start' : 'flex-end',
        marginBottom: 8,
      }}
    >
      <div
        style={{
          maxWidth: '75%',
          padding: '10px 14px',
          borderRadius: 12,
          background: isAgent ? '#f0f0f0' : '#0078d4',
          color: isAgent ? '#111' : '#fff',
        }}
      >
        {message.text}
      </div>
    </div>
  )
}
