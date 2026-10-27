export const DEFAULT_WHATSAPP_NUMBER = '7558764877'

export function normalizeWhatsAppNumber(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return { number: '', error: 'Add a WhatsApp number in the local editor first.' }
  }
  const input = value.trim()
  if (!/^[+\d\s()-]+$/.test(input) || (input.includes('+') && !input.startsWith('+')) || (input.match(/\+/g) || []).length > 1) {
    return { number: '', error: 'Use digits, an optional leading +, spaces, parentheses, or hyphens only.' }
  }
  const digits = input.replace(/\D/g, '')
  const number = digits.length === 10 ? `91${digits}` : digits
  if (!/^[1-9]\d{7,14}$/.test(number)) {
    return { number: '', error: 'Enter a valid international number with 8–15 digits.' }
  }
  return { number, error: '' }
}

export function buildWhatsAppUrl(recipient, message) {
  const normalized = normalizeWhatsAppNumber(recipient)
  if (normalized.error) return { url: '', error: normalized.error }
  if (typeof message !== 'string' || !message.trim()) {
    return { url: '', error: 'Write a message before opening WhatsApp.' }
  }
  return {
    url: `https://wa.me/${normalized.number}?text=${encodeURIComponent(message)}`,
    error: '',
  }
}

export function formatWhatsAppPreview(value) {
  const normalized = normalizeWhatsAppNumber(value)
  return normalized.error ? 'Enter a valid number to preview it.' : `+${normalized.number}`
}
