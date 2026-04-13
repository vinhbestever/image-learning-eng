interface Props {
  step: number
  total: number | null
  done?: boolean
}

/** Open-ended adaptive sessions omit `total`; fixed-length drills send a positive cap. */
export default function ProgressIndicator({ step, total, done }: Props) {
  const hasCap = total != null && total > 0
  const pct = done
    ? 100
    : hasCap
      ? Math.min(100, (step / total!) * 100)
      : Math.min(100, step * 8)

  const mainLabel = done
    ? hasCap
      ? `All ${total} questions`
      : 'Practice finished'
    : hasCap
      ? `Question ${step} / ${total}`
      : `Turn ${step}`

  const sessionKindLabel = done ? 'Completed' : hasCap ? 'Session' : 'Adaptive lesson'

  return (
    <div style={{ flex: 1 }}>
      <p className="label-tag" style={{ margin: '0 0 4px' }}>
        {sessionKindLabel}
      </p>
      <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem' }}>
        {mainLabel}
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
