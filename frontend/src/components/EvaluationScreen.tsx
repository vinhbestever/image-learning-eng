import FeedbackCard from './FeedbackCard'

interface Props {
  evaluation: string
  onRetry: () => void
}

export default function EvaluationScreen({ evaluation, onRetry }: Props) {
  return (
    <div className="app-shell" style={{ minHeight: '100vh', padding: 'clamp(24px, 5vw, 56px)' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <header style={{ marginBottom: 28 }}>
          <p className="label-tag" style={{ marginBottom: 10 }}>
            Lesson complete
          </p>
          <h2 style={{ fontSize: 'clamp(1.65rem, 4vw, 2.25rem)', margin: 0 }}>
            Your <span style={{ color: 'var(--accent)' }}>adaptive</span> feedback
          </h2>
        </header>
        <FeedbackCard evaluation={evaluation} onRetry={onRetry} />
      </div>
    </div>
  )
}
