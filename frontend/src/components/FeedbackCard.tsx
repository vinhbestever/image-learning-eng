interface Props {
  evaluation: string
  onRetry: () => void
}

export default function FeedbackCard({ evaluation, onRetry }: Props) {
  return (
    <div
      style={{
        background: 'linear-gradient(165deg, rgba(232, 223, 210, 0.5) 0%, rgba(246, 240, 232, 0.35) 100%)',
        borderRadius: 16,
        padding: 'clamp(20px, 4vw, 32px)',
        lineHeight: 1.75,
        border: '1px solid rgba(20, 18, 16, 0.08)',
      }}
    >
      <p
        style={{
          whiteSpace: 'pre-wrap',
          margin: '0 0 28px',
          fontSize: '1.05rem',
          color: 'var(--ink)',
        }}
      >
        {evaluation}
      </p>
      <button type="button" className="btn-ghost" onClick={onRetry}>
        Try another image
      </button>
    </div>
  )
}
