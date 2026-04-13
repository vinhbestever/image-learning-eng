import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSession, streamSubmitAnswer } from './api'

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

  it('formats FastAPI validation detail arrays', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        detail: [{ type: 'missing', loc: ['body', 'answer'], msg: 'Field required' }],
      }),
    }))

    const file = new File(['fake'], 'test.jpg', { type: 'image/jpeg' })
    await expect(createSession(file)).rejects.toThrow('Field required')
  })
})

describe('streamSubmitAnswer', () => {
  it('POSTs stream URL and invokes onQuestion after deltas', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      sseResponse([
        'data: {"type":"delta","text":"Hi "}\n\n',
        'data: {"type":"question","step":2,"total":5,"text":"Next?"}\n\n',
      ]),
    ))

    const onDelta = vi.fn()
    const onQuestion = vi.fn()
    await streamSubmitAnswer('sid-1', 'answer', {
      onDelta,
      onQuestion,
      onDone: vi.fn(),
      onError: vi.fn(),
    })

    expect(fetch).toHaveBeenCalledWith('/sessions/sid-1/answer/stream', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        Accept: 'text/event-stream',
      }),
      body: JSON.stringify({ answer: 'answer' }),
    }))
    expect(onDelta).toHaveBeenCalled()
    expect(onQuestion).toHaveBeenCalledWith({ step: 2, total: 5, text: 'Next?' })
  })

  it('invokes onDone with evaluation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      sseResponse([
        'data: {"type":"done","step":5,"total":5,"evaluation":"All good."}\n\n',
      ]),
    ))

    const onDone = vi.fn()
    await streamSubmitAnswer('sid', 'x', {
      onDelta: vi.fn(),
      onQuestion: vi.fn(),
      onDone,
      onError: vi.fn(),
    })
    expect(onDone).toHaveBeenCalledWith({ step: 5, total: 5, evaluation: 'All good.' })
  })
})
