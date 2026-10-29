import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import Admin from './Admin'
import { ShareThoughts } from './App'
import { defaultContent } from './data'
import { loadContent } from './storage'
import { buildWhatsAppUrl, DEFAULT_WHATSAPP_NUMBER, formatWhatsAppPreview, getWhatsAppLinkTarget, normalizeWhatsAppNumber } from './whatsapp'

afterEach(() => vi.restoreAllMocks())

describe('WhatsApp Click to Chat', () => {
  it('normalizes the default Indian number and preserves the message exactly', () => {
    expect(DEFAULT_WHATSAPP_NUMBER).toBe('7558764877')
    expect(normalizeWhatsAppNumber(DEFAULT_WHATSAPP_NUMBER)).toEqual({ number: '917558764877', error: '' })
    expect(formatWhatsAppPreview(DEFAULT_WHATSAPP_NUMBER)).toBe('+917558764877')
    expect(buildWhatsAppUrl(DEFAULT_WHATSAPP_NUMBER, 'Hi Arati, it’s lovely 💗\nHow are you?').url)
      .toBe('https://wa.me/917558764877?text=Hi%20Arati%2C%20it%E2%80%99s%20lovely%20%F0%9F%92%97%0AHow%20are%20you%3F')
  })

  it('opens WhatsApp in the same tab on phones and a new tab on desktops', () => {
    expect(getWhatsAppLinkTarget('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('_self')
    expect(getWhatsAppLinkTarget('Mozilla/5.0 (Linux; Android 14)')).toBe('_self')
    expect(getWhatsAppLinkTarget('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Win32')).toBe('_blank')
    expect(getWhatsAppLinkTarget('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 'MacIntel', 5)).toBe('_self')
  })

  it('rejects empty messages and invalid recipient inputs', () => {
    expect(buildWhatsAppUrl(DEFAULT_WHATSAPP_NUMBER, ' \n ').error).toMatch(/message/i)
    expect(normalizeWhatsAppNumber('abc 7558764877').error).toMatch(/only/)
    expect(normalizeWhatsAppNumber('++917558764877').error).toMatch(/only/)
    expect(normalizeWhatsAppNumber('12').error).toMatch(/8–15/)
  })

  it('saves an edited recipient centrally and reloads that number from local content', () => {
    const content = structuredClone(defaultContent)
    const onContent = vi.fn()
    const open = vi.fn(() => ({ opener: {} }))
    vi.stubGlobal('open', open)
    render(<Admin content={content} onContent={onContent} />)
    fireEvent.click(screen.getByRole('button', { name: 'WhatsApp Message Settings' }))
    expect(screen.getByText(/number that should receive messages/i)).toBeInTheDocument()
    expect(screen.getByText('Messages will be addressed to')).toBeInTheDocument()
    expect(screen.getByText('+917558764877')).toBeInTheDocument()
    expect(open).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Test WhatsApp Link' }))
    expect(open).toHaveBeenCalledOnce()
    expect(open.mock.calls[0][0]).toBe(`https://wa.me/917558764877?text=${encodeURIComponent('Hello! This is a test link from Arati’s little world. 🌷')}`)
    fireEvent.change(screen.getByRole('textbox', { name: 'WhatsApp recipient number' }), { target: { value: '+1 (415) 555-0134' } })
    expect(screen.getByText('+14155550134')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Save Settings' }))
    expect(onContent).toHaveBeenCalledOnce()
    expect(loadContent().settings.whatsappNumber).toBe('14155550134')
  })

  it('provides a direct WhatsApp share link with the composed message and rejects empty text', () => {
    const open = vi.fn(() => ({ opener: {} }))
    vi.stubGlobal('open', open)
    render(<ShareThoughts settings={{ whatsappNumber: '+1 415 555 0134' }} />)
    expect(open).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Share on WhatsApp 💚' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/write a message/i)
    expect(open).not.toHaveBeenCalled()

    const message = "I'm okay 🌷\nStill thinking…"
    fireEvent.change(screen.getByRole('textbox', { name: /Your message/i }), { target: { value: message } })
    expect(screen.getByText(`${message.length} characters`)).toBeInTheDocument()
    const shareLink = screen.getByRole('link', { name: 'Share on WhatsApp 💚' })
    expect(shareLink).toHaveAttribute('href', `https://wa.me/14155550134?text=${encodeURIComponent(message)}`)
    expect(shareLink).toHaveAttribute('target', '_blank')
    expect(shareLink).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByText('+14155550134')).toBeInTheDocument()
    fireEvent.click(shareLink)
    expect(screen.getByRole('status')).toHaveTextContent(/ready to share in WhatsApp/i)
    expect(open).not.toHaveBeenCalled()
  })

  it('lets her share a feeling alone or omit it from a written WhatsApp message', () => {
    const open = vi.fn(() => ({ opener: {} }))
    vi.stubGlobal('open', open)
    render(<ShareThoughts settings={{ whatsappNumber: '+1 415 555 0134' }} />)

    fireEvent.click(screen.getByRole('radio', { name: /Overthinking/i }))
    expect(screen.getByText(/optional when sharing a feeling/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Share on WhatsApp 💚' })).toHaveAttribute('href', `https://wa.me/14155550134?text=${encodeURIComponent("How I'm feeling: Overthinking 🌷")}`)

    const message = 'I wanted to tell you about my day.'
    fireEvent.change(screen.getByRole('textbox', { name: /Your message/i }), { target: { value: message } })
    fireEvent.click(screen.getByRole('checkbox', { name: /Include “Overthinking”/i }))
    expect(screen.getByRole('link', { name: 'Share on WhatsApp 💚' })).toHaveAttribute('href', `https://wa.me/14155550134?text=${encodeURIComponent(message)}`)
    expect(open).not.toHaveBeenCalled()
  })

  it('creates a private draft letter directly from a new topic in the local editor', async () => {
    const EditableAdmin = () => {
      const [content, setContent] = useState(() => structuredClone(defaultContent))
      return <Admin content={content} onContent={setContent} />
    }
    render(<EditableAdmin />)
    fireEvent.click(screen.getByRole('button', { name: 'Topics & letters' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Create a new topic' }), { target: { value: 'Little wins' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start a letter in this topic' }))

    expect(await screen.findByRole('textbox', { name: 'Title' })).toHaveValue('A little letter about Little wins')
    expect(screen.getByLabelText('Published on the public letters page')).not.toBeChecked()
    expect(screen.getByLabelText('Category')).toHaveValue('Little wins')
  })
})
