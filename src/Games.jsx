import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDown, ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUp, Pause, Play, RotateCw, Sparkles } from 'lucide-react'
import { createBoard, collides, findMazePath, generateWordSearch, lockPiece, makePiece, rotate } from './gameEngines'
import { storage } from './storage'

const gameInfo = [
  { to: '/games/block-puzzle', emoji: '🧩', title: 'Little Blocks of Happiness', text: 'Stack colorful shapes, clear rows, and take it one piece at a time.' },
  { to: '/games/word-search', emoji: '💗', title: 'Find Our Favorite Names', text: 'A cozy word search with nine special names hidden in the grid.' },
  { to: '/games/maze', emoji: '🌷', title: 'Find Your Way Home', text: 'Follow a winding path through three gentle little mazes.' },
  { to: '/games/chess', emoji: '♟️', title: 'Chess Together', text: 'A thoughtful two-player chess match, with all the classic rules.' },
  { to: '/games/snake', emoji: '🐍', title: 'Little Snake', text: 'Guide a cheerful snake, collect berries, and try to beat your best.' },
  { to: '/games/ball-bounce', emoji: '🏀', title: 'Catch the Bouncy Ball', text: 'Tap the bouncing ball as many times as you can before time runs out.' },
  { to: '/games/tic-tac-toe', emoji: '⭕', title: 'Tic-Tac-Toe', text: 'A quick little face-off for two players sharing one screen.' },
  { to: '/games/memory-match', emoji: '🃏', title: 'Memory Match', text: 'Flip the cards and find all the matching pairs.' },
]

export function GamesHub() {
  return <><PageHeading emoji="🎮" title="A little play break" intro="Choose a small game, take your time, and enjoy the journey. No rush, no pressure." /><div className="game-grid">{gameInfo.map((game) => <motion.article whileHover={{ y: -5 }} className="card game-card" key={game.to}><span className="game-emoji" aria-hidden="true">{game.emoji}</span><h2>{game.title}</h2><p>{game.text}</p><Link className="button button-primary" to={game.to}>Play a little <ArrowRight size={17} /></Link></motion.article>)}</div></>
}

export function PageHeading({ emoji, title, intro }) {
  return <header className="page-heading"><span className="eyebrow">{emoji} A LITTLE PAUSE</span><h1>{title}</h1>{intro && <p>{intro}</p>}</header>
}

function GameShell({ title, intro, children }) {
  return <><PageHeading emoji="🌸" title={title} intro={intro} /><section className="card game-shell">{children}</section></>
}

