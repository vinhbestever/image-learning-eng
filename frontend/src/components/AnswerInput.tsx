import React, { useState } from 'react'

interface Props {
  onSubmit: (answer: string) => void
  disabled?: boolean
  choices?: string[]
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

// Strip leading "A. " or "1. " prefix if agent included it in the choice string
function stripPrefix(text: string): string {
  return text.replace(/^[A-Za-z\d]\.\s*/, '')
}

interface ChoiceButtonProps {
  letter: string
  text: string
  disabled?: boolean
  animDelay: number
  onClick: () => void
}

function ChoiceButton({ letter, text, disabled, animDelay, onClick }: ChoiceButtonProps) {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false)
        setPressed(false)
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '11px 14px',
        border: `1.5px solid ${hovered ? 'var(--ink)' : 'rgba(20,18,16,0.14)'}`,
        borderRadius: 12,
        background: hovered
          ? 'var(--ink)'
          : pressed
            ? 'rgba(20,18,16,0.04)'
            : 'rgba(246,240,232,0.65)',
        color: hovered ? 'var(--paper)' : 'var(--ink)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transform: pressed && !disabled ? 'scale(0.977)' : 'none',
        transition: 'border-color 0.14s ease, background 0.14s ease, color 0.14s ease, transform 0.1s ease',
        textAlign: 'left',
        width: '100%',
        animation: `fade-rise 0.32s ease-out ${animDelay}s both`,
        fontFamily: 'inherit',
        boxShadow: hovered ? '0 4px 16px rgba(20,18,16,0.12)' : 'none',
      }}
    >
      {/* Letter badge */}
      <span
        style={{
          flexShrink: 0,
          width: 26,
          height: 26,
          borderRadius: 7,
          background: hovered ? 'rgba(246,240,232,0.16)' : 'rgba(20,18,16,0.07)',
          border: `1px solid ${hovered ? 'rgba(246,240,232,0.25)' : 'rgba(20,18,16,0.08)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '0.75rem',
          letterSpacing: '0.01em',
          color: hovered ? 'rgba(246,240,232,0.9)' : 'var(--ink-soft)',
          transition: 'background 0.14s ease, color 0.14s ease',
          userSelect: 'none',
        }}
      >
        {letter}
      </span>

      {/* Choice text */}
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.93rem',
          lineHeight: 1.4,
          color: 'inherit',
        }}
      >
        {text}
      </span>
    </button>
  )
}

export default function AnswerInput({ onSubmit, disabled, choices }: Props) {
  const [value, setValue] = useState('')

  const handleSubmit = () => {
    if (!value.trim()) return
    onSubmit(value.trim())
    setValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // ── Multiple-choice mode ──────────────────────────────────────────────────
  if (choices && choices.length > 0) {
    const cols = choices.length > 2 ? '1fr 1fr' : '1fr'
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: '14px 0 6px',
          borderTop: '1px solid rgba(20, 18, 16, 0.08)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.67rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.11em',
            color: 'var(--sage)',
          }}
        >
          Chọn đáp án
        </span>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: cols,
            gap: 7,
          }}
        >
          {choices.map((c, i) => (
            <ChoiceButton
              key={c}
              letter={LETTERS[i] ?? String(i + 1)}
              text={stripPrefix(c)}
              disabled={disabled}
              animDelay={i * 0.055}
              onClick={() => onSubmit(c)}
            />
          ))}
        </div>
      </div>
    )
  }

  // ── Free-text mode ────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        padding: '16px 0 8px',
        borderTop: '1px solid rgba(20, 18, 16, 0.08)',
      }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Answer in English — or ask the tutor a question…"
        aria-label="Your answer or question for the tutor"
        style={{
          flex: 1,
          padding: '14px 16px',
          borderRadius: 12,
          border: '1px solid rgba(20, 18, 16, 0.15)',
          fontSize: '1rem',
          fontFamily: 'var(--font-body)',
          background: 'rgba(246, 240, 232, 0.6)',
          color: 'var(--ink)',
        }}
      />
      <button
        type="button"
        className="btn-primary"
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        style={{ padding: '14px 22px' }}
      >
        Send
      </button>
    </div>
  )
}
