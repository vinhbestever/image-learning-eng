import type { Message } from '../types'
import ThinkingBubble from './ThinkingBubble'
import MarkdownText from './MarkdownText'

interface Props {
  message: Message
}

export default function MessageBubble({ message }: Props) {
  const { role, text, thinking, thinkingDuration } = message
  const hasThinking = typeof thinking === 'string' && thinking.length > 0

  if (role === 'evaluation') {
    return (
      <div style={{ marginBottom: 16, animation: 'fade-rise 0.5s ease-out both' }}>
        {hasThinking && (
          <ThinkingBubble
            text={thinking!}
            isActive={false}
            duration={thinkingDuration ?? 0}
          />
        )}
        <span className="label-tag" style={{ display: 'block', marginBottom: 8, color: 'var(--accent)' }}>
          Tutor feedback
        </span>
        <div
          style={{
            padding: '18px 22px',
            borderRadius: '4px 18px 18px 18px',
            background: 'linear-gradient(135deg, rgba(196, 85, 42, 0.09) 0%, rgba(92, 107, 86, 0.07) 100%)',
            border: '1px solid rgba(196, 85, 42, 0.22)',
            lineHeight: 1.8,
            fontFamily: 'var(--font-body)',
            fontSize: '0.95rem',
            color: 'var(--ink)',
          }}
        >
          <MarkdownText text={text} />
        </div>
      </div>
    )
  }

  const isAgent = role === 'agent'
  return (
    <div style={{ marginBottom: 14, animation: 'fade-rise 0.35s ease-out both' }}>
      {isAgent && hasThinking && (
        <ThinkingBubble
          text={thinking!}
          isActive={false}
          duration={thinkingDuration ?? 0}
        />
      )}
      <div style={{ display: 'flex', justifyContent: isAgent ? 'flex-start' : 'flex-end' }}>
        <div
          style={{
            maxWidth: '88%',
            padding: '14px 18px',
            borderRadius: isAgent ? '4px 18px 18px 18px' : '18px 4px 18px 18px',
            background: isAgent ? 'var(--paper-deep)' : 'var(--ink)',
            color: isAgent ? 'var(--ink)' : 'var(--paper)',
            lineHeight: 1.65,
            boxShadow: isAgent ? 'none' : '0 8px 24px rgba(20, 18, 16, 0.18)',
            border: isAgent ? '1px solid rgba(20, 18, 16, 0.06)' : 'none',
          }}
        >
          {isAgent && (
            <span className="label-tag" style={{ display: 'block', marginBottom: 6 }}>
              Tutor
            </span>
          )}
          {isAgent ? (
            <MarkdownText text={text} />
          ) : (
            <span style={{ fontFamily: 'var(--font-body)' }}>{text}</span>
          )}
        </div>
      </div>
    </div>
  )
}
