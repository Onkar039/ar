import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BallBounce, MemoryMatch, SnakeGame, TicTacToe } from './Games'
import ChessGame from './ChessGame'

describe('the new games', () => {
  it('lets two players complete a tic-tac-toe round', () => {
    render(<TicTacToe />)
    for (const square of [1, 4, 2, 5, 3]) {
      fireEvent.click(screen.getByRole('gridcell', { name: `Square ${square}, empty` }))
    }
    expect(screen.getByRole('status')).toHaveTextContent('X wins')
  })

  it('lets the computer play tic-tac-toe automatically', async () => {
    render(<TicTacToe />)
    fireEvent.click(screen.getByRole('button', { name: 'Automatic · Play with computer' }))
    fireEvent.click(screen.getByRole('gridcell', { name: 'Square 1, empty' }))
    expect(await screen.findByRole('gridcell', { name: 'Square 5, O' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent("Player 1's turn (X)")
  })

  it('starts the snake game with touch controls available', () => {
    render(<SnakeGame />)
    expect(screen.getByRole('group', { name: 'Snake speed' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Fast' }))
    expect(screen.getByRole('button', { name: 'Fast' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: /Start game/ }))
    expect(screen.getByRole('grid', { name: 'Snake game board' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Move up' }))
    expect(screen.getByText('Score')).toBeInTheDocument()
  })

  it('plays a chess move automatically against the computer', async () => {
    render(<ChessGame />)
    fireEvent.click(screen.getByRole('button', { name: 'Automatic · Play with computer' }))
    fireEvent.click(screen.getByRole('gridcell', { name: 'White pawn square e2' }))
    fireEvent.click(screen.getByRole('gridcell', { name: /Empty square e4/ }))
    await waitFor(() => expect(screen.getByText('Move count: 2')).toBeInTheDocument())
    expect(screen.getByRole('status')).toHaveTextContent('White to move')
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
