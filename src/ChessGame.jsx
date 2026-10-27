import { useState } from 'react'
import { Chess } from 'chess.js'
import { PageHeading } from './Games'

const chessGlyphs = {
  wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
  bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟',
}
const chessNames = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' }

export default function ChessGame() {
  const [chess, setChess] = useState(() => new Chess())
  const [fen, setFen] = useState(chess.fen())
  const [selected, setSelected] = useState(null)
  const [legalSquares, setLegalSquares] = useState([])
  const board = chess.board()
  const status = chess.isCheckmate()
    ? `Checkmate! ${chess.turn() === 'w' ? 'Black' : 'White'} wins.`
    : chess.isDraw()
      ? 'It is a draw. Lovely game!'
      : `${chess.turn() === 'w' ? 'White' : 'Black'} to move${chess.isCheck() ? ' — check!' : ''}`

  const reset = () => {
    const freshGame = new Chess()
    setChess(freshGame)
    setFen(freshGame.fen())
    setSelected(null)
    setLegalSquares([])
  }
  const chooseSquare = (square) => {
    if (chess.isGameOver()) return
    const piece = chess.get(square)
    if (selected && legalSquares.includes(square)) {
      chess.move({ from: selected, to: square, promotion: 'q' })
      setFen(chess.fen())
      setSelected(null)
      setLegalSquares([])
      return
    }
    if (piece?.color === chess.turn()) {
      setSelected(square)
      setLegalSquares(chess.moves({ square, verbose: true }).map((move) => move.to))
    } else {
      setSelected(null)
      setLegalSquares([])
    }
  }

  return <>
    <PageHeading emoji="♟️" title="Chess Together" intro="A proper little two-player chess match. Take turns on the same board; promotion is automatically to a queen." />
    <section className="card game-shell">
      <p className="game-message" role="status" aria-live="polite">{status}</p>
      <div className="chess-board" role="grid" aria-label="Chess board">
        {board.flatMap((row, rowIndex) => row.map((piece, columnIndex) => {
          const square = `${'abcdefgh'[columnIndex]}${8 - rowIndex}`
          const isSelected = selected === square
          const isLegal = legalSquares.includes(square)
          const name = piece ? `${piece.color === 'w' ? 'White' : 'Black'} ${chessNames[piece.type]}` : 'Empty'
          return <button type="button" role="gridcell" key={square} onClick={() => chooseSquare(square)} aria-label={`${name} square ${square}${isLegal ? ', legal move' : ''}`} aria-pressed={isSelected} className={`chess-square ${(rowIndex + columnIndex) % 2 ? 'dark' : 'light'}${isSelected ? ' selected' : ''}${isLegal ? ' legal' : ''}`}>
            {piece && <span className={`chess-piece ${piece.color === 'w' ? 'white-piece' : 'black-piece'}`} aria-hidden="true">{chessGlyphs[`${piece.color}${piece.type}`]}</span>}
          </button>
        }))}
      </div>
      <div className="button-row"><button className="button button-secondary" onClick={reset}>New chess game</button><span className="game-note">Move count: {chess.history().length}</span></div>
      <span className="sr-only" aria-live="polite">{fen}</span>
    </section>
  </>
}
