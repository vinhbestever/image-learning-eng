import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

const SESSION_RESPONSE = {
  session_id: 'abc',
  step: 1,
  total: 5,
  question: 'What do you see?',
  done: false,
}

const EVAL_RESPONSE = {
  session_id: 'abc',
  step: 5,
  total: 5,
  evaluation: 'Great effort!',
  done: true,
}

describe('App', () => {
  it('starts on upload screen', () => {
    render(<App />)
    expect(screen.getByText(/Learn English with Images/i)).toBeInTheDocument()
  })

  it('moves to chat screen after session created', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => SESSION_RESPONSE,
    }))

    render(<App />)
    const input = screen.getByTestId('file-input')
    await userEvent.upload(input, new File(['fake'], 'img.jpg', { type: 'image/jpeg' }))
    await userEvent.click(screen.getByRole('button', { name: /Start Session/i }))

    expect(await screen.findByText('Question 1 / 5')).toBeInTheDocument()
    expect(screen.getByText('What do you see?')).toBeInTheDocument()
  })

  it('moves to evaluation screen after done:true response', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => SESSION_RESPONSE })
      .mockResolvedValue({ ok: true, json: async () => EVAL_RESPONSE })
    )

    render(<App />)
    await userEvent.upload(
      screen.getByTestId('file-input'),
      new File(['fake'], 'img.jpg', { type: 'image/jpeg' })
    )
    await userEvent.click(screen.getByRole('button', { name: /Start Session/i }))

    await screen.findByText('Question 1 / 5')
    await userEvent.type(screen.getByRole('textbox'), 'My answer')
    await userEvent.click(screen.getByRole('button', { name: /Send/i }))

    expect(await screen.findByText("Here's your feedback")).toBeInTheDocument()
    expect(screen.getByText('Great effort!')).toBeInTheDocument()
  })

  it('returns to upload screen on retry', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => SESSION_RESPONSE })
      .mockResolvedValue({ ok: true, json: async () => EVAL_RESPONSE })
    )

    render(<App />)
    await userEvent.upload(
      screen.getByTestId('file-input'),
      new File(['fake'], 'img.jpg', { type: 'image/jpeg' })
    )
    await userEvent.click(screen.getByRole('button', { name: /Start Session/i }))
    await screen.findByText('Question 1 / 5')
    await userEvent.type(screen.getByRole('textbox'), 'answer')
    await userEvent.click(screen.getByRole('button', { name: /Send/i }))
    await screen.findByText("Here's your feedback")

    await userEvent.click(screen.getByRole('button', { name: /Try another image/i }))
    expect(screen.getByText(/Learn English with Images/i)).toBeInTheDocument()
  })
})
