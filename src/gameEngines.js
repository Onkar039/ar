export const SHAPES = [
  [[1, 1, 1, 1]],
  [[1, 1], [1, 1]],
  [[0, 1, 0], [1, 1, 1]],
  [[1, 0, 0], [1, 1, 1]],
  [[0, 0, 1], [1, 1, 1]],
  [[0, 1, 1], [1, 1, 0]],
  [[1, 1, 0], [0, 1, 1]],
]

export function rotate(matrix) {
  return matrix[0].map((_, i) => matrix.map((row) => row[i]).reverse())
}

export function createBoard(width = 10, height = 20) {
  return Array.from({ length: height }, () => Array(width).fill(0))
}

export function collides(board, piece, x = piece.x, y = piece.y, shape = piece.shape) {
  return shape.some((row, dy) => row.some((cell, dx) => cell && (
    x + dx < 0 || x + dx >= board[0].length || y + dy >= board.length ||
    (y + dy >= 0 && board[y + dy][x + dx])
  )))
}

export function lockPiece(board, piece) {
  const next = board.map((row) => [...row])
  piece.shape.forEach((row, dy) => row.forEach((cell, dx) => {
    if (cell && piece.y + dy >= 0) next[piece.y + dy][piece.x + dx] = piece.color
  }))
  const kept = next.filter((row) => row.some((cell) => !cell))
  const cleared = next.length - kept.length
  while (kept.length < next.length) kept.unshift(Array(next[0].length).fill(0))
  return { board: kept, cleared }
}

export function makePiece(type = Math.floor(Math.random() * SHAPES.length), boardWidth = 10) {
  const shape = SHAPES[type].map((row) => [...row])
  return { shape, x: Math.floor((boardWidth - shape[0].length) / 2), y: 0, color: type + 1 }
}

const DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]
export const normalizeWord = (word) => word.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '')

export function validateWords(words, size) {
  if (!Array.isArray(words)) return 'Enter exactly nine unique words.'
  const clean = words.map((word) => typeof word === 'string' ? normalizeWord(word) : '')
  if (clean.length !== 9 || clean.some((word) => !word) || new Set(clean).size !== clean.length) return 'Enter exactly nine unique words.'
  if (!Number.isInteger(size) || size < 9 || size < Math.max(...clean.map((word) => word.length)) || size > 18) return 'Grid size must be at least 9 and fit the longest word (maximum 18).'
  return ''
}

export function generateWordSearch(words, size = 12, random = Math.random) {
  const clean = words.map(normalizeWord)
  const error = validateWords(clean, size)
  if (error) throw new Error(error)
  const grid = Array.from({ length: size }, () => Array(size).fill(''))
  const placements = {}
  const ordered = [...clean].sort((a, b) => b.length - a.length)
  function placeAt(index) {
    if (index === ordered.length) return true
    const word = ordered[index]
    const candidates = []
    for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) for (const [dr, dc] of DIRECTIONS) {
      const er = row + dr * (word.length - 1), ec = col + dc * (word.length - 1)
      if (er < 0 || er >= size || ec < 0 || ec >= size) continue
      if ([...word].every((letter, i) => !grid[row + dr * i][col + dc * i] || grid[row + dr * i][col + dc * i] === letter)) candidates.push({ row, col, dr, dc })
    }
    for (let i = candidates.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [candidates[i], candidates[j]] = [candidates[j], candidates[i]] }
    for (const position of candidates) {
      const { row, col, dr, dc } = position
      for (let i = 0; i < word.length; i++) grid[row + dr * i][col + dc * i] = word[i]
      placements[word] = Array.from(word, (_, i) => [row + dr * i, col + dc * i])
      if (placeAt(index + 1)) return true
      for (let i = 0; i < word.length; i++) grid[row + dr * i][col + dc * i] = ''
      delete placements[word]
    }
    return false
  }
  if (!placeAt(0)) {
    Object.keys(placements).forEach((word) => delete placements[word])
    grid.forEach((row) => row.fill(''))
    ordered.forEach((word, row) => {
      if (row >= size) throw new Error('These words cannot fit together. Try a larger grid.')
      for (let col = 0; col < word.length; col++) grid[row][col] = word[col]
      placements[word] = Array.from(word, (_, col) => [row, col])
    })
  }
  for (const row of grid) for (let col = 0; col < size; col++) if (!row[col]) row[col] = String.fromCharCode(65 + Math.floor(random() * 26))
  return { grid, placements }
}

export function findMazePath(level) {
  if (!level || !Array.isArray(level.start) || !Array.isArray(level.end) || !Array.isArray(level.walls)) return null
  const { width, height, start, end, walls } = level
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 2 || height < 2 || width > 25 || height > 25) return null
  const key = ([x, y]) => `${x},${y}`
  const validCell = (cell) => Array.isArray(cell) && cell.length === 2 && cell.every(Number.isInteger)
  if (!validCell(start) || !validCell(end) || !walls.every(validCell)) return null
  if ([...walls, start, end].some(([x, y]) => x < 0 || x >= width || y < 0 || y >= height)) return null
  const blocked = new Set((walls || []).map(key))
  if (start[0] === end[0] && start[1] === end[1]) return null
  if ([start, end].some(([x, y]) => x < 0 || x >= width || y < 0 || y >= height || blocked.has(key([x, y])))) return null
  const queue = [[...start]], visited = new Set([key(start)]), parent = new Map()
  while (queue.length) {
    const at = queue.shift()
    if (key(at) === key(end)) {
      const path = [at]
      while (parent.has(key(path[0]))) path.unshift(parent.get(key(path[0])))
      return path
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = [at[0] + dx, at[1] + dy], id = key(next)
      if (next[0] >= 0 && next[0] < width && next[1] >= 0 && next[1] < height && !blocked.has(id) && !visited.has(id)) {
        visited.add(id); parent.set(id, at); queue.push(next)
      }
    }
  }
  return null
}

export function validateMaze(level) {
  if (!level || !Number.isInteger(level.width) || !Number.isInteger(level.height)) return 'Maze dimensions must be whole numbers.'
  if (!Array.isArray(level.walls) || !Array.isArray(level.start) || !Array.isArray(level.end)) return 'Add start, finish, and wall cells.'
  if (level.width < 2 || level.width > 25 || level.height < 2 || level.height > 25) return 'Maze dimensions must be between 2 and 25 cells.'
  const validCell = (cell) => Array.isArray(cell) && cell.length === 2 && cell.every(Number.isInteger)
  if (!validCell(level.start) || !validCell(level.end) || !level.walls.every(validCell)) return 'Start, finish, and wall coordinates must be integer [x, y] pairs.'
  if ([...level.walls, level.start, level.end].some(([x, y]) => x < 0 || x >= level.width || y < 0 || y >= level.height)) return 'Every maze coordinate must stay inside the grid.'
  if (!findMazePath(level)) return 'This maze needs different start/finish cells and a valid path.'
  return ''
}
