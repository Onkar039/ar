import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Memories, { MEMORIES_KEY } from './Memories'

function choosePhoto() {
  const file = new File(['small photo'], 'memory.png', { type: 'image/png' })
  fireEvent.change(screen.getByLabelText('Choose a photo'), { target: { files: [file] } })
}

describe('memory scrapbook', () => {
  it('starts empty and saves a photo and caption locally', async () => {
    render(<Memories />)
    expect(screen.getByText(/nothing here is pre-filled or presented as a shared memory/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add your first memory' }))
    fireEvent.change(screen.getByLabelText('Caption'), { target: { value: 'A day worth keeping' } })
    choosePhoto()
    await waitFor(() => expect(screen.getByAltText('Preview of the selected memory')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Save memory' }))
    expect(await screen.findByRole('button', { name: 'View memory: A day worth keeping' })).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(MEMORIES_KEY))).toHaveLength(1)
  })

  it('validates missing photos, then supports opening, editing, and deleting a memory', async () => {
    localStorage.setItem(MEMORIES_KEY, JSON.stringify([{ id: 'one', caption: 'A saved moment', date: '2026-10-27', image: 'data:image/png;base64,cGhvdG8=' }]))
    render(<Memories />)
    fireEvent.click(screen.getByRole('button', { name: 'View memory: A saved moment' }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Caption'), { target: { value: 'A favorite moment' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save memory' }))
    expect(await screen.findByRole('button', { name: 'View memory: A favorite moment' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete it' }))
    expect(await screen.findByText('A blank page, saved just for you.')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(MEMORIES_KEY))).toEqual([])
  })

  it('handles invalid local scrapbook data with a visible notice', () => {
    localStorage.setItem(MEMORIES_KEY, '{not json')
    render(<Memories />)
    expect(screen.getByRole('status')).toHaveTextContent('Saved memories could not be read.')
    expect(screen.getByText('A blank page, saved just for you.')).toBeInTheDocument()
  })

  it('rejects oversized photos and closes the editor with Escape', () => {
    render(<Memories />)
    fireEvent.click(screen.getByRole('button', { name: 'Add your first memory' }))
    const largePhoto = new File([new Uint8Array(1_500_001)], 'large.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Choose a photo'), { target: { files: [largePhoto] } })
    expect(screen.getByRole('alert')).toHaveTextContent(/smaller than 1.5 MB/)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows a useful fallback for an unreadable saved photo', () => {
    localStorage.setItem(MEMORIES_KEY, JSON.stringify([{ id: 'broken', caption: 'Saved caption', date: '2026-10-27', image: 'data:image/png;base64,invalid' }]))
    render(<Memories />)
    fireEvent.error(screen.getByAltText('Saved caption'))
    expect(screen.getByRole('img', { name: 'Photo unavailable' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'View memory: Saved caption' }))
    expect(screen.getByRole('dialog').querySelector('.photo-error-large')).toBeInTheDocument()
  })
})
