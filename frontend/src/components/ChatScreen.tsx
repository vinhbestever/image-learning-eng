import ImageThumbnail from './ImageThumbnail'
import ProgressIndicator from './ProgressIndicator'
import MessageList from './MessageList'
import AnswerInput from './AnswerInput'
import type { Message } from '../types'

interface Props {
  sessionId: string
  step: number
  total: number | null
  imagePreview: string
  messages: Message[]
  onAnswerSubmitted: (answer: string) => void
  submitting?: boolean
  submitError?: string | null
  thinkingText?: string
  isThinking?: boolean
  thinkingDuration?: number
  done?: boolean
  onRetry?: () => void
}

export default function ChatScreen({
  step,
  total,
  imagePreview,
  messages,
  onAnswerSubmitted,
  submitting,
  submitError,
  thinkingText = '',
  isThinking = false,
  thinkingDuration = 0,
  done,
  onRetry,
}: Props) {
  const showThinking = isThinking || thinkingText.length > 0

  return (
    <div
      style={{
        height: '100dvh',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
        padding: 'clamp(10px, 2vw, 24px)',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="app-shell card"
        style={{
          width: '100%',
          maxWidth: 640,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Fixed header */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 16,
            padding: '18px 24px 16px',
            borderBottom: '1px solid rgba(20, 18, 16, 0.08)',
          }}
        >
          <ImageThumbnail src={imagePreview} />
          <ProgressIndicator step={step} total={total} done={done} />
        </div>

        {/* Scrollable messages area */}
        <MessageList
          messages={messages}
          thinkingText={thinkingText}
          isThinking={isThinking}
          thinkingDuration={thinkingDuration}
          showThinking={showThinking}
        />

        {/* Fixed footer */}
        <div
          style={{
            flexShrink: 0,
            padding: '12px 24px 16px',
            borderTop: '1px solid rgba(20, 18, 16, 0.08)',
          }}
        >
          {submitError ? (
            <p role="alert" style={{ color: 'var(--accent-dim)', margin: '0 0 10px', fontSize: '0.9rem' }}>
              {submitError}
            </p>
          ) : null}

          {done ? (
            <button
              type="button"
              className="btn-ghost"
              onClick={onRetry}
              style={{ width: '100%', padding: '14px' }}
            >
              Try another image
            </button>
          ) : (
            <AnswerInput onSubmit={onAnswerSubmitted} disabled={submitting} />
          )}
        </div>
      </div>
    </div>
  )
}
