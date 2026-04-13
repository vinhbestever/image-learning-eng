import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSession, submitAnswer } from './api'

describe('createSession', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('POSTs to /sessions with FormData and returns SessionResponse', async () => {
    const mockResponse = {
      session_id: 'abc-123',
      step: 1,
      total: 5,
      question: 'What do you see?',
      done: false,
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    }))

    const file = new File(['fake'], 'test.jpg', { type: 'image/jpeg' })
    const result = await createSession(file)

    expect(fetch).toHaveBeenCalledWith('/sessions', expect.objectContaining({
      method: 'POST',
    }))
    expect(result.session_id).toBe('abc-123')
    expect(result.question).toBe('What do you see?')
  })

  it('throws on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ detail: 'Image too large' }),
    }))

    const file = new File(['fake'], 'test.jpg', { type: 'image/jpeg' })
    await expect(createSession(file)).rejects.toThrow('Image too large')
  })
})

describe('submitAnswer', () => {
  it('POSTs to /sessions/{id}/answer with answer body', async () => {
    const mockResponse = {
      session_id: 'abc-123',
      step: 2,
      total: 5,
      question: 'Next question?',
      done: false,
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    }))

    const result = await submitAnswer('abc-123', 'I see a dog.')

    expect(fetch).toHaveBeenCalledWith('/sessions/abc-123/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer: 'I see a dog.' }),
    })
    expect(result.step).toBe(2)
  })
})