export function BlockPuzzle({ content }) {
  const [board, setBoard] = useState(() => createBoard())
  const [piece, setPiece] = useState(null)
  const [next, setNext] = useState(() => makePiece())
  const [score, setScore] = useState(0)
  const [lines, setLines] = useState(0)
  const [best, setBest] = useState(() => storage.get('arati.blocks.best', 0))
  const [status, setStatus] = useState('ready')
  const [celebrated, setCelebrated] = useState(false)
  const boardRef = useRef(board)
  const pieceRef = useRef(piece)
  useLayoutEffect(() => { boardRef.current = board; pieceRef.current = piece }, [board, piece])

  const spawn = useCallback((currentBoard, queued = next) => {
    const incoming = { ...queued, y: 0, x: Math.floor((10 - queued.shape[0].length) / 2) }
    const upcoming = makePiece()
    setNext(upcoming)
    if (collides(currentBoard, incoming)) { setPiece(null); setStatus('over'); return false }
    setPiece(incoming)
    return true
  }, [next])

  const start = () => {
    const fresh = createBoard()
    setBoard(fresh); setScore(0); setLines(0); setCelebrated(false)
    setStatus('playing')
    spawn(fresh, makePiece())
  }
  const move = useCallback((dx, dy = 0) => {
    const current = pieceRef.current, currentBoard = boardRef.current
    if (!current || status !== 'playing') return false
    const candidate = { ...current, x: current.x + dx, y: current.y + dy }
    if (collides(currentBoard, candidate)) return false
    setPiece(candidate)
    return true
  }, [status])
  const lockAndSpawn = useCallback(() => {
    const current = pieceRef.current
    if (!current) return
    const locked = lockPiece(boardRef.current, current)
    setBoard(locked.board)
    if (locked.cleared) {
      setLines((count) => count + locked.cleared)
      setScore((value) => {
        const result = value + [0, 100, 300, 500, 800][locked.cleared] * 10
        if (result > best) { setBest(result); storage.set('arati.blocks.best', result) }
        const milestones = content.blockSettings?.milestones || [500]
        if (milestones.some((milestone) => Number.isFinite(milestone) && milestone > 0 && result >= milestone) && !celebrated) { setCelebrated(true); window.setTimeout(() => setCelebrated(false), 3000) }
        return result
      })
    }
    spawn(locked.board)
  }, [best, celebrated, content.blockSettings?.milestones, spawn])
  useEffect(() => {
    if (!celebrated) return undefined
    const timer = window.setTimeout(() => setCelebrated(false), 3000)
    return () => window.clearTimeout(timer)
  }, [celebrated])
  const stepDown = useCallback(() => {
    const current = pieceRef.current
    if (!current || status !== 'playing') return
    if (!move(0, 1)) lockAndSpawn()
  }, [lockAndSpawn, move, status])
  const hardDrop = useCallback(() => {
    const current = pieceRef.current
    if (!current || status !== 'playing') return
    let landed = current
    while (!collides(boardRef.current, landed, landed.x, landed.y + 1)) landed = { ...landed, y: landed.y + 1 }
    setPiece(landed)
    pieceRef.current = landed
    lockAndSpawn()
  }, [lockAndSpawn, status])
  const turn = useCallback(() => {
    const current = pieceRef.current
    if (!current || status !== 'playing') return
    const shape = rotate(current.shape)
    const candidate = { ...current, shape }
    if (!collides(boardRef.current, candidate)) setPiece(candidate)
  }, [status])
  useEffect(() => {
    if (status !== 'playing') return undefined
    const timer = window.setInterval(stepDown, Math.max(180, 750 - Math.floor(lines / 5) * 50))
    return () => window.clearInterval(timer)
  }, [lines, status, stepDown])
  useEffect(() => {
    const keydown = (event) => {
      if (status !== 'playing') return
      const actions = { ArrowLeft: () => move(-1), ArrowRight: () => move(1), ArrowDown: () => { if (move(0, 1)) setScore((v) => v + 1) }, ArrowUp: turn, ' ': hardDrop }
      if (actions[event.key]) { event.preventDefault(); actions[event.key]() }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [hardDrop, move, status, turn])
  const cells = useMemo(() => {
    const result = board.map((row) => [...row])
    if (piece) piece.shape.forEach((row, y) => row.forEach((value, x) => {
      if (value && piece.y + y >= 0 && piece.y + y < result.length && piece.x + x < result[0].length) result[piece.y + y][piece.x + x] = piece.color
    }))
    return result
  }, [board, piece])

  return <GameShell title={`${content.blockSettings?.title || 'Little Blocks of Happiness'} 🧩`} intro={`${content.blockSettings?.instructions || 'Move pieces to clear rows.'} Controls: ← → to move, ↑ to rotate, ↓ to soft drop, Space to hard drop.`}><div className="game-stats"><span>Score <b>{score}</b></span><span>Lines <b>{lines}</b></span><span>Best <b>{best}</b></span></div><div className="block-layout"><div className="block-board" role="grid" aria-label="Falling block game board">{cells.map((row, y) => row.map((cell, x) => <span role="gridcell" className={`block-cell color-${cell || 0}`} key={`${y}-${x}`} />))}</div><aside className="next-piece"><h2>Next</h2><div className="piece-preview">{next.shape.map((row, y) => row.map((cell, x) => <span className={`block-cell color-${cell ? next.color : 0}`} key={`${y}-${x}`} />))}</div><p>Best score: {best}</p><p>Each cleared row gives you 1,000 points.</p><div className="button-column">{status === 'ready' || status === 'over' ? <button className="button button-primary" onClick={start}>{status === 'over' ? 'Play again' : 'Start game'} <Play size={16} /></button> : <><button className="button button-secondary" onClick={() => setStatus(status === 'playing' ? 'paused' : 'playing')}>{status === 'playing' ? 'Pause' : 'Resume'} {status === 'playing' ? <Pause size={16} /> : <Play size={16} />}</button><button className="button button-quiet" onClick={start}>Restart</button></>}</div></aside></div>{status === 'over' && <p className="game-message" role="status">Game over. You collected {score} points—thanks for playing! 🌷</p>}{status === 'paused' && <p className="game-message">Paused. Take all the time you need.</p>}{celebrated && <Celebration message="Lovely! Look at those lines go! ✨" />}<div className="touch-controls" aria-label="Touch game controls"><button aria-label="Move left" onClick={() => move(-1)}><ArrowLeft /></button><button aria-label="Rotate" onClick={turn}><RotateCw /></button><button aria-label="Move right" onClick={() => move(1)}><ArrowRight /></button><button aria-label="Soft drop" onClick={stepDown}><ArrowDown /></button><button aria-label="Hard drop" onClick={hardDrop}><ArrowDownToLine /></button></div></GameShell>
}

export function WordSearch({ config }) {
  const signature = JSON.stringify(config)
  const [puzzle, setPuzzle] = useState(() => {
    const saved = storage.get('arati.word.puzzle')
    return saved?.signature === signature ? saved.puzzle : generatePuzzle(config)
  })
  const [found, setFound] = useState(() => {
    const saved = storage.get('arati.word.puzzle')
    return saved?.signature === signature ? (storage.get('arati.word.found', []).filter((word) => config.words.includes(word))) : []
  })
  const [origin, setOrigin] = useState(null)
  const [message, setMessage] = useState('')
  const [hint, setHint] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  function generatePuzzle(options) { return generateWordSearch(options.words, options.size) }
  useEffect(() => {
    storage.set('arati.word.found', found)
    storage.set('arati.word.puzzle', { signature, puzzle })
  }, [found, puzzle, signature])
  const restart = () => {
    setPuzzle(generatePuzzle(config)); setFound([]); setOrigin(null); setHint(''); setMessage('')
    storage.set('arati.word.found', [])
    storage.remove('arati.word.puzzle')
    setConfirmReset(false)
  }
  const chooseCell = (cell) => {
    if (!origin) { setOrigin(cell); setMessage('Now choose the last letter of the name.'); return }
    const [r1, c1] = origin, [r2, c2] = cell, dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1)
    const length = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1)) + 1
    if (r1 !== r2 && c1 !== c2 && Math.abs(r2 - r1) !== Math.abs(c2 - c1)) { setMessage('Choose a straight line: across, down, or diagonal.'); setOrigin(null); return }
    const selected = Array.from({ length }, (_, i) => puzzle.grid[r1 + dr * i]?.[c1 + dc * i] || '').join('')
    const match = config.words.find((word) => word.toUpperCase() === selected || word.toUpperCase() === [...selected].reverse().join(''))
    if (match && !found.includes(match.toUpperCase())) {
      const name = match.toUpperCase()
      const all = [...found, name]
      setFound(all); setMessage(`Found ${name}! Lovely spotting. ✨`); setHint('')
    } else setMessage(match ? `${match.toUpperCase()} is already collected. 💗` : 'Not a name this time—try another line.')
    setOrigin(null)
  }
  const giveHint = () => {
    const remaining = config.words.find((word) => !found.includes(word.toUpperCase()))
    if (!remaining) { setHint('Every name has been found!'); return }
    const start = puzzle.placements[remaining.toUpperCase()]?.[0]
    setHint(`${config.hint || 'Find the next name.'} ${remaining.toUpperCase()} begins near row ${(start?.[0] ?? 0) + 1}, column ${(start?.[1] ?? 0) + 1}.`)
  }
  const done = found.length === config.words.length
  const foundCells = new Set(found.flatMap((word) => puzzle.placements[word] || []).map(([row, col]) => `${row},${col}`))
  return <GameShell title="Find Our Favorite Names 💗" intro="Choose the first and last letter of a name in a straight line. Names can go across, down, or diagonally."><p className="game-counter" aria-live="polite">Names collected: {found.length} / 9 💗</p><div className="word-grid" style={{ '--grid-size': puzzle.grid.length }} role="grid" aria-label="Word search puzzle">{puzzle.grid.map((row, r) => row.map((letter, c) => { const matched = foundCells.has(`${r},${c}`); const selected = origin?.[0] === r && origin?.[1] === c; return <button type="button" role="gridcell" key={`${r}-${c}`} onClick={() => chooseCell([r, c])} className={`word-cell${matched ? ' word-found' : ''}${selected ? ' selected' : ''}`} aria-label={`Row ${r + 1}, column ${c + 1}, ${letter}${matched ? ', found' : ''}`}>{letter}</button> }))}</div><div className="word-bank"><h2>Find these names</h2>{config.words.map((word) => <span className={found.includes(word.toUpperCase()) ? 'word-chip found' : 'word-chip'} key={word}>{word.toUpperCase()} {found.includes(word.toUpperCase()) && '✓'}</span>)}</div>{message && <p className="game-message" role="status">{message}</p>}{hint && <p className="hint-message">{hint}</p>}{done && <Celebration message="You found all our special names! You're amazing, Arati! 🎉" />}<div className="button-row"><button className="button button-secondary" onClick={giveHint}>A little hint ✨</button>{confirmReset ? <><span>Start a fresh puzzle?</span><button className="button button-primary" onClick={restart}>Yes, restart</button><button className="button button-quiet" onClick={() => setConfirmReset(false)}>Keep going</button></> : <button className="button button-quiet" onClick={() => found.length ? setConfirmReset(true) : restart()}>Restart puzzle</button>}</div></GameShell>
}

