import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UploadScreen from './UploadScreen'

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

describe('UploadScreen', () => {
  it('renders upload prompt and disabled button', () => {
    render(<UploadScreen onSessionCreated={vi.fn()} />)
    expect(screen.getByText(/Describe the world/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Begin adaptive lesson/i })).toBeDisabled()
  })

  it('enables Begin adaptive lesson button after file is selected', async () => {
    render(<UploadScreen onSessionCreated={vi.fn()} />)
    const input = screen.getByTestId('file-input')
    const file = new File(['fake'], 'photo.jpg', { type: 'image/jpeg' })

    await userEvent.upload(input, file)

    expect(screen.getByRole('button', { name: /Begin adaptive lesson/i })).toBeEnabled()
  })

  it('calls onSessionCreated with session data on submit', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      sseResponse([
        'data: {"type":"started","session_id":"abc"}\n\n',
        'data: {"type":"question","session_id":"abc","step":1,"total":null,"text":"What do you see?"}\n\n',
      ]),
    ))

    const onSessionCreated = vi.fn()
    render(<UploadScreen onSessionCreated={onSessionCreated} />)

    const input = screen.getByTestId('file-input')
    const file = new File(['fake'], 'photo.jpg', { type: 'image/jpeg' })
    await userEvent.upload(input, file)
    await userEvent.click(screen.getByRole('button', { name: /Begin adaptive lesson/i }))

    expect(onSessionCreated).toHaveBeenCalledWith(
      expect.objectContaining({ session_id: 'abc', question: 'What do you see?' }),
      expect.stringMatching(/^blob:/),
      expect.any(String),
      expect.any(Number),
    )
  })
})
