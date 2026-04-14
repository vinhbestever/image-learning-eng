import type { SessionResponse } from './types'

/** Normalize API JSON so `total` is never `undefined` (adaptive sessions use `null`). */
export function normalizeSessionResponse(data: Record<string, unknown>): SessionResponse {
  const totalRaw = data.total
  return {
    session_id: String(data.session_id),
    step: Number(data.step),
    total: totalRaw === undefined || totalRaw === null ? null : Number(totalRaw),
    question: data.question != null ? String(data.question) : undefined,
    choices: Array.isArray(data.choices) ? (data.choices as string[]) : undefined,
    evaluation: data.evaluation != null ? String(data.evaluation) : undefined,
    done: Boolean(data.done),
  }
}
