interface Props { step: number; total: number }

export default function ProgressIndicator({ step, total }: Props) {
  return (
    <div style={{ fontWeight: 600, color: '#444' }}>
      Question {step} / {total}
    </div>
  )
}
