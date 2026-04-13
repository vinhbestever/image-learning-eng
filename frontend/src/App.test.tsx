import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

function sseResponse(lines: string[]) {
  const encoder = new TextEncoder()
  const body = lines.join('')
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(body))
        controller.close()
      },
    }),
    { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
  )
}

// SSE payload for a successful session creation (first question)
const SESSION_SSE = [
  'data: {"type":"started","session_id":"abc"}\n\n',
  'data: {"type":"question","session_id":"abc","step":1,"total":null,"text":"What do you see?"}\n\n',
]

describe('App', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts on upload screen', () => {
    render(<App />)
    expect(screen.getByText(/Describe the world/i)).toBeInTheDocument()
  })

  it('moves to chat screen after session created', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse(SESSION_SSE)))

    render(<App />)
    const input = screen.getByTestId('file-input')
    await userEvent.upload(input, new File(['fake'], 'img.jpg', { type: 'image/jpeg' }))
    await userEvent.click(screen.getByRole('button', { name: /Begin practice/i }))

    expect(await screen.findByText('Turn 1')).toBeInTheDocument()
    expect(screen.getByText('What do you see?')).toBeInTheDocument()
  })

  it('moves to evaluation screen after stream done event', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(sseResponse(SESSION_SSE))
      .mockResolvedValueOnce(
        sseResponse([
          'data: {"type":"done","step":5,"total":null,"evaluation":"Great effort!"}\n\n',
        ]),
      ),
    )

    render(<App />)
    await userEvent.upload(
      screen.getByTestId('file-input'),
      new File(['fake'], 'img.jpg', { type: 'image/jpeg' }),
    )
    await userEvent.click(screen.getByRole('button', { name: /Begin practice/i }))

    await screen.findByText('Turn 1')
    await userEvent.type(screen.getByRole('textbox'), 'My answer')
    await userEvent.click(screen.getByRole('button', { name: /Send/i }))

    expect(await screen.findByText('Session complete')).toBeInTheDocument()
    expect(screen.getByText('Great effort!')).toBeInTheDocument()
  })

  it('shows error when stream returns HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(sseResponse(SESSION_SSE))
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: 'Session not found.' }),
      }),
    )

    render(<App />)
    await userEvent.upload(
      screen.getByTestId('file-input'),
      new File(['fake'], 'img.jpg', { type: 'image/jpeg' }),
    )
    await userEvent.click(screen.getByRole('button', { name: /Begin practice/i }))
    await screen.findByText('Turn 1')
    await userEvent.type(screen.getByRole('textbox'), 'answer')
    await userEvent.click(screen.getByRole('button', { name: /Send/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Session not found.')
  })

  it('returns to upload screen on retry', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(sseResponse(SESSION_SSE))
      .mockResolvedValueOnce(
        sseResponse([
          'data: {"type":"done","step":5,"total":null,"evaluation":"Done!"}\n\n',
        ]),
      ),
    )

    render(<App />)
    await userEvent.upload(
      screen.getByTestId('file-input'),
      new File(['fake'], 'img.jpg', { type: 'image/jpeg' }),
    )
    await userEvent.click(screen.getByRole('button', { name: /Begin practice/i }))
    await screen.findByText('Turn 1')
    await userEvent.type(screen.getByRole('textbox'), 'answer')
    await userEvent.click(screen.getByRole('button', { name: /Send/i }))
    await screen.findByText('Session complete')

    await userEvent.click(screen.getByRole('button', { name: /Try another image/i }))
    expect(screen.getByText(/Describe the world/i)).toBeInTheDocument()
  })
})
