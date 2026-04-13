interface Props { evaluation: string; onRetry: () => void }

export default function FeedbackCard({ evaluation, onRetry }: Props) {
  return (
    <div style={{ background: '#f9f9f9', borderRadius: 10, padding: 24, lineHeight: 1.7 }}>
      <p style={{ whiteSpace: 'pre-wrap', marginBottom: 24 }}>{evaluation}</p>
      <button onClick={onRetry} style={{ padding: '10px 24px', fontSize: 15, cursor: 'pointer' }}>
        Try another image
      </button>
    </div>
  )
}
