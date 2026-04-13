import React, { useState } from 'react'

interface Props {
  onSubmit: (answer: string) => void
  disabled?: boolean
}

export default function AnswerInput({ onSubmit, disabled }: Props) {
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
