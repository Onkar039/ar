import { defaultContent } from './data'
import { DEFAULT_WHATSAPP_NUMBER } from './whatsapp'

export const CONTENT_KEY = 'arati.content.v1'
export const storage = {
  get(key, fallback = null) {
    try {
      const value = localStorage.getItem(key)
      return value === null ? fallback : JSON.parse(value)
    } catch {
      return fallback
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch {
      return false
    }
  },
  remove(key) {
    try { localStorage.removeItem(key); return true } catch { return false }
  },
}

export function loadContent() {
  const current = storage.get(CONTENT_KEY)
  if (current && current.version === 1 && Array.isArray(current.letters) && Array.isArray(current.reminders)) {
    if (current.settings && !current.settings.whatsappNumber) {
      const migrated = { ...current, settings: { ...current.settings, whatsappNumber: DEFAULT_WHATSAPP_NUMBER } }
      if (storage.set(CONTENT_KEY, migrated)) return migrated
    }
    return current
  }
  if (current) return null
  storage.set(CONTENT_KEY, defaultContent)
  return structuredClone(defaultContent)
}

export function saveContent(content) {
  return storage.set(CONTENT_KEY, { ...content, version: 1 })
}

export function publicContent(content) {
  return {
    version: 1,
    personalization: content.personalization || defaultContent.personalization,
    home: content.home,
    letters: content.letters,
    reminders: content.reminders,
    wordSearch: content.wordSearch,
    mazeLevels: content.mazeLevels,
    blockSettings: content.blockSettings,
    settings: content.settings,
    theme: content.theme,
  }
}
