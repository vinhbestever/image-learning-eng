import type { Message } from '../types'
import ThinkingBubble from './ThinkingBubble'
import MarkdownText from './MarkdownText'

interface Props {
  message: Message
}

// If choices are provided separately, remove the inline numbered/lettered list
// that the agent might have appended to the question text to avoid duplication.
function cleanQuestionText(text: string, hasChoices: boolean): string {
  if (!hasChoices) return text
  // Strip trailing block that looks like "1. Foo\n2. Bar\n..." or "A. Foo\nB. Bar\n..."
  return text
    .replace(/\n+([A-Da-d\d][.)]\s+.+(\n|$)){2,}/g, '')
    .trimEnd()
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

function stripPrefix(text: string): string {
  return text.replace(/^[A-Za-z\d]\.\s*/, '')
}

export default function MessageBubble({ message }: Props) {
  const { role, text, thinking, thinkingDuration, choices } = message
  const hasThinking = typeof thinking === 'string' && thinking.length > 0
  const hasChoices = Array.isArray(choices) && choices.length > 0

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
  const displayText = isAgent ? cleanQuestionText(text, hasChoices) : text

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
            <MarkdownText text={displayText} />
          ) : (
            <span style={{ fontFamily: 'var(--font-body)' }}>{text}</span>
          )}

          {/* Historical MCQ choices — shown dimmed once the question is past */}
          {isAgent && hasChoices && (
            <div
              style={{
                marginTop: 10,
                display: 'grid',
                gridTemplateColumns: choices!.length > 2 ? '1fr 1fr' : '1fr',
                gap: 5,
              }}
            >
              {choices!.map((c, i) => (
                <div
                  key={c}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 10px',
                    borderRadius: 8,
                    background: 'rgba(20,18,16,0.05)',
                    border: '1px solid rgba(20,18,16,0.08)',
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      width: 20,
                      height: 20,
                      borderRadius: 5,
                      background: 'rgba(20,18,16,0.07)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: '0.65rem',
                      color: 'var(--ink-soft)',
                    }}
                  >
                    {LETTERS[i] ?? String(i + 1)}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.82rem',
                      color: 'var(--ink-soft)',
                      lineHeight: 1.3,
                    }}
                  >
                    {stripPrefix(c)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
