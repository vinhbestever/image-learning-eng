import { describe, it, expect } from 'vitest'
import { normalizeSessionResponse } from './sessionResponse'

describe('normalizeSessionResponse', () => {
  it('maps null and missing total to null', () => {
    expect(
      normalizeSessionResponse({
        session_id: 'a',
        step: 1,
        total: null,
        done: false,
      }).total,
    ).toBeNull()
    expect(
      normalizeSessionResponse({
        session_id: 'b',
        step: 2,
        done: false,
      }).total,
    ).toBeNull()
  })

  it('preserves numeric total for fixed-length sessions', () => {
    expect(
      normalizeSessionResponse({
        session_id: 'c',
        step: 3,
        total: 10,
        done: false,
      }).total,
    ).toBe(10)
  })
})
