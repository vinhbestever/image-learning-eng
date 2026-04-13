import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChatScreen from './ChatScreen'
import type { Message } from '../types'

const defaultProps = {
  sessionId: 'abc-123',
  step: 1,
  total: 5,
  imagePreview: 'data:image/jpeg;base64,fake',
  messages: [{ role: 'agent' as const, text: 'What do you see?' }],
  onAnswerSubmitted: vi.fn(),
}

describe('ChatScreen', () => {
  it('renders progress indicator', () => {
    render(<ChatScreen {...defaultProps} />)
    expect(screen.getByText('Question 1 / 5')).toBeInTheDocument()
  })

  it('renders turn-based label when total is null', () => {
    render(<ChatScreen {...defaultProps} total={null} />)
    expect(screen.getByText('Adaptive lesson')).toBeInTheDocument()
    expect(screen.getByText('Turn 1')).toBeInTheDocument()
  })

  it('renders all messages', () => {
    const messages: Message[] = [
      { role: 'agent', text: 'What do you see?' },
      { role: 'user', text: 'I see a cat.' },
    ]
    render(<ChatScreen {...defaultProps} messages={messages} />)
    expect(screen.getByText('What do you see?')).toBeInTheDocument()
    expect(screen.getByText('I see a cat.')).toBeInTheDocument()
  })

  it('calls onAnswerSubmitted with typed answer on submit', async () => {
    const onAnswerSubmitted = vi.fn()
    render(<ChatScreen {...defaultProps} onAnswerSubmitted={onAnswerSubmitted} />)

    await userEvent.type(screen.getByRole('textbox'), 'I see a red bicycle.')
    await userEvent.click(screen.getByRole('button', { name: /Send/i }))

    expect(onAnswerSubmitted).toHaveBeenCalledWith('I see a red bicycle.')
  })

  it('clears input after submit', async () => {
    render(<ChatScreen {...defaultProps} />)
    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'Some answer')
    await userEvent.click(screen.getByRole('button', { name: /Send/i }))
    expect(input).toHaveValue('')
  })

  it('disables input while submitting', () => {
    render(<ChatScreen {...defaultProps} submitting />)
    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByRole('button', { name: /Send/i })).toBeDisabled()
  })

  it('shows submit error', () => {
    render(<ChatScreen {...defaultProps} submitError="Network failed" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Network failed')
  })
})
