import { useState, useEffect } from 'react'

interface Props {
  text: string
  isActive: boolean
  duration: number
}

export default function ThinkingBubble({ text, isActive, duration }: Props) {
  // Active bubbles start expanded so the user sees the live stream.
  // Historical (isActive=false) bubbles start collapsed.
  const [expanded, setExpanded] = useState(isActive)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!isActive) {
      setElapsed(0)
      return
    }
    const start = Date.now()
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(id)
  }, [isActive])

  const hasText = text.length > 0
  const displayTime = isActive ? elapsed : duration

  return (
    <div className="thinking-bubble">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="thinking-header"
        aria-expanded={expanded}
      >
        <span className={isActive ? 'thinking-dots' : 'thinking-done-icon'} aria-hidden>
          {isActive ? (
            <><span /><span /><span /></>
          ) : (
            '✦'
          )}
        </span>
        <span>
          {isActive
            ? `Thinking${displayTime > 0 ? ` · ${displayTime}s` : '…'}`
            : `Thought for ${displayTime}s`}
        </span>
        <span
          className="thinking-chevron"
          style={{ transform: expanded ? 'rotate(-90deg)' : 'rotate(90deg)' }}
        >
          ›
        </span>
      </button>

      {expanded && hasText && (
        <div className="thinking-body">
          <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>
          {isActive && <span className="stream-cursor" aria-hidden />}
        </div>
      )}
    </div>
  )
}
