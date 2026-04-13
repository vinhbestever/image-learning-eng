import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EvaluationScreen from './EvaluationScreen'

describe('EvaluationScreen', () => {
  it('renders evaluation feedback text', () => {
    render(<EvaluationScreen evaluation="Great job!" onRetry={vi.fn()} />)
    expect(screen.getByText('Great job!')).toBeInTheDocument()
  })

  it('calls onRetry when button is clicked', async () => {
    const onRetry = vi.fn()
    render(<EvaluationScreen evaluation="Well done!" onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: /Try another image/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
