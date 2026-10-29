import { useEffect, useState } from 'react'
import { Chess } from 'chess.js'
import { GameModePicker, PageHeading } from './Games'

const chessGlyphs = {
  wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
  bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟',
}
const chessNames = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' }
const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 }

function evaluatePosition(chess) {
  if (chess.isCheckmate()) return chess.turn() === 'w' ? -100000 : 100000
  if (chess.isDraw()) return 0
  return chess.board().flat().reduce((score, piece) => piece ? score + (piece.color === 'w' ? 1 : -1) * pieceValues[piece.type] : score, 0)
}

function searchPosition(chess, depth, alpha, beta) {
  if (depth === 0 || chess.isGameOver()) return evaluatePosition(chess)
  const maximizing = chess.turn() === 'w'
  let bestScore = maximizing ? -Infinity : Infinity
  for (const move of chess.moves({ verbose: true })) {
    chess.move(move)
    const score = searchPosition(chess, depth - 1, alpha, beta)
    chess.undo()
    if (maximizing) {
      bestScore = Math.max(bestScore, score)
      alpha = Math.max(alpha, bestScore)
    } else {
      bestScore = Math.min(bestScore, score)
      beta = Math.min(beta, bestScore)
    }
    if (beta <= alpha) break
  }
  return bestScore
}

function chooseComputerMove(chess) {
  let bestMove = null
  let bestScore = Infinity
  for (const move of chess.moves({ verbose: true })) {
    chess.move(move)
    const score = searchPosition(chess, 1, -Infinity, bestScore)
    chess.undo()
    if (score < bestScore) { bestScore = score; bestMove = move }
  }
  return bestMove
}

export default function ChessGame() {
  const [chess, setChess] = useState(() => new Chess())
  const [fen, setFen] = useState(chess.fen())
  const [mode, setMode] = useState('friend')
  const [selected, setSelected] = useState(null)
  const [legalSquares, setLegalSquares] = useState([])
  const board = chess.board()
  const status = chess.isCheckmate()
    ? `Checkmate! ${chess.turn() === 'w' ? 'Black' : 'White'} wins.`
    : chess.isDraw()
      ? 'It is a draw. Lovely game!'
      : mode === 'computer' && chess.turn() === 'b'
        ? 'Computer is thinking…'
        : `${chess.turn() === 'w' ? 'White' : 'Black'} to move${chess.isCheck() ? ' — check!' : ''}`

  useEffect(() => {
    if (mode !== 'computer' || chess.turn() !== 'b' || chess.isGameOver()) return undefined
    const timer = window.setTimeout(() => {
      const move = chooseComputerMove(chess)
      if (move) {
        chess.move(move)
        setFen(chess.fen())
        setSelected(null)
        setLegalSquares([])
      }
    }, 250)
    return () => window.clearTimeout(timer)
  }, [chess, fen, mode])

  const reset = () => {
    const freshGame = new Chess()
    setChess(freshGame)
    setFen(freshGame.fen())
    setSelected(null)
    setLegalSquares([])
  }
  const changeMode = (nextMode) => {
    setMode(nextMode)
    reset()
  }
  const chooseSquare = (square) => {
    if (chess.isGameOver() || (mode === 'computer' && chess.turn() === 'b')) return
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
    <PageHeading emoji="♟️" title="Chess Together" intro="Play automatically against the computer or share the board with a friend offline. Promotion is automatically to a queen." />
    <section className="card game-shell">
      <GameModePicker mode={mode} onModeChange={changeMode} />
      <p className="game-message" role="status" aria-live="polite">{status}</p>
      <div className="chess-board" role="grid" aria-label="Chess board">
        {board.flatMap((row, rowIndex) => row.map((piece, columnIndex) => {
          const square = `${'abcdefgh'[columnIndex]}${8 - rowIndex}`
          const isSelected = selected === square
          const isLegal = legalSquares.includes(square)
          const name = piece ? `${piece.color === 'w' ? 'White' : 'Black'} ${chessNames[piece.type]}` : 'Empty'
          return <button type="button" role="gridcell" key={square} onClick={() => chooseSquare(square)} disabled={mode === 'computer' && chess.turn() === 'b'} aria-label={`${name} square ${square}${isLegal ? ', legal move' : ''}`} aria-pressed={isSelected} className={`chess-square ${(rowIndex + columnIndex) % 2 ? 'dark' : 'light'}${isSelected ? ' selected' : ''}${isLegal ? ' legal' : ''}`}>
            {piece && <span className={`chess-piece ${piece.color === 'w' ? 'white-piece' : 'black-piece'}`} aria-hidden="true">{chessGlyphs[`${piece.color}${piece.type}`]}</span>}
          </button>
        }))}
      </div>
      <div className="button-row"><button className="button button-secondary" onClick={reset}>New chess game</button><span className="game-note">Move count: {chess.history().length}</span></div>
      <span className="sr-only" aria-live="polite">{fen}</span>
    </section>
  </>
}
