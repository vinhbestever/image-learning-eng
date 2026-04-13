import React, { useState } from 'react'

interface Props { onSubmit: (answer: string) => void; disabled?: boolean }

export default function AnswerInput({ onSubmit, disabled }: Props) {
  const [value, setValue] = useState('')

  const handleSubmit = () => {
    if (!value.trim()) return
    onSubmit(value.trim())
    setValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }

  return (
    <div style={{ display: 'flex', gap: 8, padding: '12px 0' }}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Type your answer..."
        style={{ flex: 1, padding: '10px 12px', borderRadius: 6, border: '1px solid #ccc', fontSize: 15 }}
      />
      <button onClick={handleSubmit} disabled={disabled || !value.trim()} style={{ padding: '10px 20px' }}>
        Send
      </button>
    </div>
  )
}
