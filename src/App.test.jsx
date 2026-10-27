import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'
import { Maze } from './Games'
import { defaultContent } from './data'
import { findMazePath } from './gameEngines'
import { CONTENT_KEY } from './storage'

describe('the local website', () => {
  it('renders the welcome page and provides a working feelings route', async () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Hey Arati… 💗' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Skip welcome/ }))
    expect(await screen.findByRole('heading', { name: /Hey Arati, welcome to your world/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Feelings' }))
    expect(await screen.findByRole('heading', { name: /How are you feeling today/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Overthinking/i }))
    expect(screen.getByText(/Take a breath\. You can slow down/)).toBeInTheDocument()
  })

  it('keeps the superadmin editor off public navigation and footer', async () => {
    render(<App />)
    expect(screen.queryByRole('link', { name: 'Content studio' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Local editor' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Feelings' }))
    expect(await screen.findByRole('heading', { name: /How are you feeling today/i })).toBeInTheDocument()
  })

  it('navigates to the replayable surprise and the happiness corner', async () => {
    window.history.replaceState({}, '', '/')
    localStorage.setItem('arati.welcome.complete', 'true')
    render(<App />)
    expect(await screen.findByRole('region', { name: /Welcome to/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Skip welcome/ }))
    fireEvent.click(screen.getByRole('link', { name: /A Little Surprise/ }))
    expect(await screen.findByRole('heading', { name: 'A little something, just for you' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Open your surprise/ }))
    expect(await screen.findByRole('button', { name: /Wrap it up and open again/ })).toBeInTheDocument()
    expect(screen.getByText(/You make the ordinary feel a little brighter/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Wrap it up and open again/ }))
    expect(await screen.findByText('A small reminder, tucked inside.')).toBeInTheDocument()
  })

  it('removes Surprise from the navbar and offers five new playable games', async () => {
    window.history.replaceState({}, '', '/')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Skip welcome/ }))
    const navigation = screen.getByRole('navigation', { name: 'Main navigation' })
    expect(navigation.querySelector('a[href="/surprise"]')).toBeNull()
    fireEvent.click(screen.getByRole('link', { name: 'Games' }))
    expect(await screen.findByRole('heading', { name: 'A little play break' })).toBeInTheDocument()
    for (const title of ['Chess Together', 'Little Snake', 'Catch the Bouncy Ball', 'Tic-Tac-Toe', 'Memory Match']) {
      expect(screen.getByRole('heading', { name: new RegExp(title) })).toBeInTheDocument()
    }
    fireEvent.click(document.querySelector('a[href="/games/chess"]'))
    expect(await screen.findByRole('grid', { name: 'Chess board' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('White to move')
    fireEvent.click(screen.getByRole('gridcell', { name: /White pawn square e2/ }))
    fireEvent.click(screen.getByRole('gridcell', { name: /Empty square e4/ }))
    expect(screen.getByRole('status')).toHaveTextContent('Black to move')
  })

  it('shows the welcome letter again after a fresh app load, even if an old completion flag exists', async () => {
    window.history.replaceState({}, '', '/')
    localStorage.setItem('arati.welcome.complete', 'true')
    render(<App />)
    expect(await screen.findByRole('region', { name: /Welcome to/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Skip welcome/ }))
    expect(await screen.findByRole('heading', { name: /Hey Arati, welcome to your world/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Open your welcome letter again 💌' }))
    expect(await screen.findByRole('region', { name: /Welcome to/ })).toBeInTheDocument()
    const envelope = screen.getByRole('button', { name: 'Open your waiting welcome letter' })
    await waitFor(() => expect(envelope).toBeEnabled(), { timeout: 3000 })
    fireEvent.click(envelope)
    fireEvent.click(await screen.findByRole('button', { name: 'Open your little surprise' }, { timeout: 5000 }))
    await waitFor(() => expect(screen.queryByRole('region', { name: /Welcome to/ })).not.toBeInTheDocument())
    expect(screen.getByRole('heading', { name: /Hey Arati, welcome to your world/i })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/')
  }, 10000)

  it('does not list draft letters and persists letter favorites locally', async () => {
    const content = structuredClone(defaultContent)
    content.letters.push({ slug: 'draft-note', title: 'A private draft title', emoji: '💌', category: 'Draft', language: 'English', body: 'Not published', published: false })
    localStorage.setItem(CONTENT_KEY, JSON.stringify(content))
    render(<App />)
    fireEvent.click(screen.getByRole('link', { name: 'Letters' }))
    expect(await screen.findByRole('heading', { name: /A few kind words/ })).toBeInTheDocument()
    expect(screen.queryByText('A private draft title')).not.toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Add letter to favorites' })[0])
    const favoriteSlugs = JSON.parse(localStorage.getItem('arati.letters.favorites'))
    expect(favoriteSlugs).toHaveLength(1)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Remove letter from favorites' })).toBeInTheDocument())
  })

  it('generates all nine configured names and counts each selected word once', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('link', { name: 'Games' }))
    fireEvent.click(screen.getAllByRole('link', { name: /Play a little/i })[1])
    expect(await screen.findByText('Names collected: 0 / 9 💗')).toBeInTheDocument()
    await waitFor(() => expect(localStorage.getItem('arati.word.puzzle')).not.toBeNull())
    const saved = JSON.parse(localStorage.getItem('arati.word.puzzle'))
    const firstWord = defaultContent.wordSearch.words[0]
    const points = saved.puzzle.placements[firstWord]
    const first = points[0], last = points.at(-1)
    const cell = ([row, col]) => screen.getByLabelText(new RegExp(`Row ${row + 1}, column ${col + 1},`))
    fireEvent.click(cell(first))
    fireEvent.click(cell(last))
    expect(screen.getByText('Names collected: 1 / 9 💗')).toBeInTheDocument()
    expect(cell(first)).toHaveClass('word-found')
    fireEvent.click(cell(first))
    fireEvent.click(cell(last))
    expect(screen.getByText('Names collected: 1 / 9 💗')).toBeInTheDocument()
  })

  it('starts, pauses, resumes, and restarts the falling-block game', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('link', { name: 'Games', exact: true }))
    fireEvent.click((await screen.findAllByRole('link', { name: /Play a little/ }))[0])
    fireEvent.click(await screen.findByRole('button', { name: /Start game/ }))
    expect(screen.getByRole('button', { name: /Pause/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Pause/ }))
    expect(screen.getByText(/Paused\. Take all the time you need/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Resume/ }))
    expect(screen.getByRole('button', { name: /Pause/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Restart' }))
    expect(screen.getByText('Score').parentElement).toHaveTextContent('0')
  })

  it('solves the initial maze using only legal directional moves', async () => {
    render(<Maze levels={defaultContent.mazeLevels} />)
    const level = defaultContent.mazeLevels[0]
    const path = findMazePath(level)
    await screen.findByRole('grid', { name: /Garden path maze/ })
    for (let index = 1; index < path.length; index++) {
      const [dx, dy] = [path[index][0] - path[index - 1][0], path[index][1] - path[index - 1][1]]
      const direction = dx === 1 ? 'Move right' : dx === -1 ? 'Move left' : dy === 1 ? 'Move down' : 'Move up'
      fireEvent.click(screen.getByRole('button', { name: direction }))
      await waitFor(() => expect(screen.getByText('Moves').parentElement).toHaveTextContent(new RegExp(`Moves\\s+${index}(?:\\D|$)`)))
    }
    expect(await screen.findByText('You found your way home! Lovely work! 🎉')).toBeInTheDocument()
  })
})
