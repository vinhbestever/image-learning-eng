import type { SessionResponse } from './types'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

function formatErrorDetail(data: unknown): string {
  if (data === null || typeof data !== 'object') return 'Request failed'
  const detail = (data as { detail?: unknown }).detail
  if (detail === undefined || detail === null) return 'Request failed'
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (item && typeof item === 'object' && 'msg' in item) {
          return String((item as { msg: unknown }).msg)
        }
        try {
          return JSON.stringify(item)
        } catch {
          return String(item)
        }
      })
      .join('; ')
  }
  return String(detail)
}

export async function createSession(image: File): Promise<SessionResponse> {
  const formData = new FormData()
  formData.append('image', image)

  const res = await fetch(`${API_BASE}/sessions`, { method: 'POST', body: formData })
  const data = await res.json()
  if (!res.ok) throw new Error(formatErrorDetail(data))
  return data as SessionResponse
}

export type StreamHandlers = {
  onDelta: (text: string) => void
  onQuestion: (payload: { step: number; total: number; text: string }) => void
  onDone: (payload: { step: number; total: number; evaluation: string }) => void
  onError: (message: string) => void
}

/** POST /sessions/:id/answer/stream — SSE: delta | question | done | error */
export async function streamSubmitAnswer(
  sessionId: string,
  answer: string,
  handlers: StreamHandlers
): Promise<void> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/answer/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ answer }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(formatErrorDetail(data))
  }

  await consumeSse(res, (ev) => {
    if (ev.type === 'delta' && ev.text) handlers.onDelta(ev.text)
    else if (ev.type === 'question' && ev.text != null && ev.step != null && ev.total != null) {
      handlers.onQuestion({ step: ev.step, total: ev.total, text: ev.text })
    } else if (ev.type === 'done' && ev.evaluation != null && ev.step != null && ev.total != null) {
      handlers.onDone({ step: ev.step, total: ev.total, evaluation: ev.evaluation })
    } else if (ev.type === 'error' && ev.message) handlers.onError(ev.message)
  })
}

export type CreateSessionStreamHandlers = {
  onDelta: (text: string) => void
  onQuestion: (payload: { sessionId: string; step: number; total: number; text: string }) => void
  onError: (message: string) => void
}

/** POST /sessions/stream — SSE: started | delta | question | error */
export async function streamCreateSession(
  image: File,
  handlers: CreateSessionStreamHandlers
): Promise<void> {
  const formData = new FormData()
  formData.append('image', image)

  const res = await fetch(`${API_BASE}/sessions/stream`, { method: 'POST', body: formData })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(formatErrorDetail(data))
  }

  await consumeSse(res, (ev) => {
    if (ev.type === 'delta' && ev.text) handlers.onDelta(ev.text)
    else if (ev.type === 'question' && ev.session_id && ev.text != null && ev.step != null && ev.total != null) {
      handlers.onQuestion({ sessionId: ev.session_id, step: ev.step, total: ev.total, text: ev.text })
    } else if (ev.type === 'error' && ev.message) handlers.onError(ev.message)
    // 'started' event is informational only; session_id comes with 'question'
  })
}

// ─── Shared SSE reader ────────────────────────────────────────────────────────

type SseEvent = Record<string, unknown>

async function consumeSse(res: Response, onEvent: (ev: SseEvent) => void): Promise<void> {
  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  const processLine = (line: string) => {
    if (!line.startsWith('data:')) return
    const raw = line.slice(5).trim()
    if (!raw) return
    try {
      onEvent(JSON.parse(raw) as SseEvent)
    } catch {
      // malformed JSON — skip
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) processLine(line.replace(/\r$/, ''))
  }
  if (buffer.trim()) {
    for (const line of buffer.split('\n')) processLine(line.replace(/\r$/, ''))
  }
}
