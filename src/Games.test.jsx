import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BallBounce, MemoryMatch, SnakeGame, TicTacToe } from './Games'

describe('the new games', () => {
  it('lets two players complete a tic-tac-toe round', () => {
    render(<TicTacToe />)
    for (const square of [1, 4, 2, 5, 3]) {
      fireEvent.click(screen.getByRole('gridcell', { name: `Square ${square}, empty` }))
    }
    expect(screen.getByRole('status')).toHaveTextContent('X wins')
  })

  it('starts the snake game with touch controls available', () => {
    render(<SnakeGame />)
    fireEvent.click(screen.getByRole('button', { name: /Start game/ }))
    expect(screen.getByRole('grid', { name: 'Snake game board' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Move up' }))
    expect(screen.getByText('Score')).toBeInTheDocument()
  })

  it('starts the ball game and counts a catch', () => {
    render(<BallBounce />)
    fireEvent.click(screen.getByRole('button', { name: /Start catching/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Catch the ball' }))
    expect(screen.getByText('Catches').parentElement).toHaveTextContent(/Catches\s+1/)
  })

  it('counts attempts in the memory matching game', async () => {
    render(<MemoryMatch />)
    fireEvent.click(screen.getByRole('gridcell', { name: 'Card 1: face down' }))
    fireEvent.click(screen.getByRole('gridcell', { name: 'Card 2: face down' }))
    await waitFor(() => expect(screen.getByText(/· 1 turns/)).toBeInTheDocument())
  })
})
