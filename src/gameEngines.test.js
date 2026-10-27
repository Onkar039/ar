import { describe, expect, it } from 'vitest'
import { defaultContent, letters } from './data'
import { collides, createBoard, findMazePath, generateWordSearch, lockPiece, rotate, validateMaze, validateWords } from './gameEngines'

describe('seed content', () => {
  it('includes thirteen distinct, fully written letters', () => {
    expect(letters).toHaveLength(13)
    expect(new Set(letters.map((letter) => letter.slug)).size).toBe(13)
    expect(letters.every((letter) => letter.body.trim().length > 160)).toBe(true)
    expect(defaultContent.letters.every((letter) => letter.published)).toBe(true)
  })
})

describe('word-search engine', () => {
  it('places every requested word in a selectable straight line', () => {
    const { words, size } = defaultContent.wordSearch
    const { grid, placements } = generateWordSearch(words, size, () => 0.37)
    for (const word of words) {
      const points = placements[word]
      expect(points).toHaveLength(word.length)
      expect(points.map(([row, col]) => grid[row][col]).join('')).toBe(word)
      if (points.length > 2) {
        const rowStep = points[1][0] - points[0][0]
        const colStep = points[1][1] - points[0][1]
        expect(points.every(([row, col], index) => row === points[0][0] + rowStep * index && col === points[0][1] + colStep * index)).toBe(true)
      }
    }
  })

  it('rejects duplicate words and grids that cannot fit all names', () => {
    expect(validateWords(['same', 'same', 'a', 'b', 'c', 'd', 'e', 'f', 'g'], 12)).toMatch(/unique/)
    expect(validateWords(defaultContent.wordSearch.words, 7)).toMatch(/fit/)
  })
})

describe('maze engine', () => {
  it('guarantees a path for every initial level and rejects invalid mazes', () => {
    for (const level of defaultContent.mazeLevels) {
      const path = findMazePath(level)
      expect(path?.[0]).toEqual(level.start)
      expect(path?.at(-1)).toEqual(level.end)
      expect(validateMaze(level)).toBe('')
    }
    expect(validateMaze({ ...defaultContent.mazeLevels[0], walls: Array.from({ length: 81 }, (_, index) => [index % 9, Math.floor(index / 9)]) })).toMatch(/path/)
  })
})

describe('falling-block engine', () => {
  it('rotates shapes, detects walls, and clears full rows', () => {
    expect(rotate([[1, 1, 1, 1]])).toEqual([[1], [1], [1], [1]])
    const board = createBoard(3, 2)
    board[0] = [1, 1, 0]
    expect(collides(board, { x: -1, y: 0, shape: [[1]] })).toBe(true)
    const result = lockPiece(board, { x: 2, y: 0, shape: [[1]], color: 2 })
    expect(result.cleared).toBe(1)
    expect(result.board).toEqual([[0, 0, 0], [0, 0, 0]])
  })
})