export function Maze({ levels }) {
  const [levelIndex, setLevelIndex] = useState(() => Math.min(storage.get('arati.maze.level', 0), levels.length - 1))
  const level = levels[Math.min(levelIndex, levels.length - 1)]
  const [position, setPosition] = useState(level?.start || [0, 0])
  const [moves, setMoves] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [complete, setComplete] = useState(false)
  const [showHint, setShowHint] = useState(false)
  useEffect(() => {
    if (complete) return undefined
    const timer = window.setInterval(() => setSeconds((time) => time + 1), 1000)
    return () => window.clearInterval(timer)
  }, [complete, levelIndex])
  const move = useCallback((dx, dy) => {
    if (!level || complete) return
    const next = [position[0] + dx, position[1] + dy]
    if (next[0] < 0 || next[0] >= level.width || next[1] < 0 || next[1] >= level.height) return
    if (level.walls.some(([x, y]) => x === next[0] && y === next[1])) return
    setPosition(next); setMoves((count) => count + 1)
    if (next[0] === level.end[0] && next[1] === level.end[1]) {
      setComplete(true)
      storage.set('arati.maze.level', Math.min(Math.max(levelIndex + 1, storage.get('arati.maze.level', 0)), levels.length - 1))
    }
  }, [complete, level, levelIndex, levels.length, position])
  useEffect(() => {
    const keydown = (event) => {
      const keys = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
      if (keys[event.key]) { event.preventDefault(); move(...keys[event.key]) }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [move])
  const restart = () => { setPosition(level.start); setMoves(0); setSeconds(0); setComplete(false) }
  const nextLevel = () => {
    const next = Math.min(levelIndex + 1, levels.length - 1)
    setPosition(levels[next].start); setMoves(0); setSeconds(0); setComplete(false); setShowHint(false)
    setLevelIndex(next); storage.set('arati.maze.level', next)
  }
  if (!level) return <GameShell title="Find Your Way Home 🌷" intro="No maze levels are available right now." />
  const solution = findMazePath(level) || []
  return <GameShell title="Find Your Way Home 🌷" intro="Use the arrow keys or the buttons below to find a way to the little flower."><div className="game-stats"><span>Level <b>{levelIndex + 1} / {levels.length}</b></span><span>Moves <b>{moves}</b></span><span>Time <b>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</b></span></div><div className="maze-title"><h2>{level.name}</h2><span className="difficulty">{level.difficulty}</span></div><div className="maze-board" style={{ '--maze-columns': level.width }} role="grid" aria-label={`${level.name} maze`}>{Array.from({ length: level.height }, (_, y) => Array.from({ length: level.width }, (_, x) => { const isStart = level.start[0] === x && level.start[1] === y, isEnd = level.end[0] === x && level.end[1] === y, wall = level.walls.some(([wx, wy]) => wx === x && wy === y), here = position[0] === x && position[1] === y, path = showHint && solution.some(([px, py]) => px === x && py === y); return <span role="gridcell" key={`${x}-${y}`} className={`maze-cell${wall ? ' wall' : ''}${isStart ? ' start' : ''}${isEnd ? ' finish' : ''}${here ? ' player' : ''}${path ? ' path' : ''}`} aria-label={wall ? 'Wall' : isStart ? 'Start' : isEnd ? 'Finish' : here ? 'You are here' : 'Open path'}>{here ? '🌷' : isStart ? 'S' : isEnd ? '✿' : ''}</span> }))}</div><div className="direction-pad" aria-label="Maze movement controls"><span /><button aria-label="Move up" onClick={() => move(0, -1)}><ArrowUp /></button><span /><button aria-label="Move left" onClick={() => move(-1, 0)}><ArrowLeft /></button><button aria-label="Move down" onClick={() => move(0, 1)}><ArrowDown /></button><button aria-label="Move right" onClick={() => move(1, 0)}><ArrowRight /></button></div><div className="button-row"><button className="button button-secondary" onClick={() => setShowHint((value) => !value)}>{showHint ? 'Hide path' : 'Show a gentle hint'}</button><button className="button button-quiet" onClick={restart}>Restart level</button>{complete && levelIndex < levels.length - 1 && <button className="button button-primary" onClick={nextLevel}>Next level →</button>}</div>{showHint && <p className="hint-message">{level.hint || 'Follow the highlighted path.'}</p>}{complete && <Celebration message="You found your way home! Lovely work! 🎉" />}</GameShell>
}

export function Celebration({ message }) {
  return <AnimatePresence><motion.div className="celebration" role="status" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><Sparkles size={19} /> {message} <Sparkles size={19} /></motion.div></AnimatePresence>
}

const snakeStart = () => ({ body: [[5, 6], [4, 6], [3, 6]], direction: [1, 0], food: [9, 6] })

export function SnakeGame() {
  const [game, setGame] = useState(snakeStart)
  const [playing, setPlaying] = useState(false)
  const [over, setOver] = useState(false)
  const [best, setBest] = useState(() => storage.get('arati.snake.best', 0))
  const directionRef = useRef(game.direction)
  const score = game.body.length - 3
  const changeDirection = useCallback((direction) => {
    const current = directionRef.current
    if (direction[0] !== -current[0] || direction[1] !== -current[1]) {
      directionRef.current = direction
      setGame((state) => ({ ...state, direction }))
    }
  }, [])
  const restart = () => {
    const fresh = snakeStart()
    directionRef.current = fresh.direction
    setGame(fresh)
    setOver(false)
    setPlaying(true)
  }
  useEffect(() => {
    if (!playing) return undefined
    const onKeyDown = (event) => {
      const direction = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[event.key]
      if (direction) { event.preventDefault(); changeDirection(direction) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [changeDirection, playing])
  useEffect(() => {
    if (!playing) return undefined
    const timer = window.setInterval(() => {
      setGame((state) => {
        const direction = directionRef.current
        const head = [state.body[0][0] + direction[0], state.body[0][1] + direction[1]]
        const eating = head[0] === state.food[0] && head[1] === state.food[1]
        const collisionBody = eating ? state.body : state.body.slice(0, -1)
        if (head[0] < 0 || head[0] >= 12 || head[1] < 0 || head[1] >= 12 || collisionBody.some(([x, y]) => x === head[0] && y === head[1])) {
          setPlaying(false)
          setOver(true)
          return state
        }
        const body = [head, ...state.body.slice(0, eating ? undefined : -1)]
        if (eating) {
          const nextBest = Math.max(best, body.length - 3)
          if (nextBest > best) { setBest(nextBest); storage.set('arati.snake.best', nextBest) }
          let food
          do { food = [Math.floor(Math.random() * 12), Math.floor(Math.random() * 12)] } while (body.some(([x, y]) => x === food[0] && y === food[1]))
          return { ...state, body, food }
        }
        return { ...state, body }
      })
    }, 190)
    return () => window.clearInterval(timer)
  }, [best, playing])
  return <GameShell title="Little Snake 🐍" intro="Collect the berries without bumping into the walls or your tail. Use arrow keys or the buttons.">
    <div className="game-stats"><span>Score <b>{score}</b></span><span>Best <b>{best}</b></span></div>
    <div className="snake-board" role="grid" aria-label="Snake game board">
      {Array.from({ length: 144 }, (_, index) => {
        const x = index % 12, y = Math.floor(index / 12)
        const isHead = game.body[0][0] === x && game.body[0][1] === y
        const isBody = game.body.slice(1).some(([bx, by]) => bx === x && by === y)
        const isFood = game.food[0] === x && game.food[1] === y
        return <span role="gridcell" key={index} aria-label={isHead ? 'Snake head' : isBody ? 'Snake body' : isFood ? 'Berry' : 'Empty'} className={`snake-cell${isHead ? ' head' : isBody ? ' body' : ''}${isFood ? ' food' : ''}`}>{isHead ? '●' : isFood ? '♥' : ''}</span>
      })}
    </div>
    <DirectionPad onMove={changeDirection} label="Snake movement controls" />
    <div className="button-row"><button className="button button-primary" onClick={restart}>{over ? 'Play again' : playing ? 'Restart game' : 'Start game'} <Play size={16} /></button></div>
    {over && <p className="game-message" role="status">Game over — you collected {score} {score === 1 ? 'berry' : 'berries'}! 🌷</p>}
  </GameShell>
}

function DirectionPad({ onMove, label }) {
  return <div className="direction-pad" aria-label={label}><span /><button aria-label="Move up" onClick={() => onMove([0, -1])}><ArrowUp /></button><span /><button aria-label="Move left" onClick={() => onMove([-1, 0])}><ArrowLeft /></button><button aria-label="Move down" onClick={() => onMove([0, 1])}><ArrowDown /></button><button aria-label="Move right" onClick={() => onMove([1, 0])}><ArrowRight /></button></div>
}

export function BallBounce() {
  const [position, setPosition] = useState({ x: 45, y: 48 })
  const [score, setScore] = useState(0)
  const [time, setTime] = useState(20)
  const [playing, setPlaying] = useState(false)
  const [best, setBest] = useState(() => storage.get('arati.ball.best', 0))
  const start = () => { setPosition({ x: 45, y: 48 }); setScore(0); setTime(20); setPlaying(true) }
  useEffect(() => {
    if (!playing) return undefined
    const timer = window.setInterval(() => setTime((remaining) => {
      if (remaining <= 1) { setPlaying(false); return 0 }
      return remaining - 1
    }), 1000)
    return () => window.clearInterval(timer)
  }, [playing])
  useEffect(() => {
    if (!playing) return undefined
    const timer = window.setInterval(() => setPosition({ x: 8 + Math.random() * 84, y: 10 + Math.random() * 78 }), 750)
    return () => window.clearInterval(timer)
  }, [playing])
  const catchBall = () => {
    if (!playing) return
    setScore((value) => {
      const next = value + 1
      if (next > best) { setBest(next); storage.set('arati.ball.best', next) }
      return next
    })
    setPosition({ x: 8 + Math.random() * 84, y: 10 + Math.random() * 78 })
  }
  return <GameShell title="Catch the Bouncy Ball 🏀" intro="Catch as many bounces as you can in 20 seconds. Ready, set, tap!">
    <div className="game-stats"><span>Catches <b>{score}</b></span><span>Time <b>{time}s</b></span><span>Best <b>{best}</b></span></div>
    <div className="ball-arena" aria-label="Bouncy ball game area">
      {playing && <button type="button" className="bouncy-ball" style={{ left: `${position.x}%`, top: `${position.y}%` }} onClick={catchBall} aria-label="Catch the ball" />}
      {!playing && <div className="ball-prompt"><p>{time === 0 ? `Time's up! You caught the ball ${score} times.` : 'A tiny bouncy-ball break?'}</p><button className="button button-primary" onClick={start}>{time === 0 ? 'Play again' : 'Start catching'} <Play size={16} /></button></div>}
    </div>
  </GameShell>
}

const ticTacToeWins = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]]

export function TicTacToe() {
  const [squares, setSquares] = useState(Array(9).fill(null))
  const winner = ticTacToeWins.map((line) => line.every((index) => squares[index] && squares[index] === squares[line[0]]) ? squares[line[0]] : null).find(Boolean)
  const turn = squares.filter(Boolean).length % 2 === 0 ? 'X' : 'O'
  const message = winner ? `${winner} wins! Nicely played!` : squares.every(Boolean) ? 'A draw! Play another round?' : `${turn === 'X' ? 'Player 1' : 'Player 2'}'s turn (${turn})`
  const play = (index) => {
    if (squares[index] || winner) return
    const next = [...squares]
    next[index] = turn
    setSquares(next)
  }
  return <GameShell title="Tic-Tac-Toe ⭕" intro="A tiny two-player classic. Take turns choosing a square on the same screen.">
    <p className="game-message" role="status" aria-live="polite">{message}</p>
    <div className="tic-board" role="grid" aria-label="Tic-tac-toe board">{squares.map((mark, index) => <button key={index} type="button" role="gridcell" className={`tic-square${mark ? ` mark-${mark.toLowerCase()}` : ''}`} onClick={() => play(index)} aria-label={`Square ${index + 1}${mark ? `, ${mark}` : ', empty'}`} disabled={Boolean(mark) || Boolean(winner)}>{mark}</button>)}</div>
    <div className="button-row"><button className="button button-secondary" onClick={() => setSquares(Array(9).fill(null))}>New round</button></div>
  </GameShell>
}

const memoryFaces = ['🌷', '⭐', '🍓', '🦋', '🌙', '🍰']
function shuffledCards() {
  return [...memoryFaces, ...memoryFaces].map((face, index) => ({ id: index, face })).sort(() => Math.random() - 0.5)
}

export function MemoryMatch() {
  const [cards, setCards] = useState(shuffledCards)
  const [flipped, setFlipped] = useState([])
  const [matched, setMatched] = useState([])
  const [moves, setMoves] = useState(0)
  const locked = useRef(false)
  const mismatchTimer = useRef(null)
  useEffect(() => () => window.clearTimeout(mismatchTimer.current), [])
  const reveal = (index) => {
    if (locked.current || flipped.includes(index) || matched.includes(cards[index].face)) return
    if (flipped.length === 1) {
      const firstIndex = flipped[0]
      setMoves((value) => value + 1)
      if (cards[firstIndex].face === cards[index].face) {
        setMatched((value) => [...value, cards[index].face])
        setFlipped([])
      } else {
        locked.current = true
        setFlipped([firstIndex, index])
        mismatchTimer.current = window.setTimeout(() => { setFlipped([]); locked.current = false }, 850)
      }
      return
    }
    setFlipped([index])
  }
  const restart = () => { window.clearTimeout(mismatchTimer.current); setCards(shuffledCards()); setFlipped([]); setMatched([]); setMoves(0); locked.current = false }
  return <GameShell title="Memory Match 🃏" intro="Flip two cards at a time and find all six pairs. How quickly can you match them?">
    <p className="game-message" aria-live="polite">{matched.length === memoryFaces.length ? `All matched in ${moves} moves! Lovely memory! ✨` : `${matched.length} / ${memoryFaces.length} pairs found · ${moves} turns`}</p>
    <div className="memory-board" role="grid" aria-label="Memory matching cards">{cards.map((card, index) => {
      const shown = flipped.includes(index) || matched.includes(card.face)
      return <button key={card.id} type="button" role="gridcell" className={`memory-card${shown ? ' revealed' : ''}`} onClick={() => reveal(index)} aria-label={shown ? `Card ${index + 1}: ${card.face}` : `Card ${index + 1}: face down`} aria-pressed={shown} disabled={shown}>{shown ? card.face : '♡'}</button>
    })}</div>
    <div className="button-row"><button className="button button-secondary" onClick={restart}>Shuffle and play again</button></div>
  </GameShell>
}
