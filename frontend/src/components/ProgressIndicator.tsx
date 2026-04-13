interface Props {
  step: number
  total: number
  done?: boolean
}

export default function ProgressIndicator({ step, total, done }: Props) {
  const pct = done ? 100 : Math.min(100, (step / total) * 100)

  return (
    <div style={{ flex: 1 }}>
      <p className="label-tag" style={{ margin: '0 0 4px' }}>
        {done ? 'Completed' : 'Session'}
      </p>
      <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem' }}>
        {done ? `All ${total} questions` : `Question ${step} / ${total}`}
      </p>
      <div
        style={{
          marginTop: 8,
          height: 4,
          borderRadius: 4,
          background: 'var(--mist)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: done
              ? 'linear-gradient(90deg, var(--sage), #7a9a73)'
              : 'linear-gradient(90deg, var(--accent), var(--sage))',
            borderRadius: 4,
            transition: 'width 0.55s ease',
          }}
        />
      </div>
    </div>
  )
}
