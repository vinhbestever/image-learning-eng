import FeedbackCard from './FeedbackCard'

interface Props { evaluation: string; onRetry: () => void }

export default function EvaluationScreen({ evaluation, onRetry }: Props) {
  return (
    <div style={{ maxWidth: 560, margin: '60px auto', padding: 24 }}>
      <h2 style={{ marginBottom: 20 }}>Here's your feedback</h2>
      <FeedbackCard evaluation={evaluation} onRetry={onRetry} />
    </div>
  )
}
