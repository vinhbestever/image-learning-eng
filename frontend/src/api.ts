import type { SessionResponse } from './types'

export async function createSession(image: File): Promise<SessionResponse> {
  const formData = new FormData()
  formData.append('image', image)

  const res = await fetch('/sessions', { method: 'POST', body: formData })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail ?? 'Failed to create session')
  return data as SessionResponse
}

export async function submitAnswer(
  sessionId: string,
  answer: string
): Promise<SessionResponse> {
  const res = await fetch(`/sessions/${sessionId}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answer }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail ?? 'Failed to submit answer')
  return data as SessionResponse
}
