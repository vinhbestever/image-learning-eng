import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UploadScreen from './UploadScreen'

describe('UploadScreen', () => {
  it('renders upload prompt and disabled button', () => {
    render(<UploadScreen onSessionCreated={vi.fn()} />)
    expect(screen.getByText(/Learn English with Images/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Start Session/i })).toBeDisabled()
  })

  it('enables Start Session button after file is selected', async () => {
    render(<UploadScreen onSessionCreated={vi.fn()} />)
    const input = screen.getByTestId('file-input')
    const file = new File(['fake'], 'photo.jpg', { type: 'image/jpeg' })

    await userEvent.upload(input, file)

    expect(screen.getByRole('button', { name: /Start Session/i })).toBeEnabled()
  })

  it('calls onSessionCreated with session data on submit', async () => {
    const mockSession = {
      session_id: 'abc',
      step: 1,
      total: 5,
      question: 'What do you see?',
      done: false,
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSession,
    }))

    const onSessionCreated = vi.fn()
    render(<UploadScreen onSessionCreated={onSessionCreated} />)

    const input = screen.getByTestId('file-input')
    const file = new File(['fake'], 'photo.jpg', { type: 'image/jpeg' })
    await userEvent.upload(input, file)
    await userEvent.click(screen.getByRole('button', { name: /Start Session/i }))

    expect(onSessionCreated).toHaveBeenCalledWith(mockSession, file)
  })
})
