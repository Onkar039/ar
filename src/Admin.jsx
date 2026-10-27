import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, RotateCcw, Upload } from 'lucide-react'
import { defaultContent } from './data'
import { validateMaze, validateWords } from './gameEngines'
import { publicContent, saveContent, storage } from './storage'
import { buildWhatsAppUrl, DEFAULT_WHATSAPP_NUMBER, formatWhatsAppPreview, normalizeWhatsAppNumber } from './whatsapp'

const tabs = ['Overview', 'Home', 'Letters', 'Topics & letters', 'Reminders', 'Word search', 'Blocks', 'Maze', 'Theme', 'Settings', 'WhatsApp Message Settings', 'Data tools']
const clone = (value) => structuredClone(value)
const isHttpUrl = (value) => {
  try { return ['http:', 'https:'].includes(new URL(value).protocol) } catch { return false }
}

export default function Admin({ content, onContent }) {
  const [active, setActive] = useState('Overview')
  const [notice, setNotice] = useState('')
  const [letterId, setLetterId] = useState(content.letters[0]?.slug || '')
  const [reminderId, setReminderId] = useState(content.reminders[0]?.id || '')
  const [mazeId, setMazeId] = useState(content.mazeLevels[0]?.id || '')
  const [wordDraft, setWordDraft] = useState([...content.wordSearch.words])
  const [wordSizeDraft, setWordSizeDraft] = useState(content.wordSearch.size)
  const [wordHintDraft, setWordHintDraft] = useState(content.wordSearch.hint || '')
  const [whatsAppDraft, setWhatsAppDraft] = useState(content.settings.whatsappNumber || DEFAULT_WHATSAPP_NUMBER)
  const [mazeDraft, setMazeDraft] = useState(() => clone(content.mazeLevels[0] || null))
  const [preview, setPreview] = useState('')
  const [importPreview, setImportPreview] = useState(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const fileRef = useRef(null)
  const commit = (next, message = 'Saved in this browser.') => {
    if (!saveContent(next)) { setNotice('Could not save. Your browser storage may be full or unavailable.'); return false }
    onContent(next)
    setNotice(message)
    return true
  }
  const update = (path, value) => {
    const next = clone(content)
    let target = next
    for (const key of path.slice(0, -1)) target = target[key]
    target[path[path.length - 1]] = value
    commit(next)
  }
  const editLetter = (changes) => {
    const next = clone(content)
    const index = next.letters.findIndex((item) => item.slug === letterId)
    if (index >= 0) next.letters[index] = { ...next.letters[index], ...changes }
    commit(next)
  }
  const currentLetter = content.letters.find((item) => item.slug === letterId)
  const currentReminder = content.reminders.find((item) => item.id === reminderId)
  const currentMaze = mazeDraft
  const createTopicLetter = (topic) => {
    const name = topic.trim()
    if (!name) return false
    const base = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'letter'
    let slug = `${base}-${Date.now()}`
    let suffix = 2
    while (content.letters.some((item) => item.slug === slug)) slug = `${base}-${Date.now()}-${suffix++}`
    const item = { title: `A little letter about ${name}`, slug, emoji: '💌', category: name, language: 'English', body: '', published: false }
    const next = clone(content)
    next.letters.push(item)
    if (!commit(next, `Draft letter created in the “${name}” topic.`)) return false
    setLetterId(item.slug)
    setActive('Letters')
    return true
  }
  const reorder = (items, index, direction) => {
    const next = [...items], destination = index + direction
    if (destination < 0 || destination >= next.length) return next
    ;[next[index], next[destination]] = [next[destination], next[index]]
    return next
  }
  const download = () => {
    try {
      const blob = new Blob([JSON.stringify(publicContent(content), null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url; anchor.download = 'arati-public-content.json'; anchor.click()
      URL.revokeObjectURL(url)
      setNotice('Public content exported. Private journal and thoughts are not included.')
    } catch { setNotice('Export could not be created in this browser.') }
  }
  const readImport = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text())
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.letters) || !Array.isArray(parsed.reminders) || !parsed.home || !parsed.wordSearch || !Array.isArray(parsed.mazeLevels) || !parsed.blockSettings || !parsed.settings || !parsed.theme) throw new Error('Required public content fields are missing.')
      if (parsed.personalization !== undefined) {
        const personal = parsed.personalization
        if (!personal || typeof personal !== 'object' || Array.isArray(personal)) throw new Error('Personalization must be an object.')
        if (['name', 'greeting', 'introduction', 'surpriseMessage'].some((key) => personal[key] !== undefined && typeof personal[key] !== 'string')) throw new Error('Personalization text fields must be strings.')
        if (personal.compliments !== undefined && (!Array.isArray(personal.compliments) || personal.compliments.some((item) => typeof item !== 'string'))) throw new Error('Compliments must be a list of text.')
        if (personal.songs !== undefined && (!Array.isArray(personal.songs) || personal.songs.some((song) => !song || typeof song.title !== 'string' || typeof song.artist !== 'string' || (song.url && !isHttpUrl(song.url))))) throw new Error('Songs need a title and artist, and links must use http or https.')
      }
      if (parsed.letters.some((item) => !item || typeof item.title !== 'string' || typeof item.slug !== 'string' || typeof item.body !== 'string')) throw new Error('Every letter needs a title, slug, and body.')
      if (parsed.reminders.some((item) => !item || typeof item.id !== 'string' || typeof item.text !== 'string')) throw new Error('Every reminder needs an id and text.')
      const slugs = parsed.letters.map((item) => item.slug)
      if (slugs.some((slug) => !slug) || new Set(slugs).size !== slugs.length) throw new Error('Letter slugs must be present and unique.')
      const wordError = validateWords(parsed.wordSearch.words || [], parsed.wordSearch.size)
      if (wordError) throw new Error(wordError)
      if (parsed.settings.whatsappNumber && normalizeWhatsAppNumber(parsed.settings.whatsappNumber).error) throw new Error('The WhatsApp recipient number is invalid.')
      const mazeError = parsed.mazeLevels.map(validateMaze).find(Boolean)
      if (mazeError) throw new Error(mazeError)
      setImportPreview(publicContent(parsed))
      setNotice(`Preview ready: ${parsed.letters.length} letters, ${parsed.reminders.length} reminders, ${parsed.mazeLevels.length} maze levels.`)
    } catch (error) { setImportPreview(null); setNotice(`Import rejected: ${error.message}`) }
    event.target.value = ''
  }
  const applyImport = () => {
    if (importPreview && commit({ ...clone(importPreview), version: 1 }, 'Imported public content saved locally.')) {
      setLetterId(importPreview.letters[0]?.slug || '')
      setReminderId(importPreview.reminders[0]?.id || '')
      setMazeId(importPreview.mazeLevels[0]?.id || '')
      setMazeDraft(clone(importPreview.mazeLevels[0] || null))
      setWordDraft([...importPreview.wordSearch.words])
      setWordSizeDraft(importPreview.wordSearch.size)
      setWordHintDraft(importPreview.wordSearch.hint || '')
      setImportPreview(null)
    }
  }
  const _saveMazeDraft = () => {
    const error = validateMaze(mazeDraft)
    if (error) { setNotice(`Maze not saved: ${error}`); return }
    const next = clone(content)
    const index = next.mazeLevels.findIndex((item) => item.id === mazeId)
    if (index < 0) { setNotice('Selected maze level no longer exists.'); return }
    next.mazeLevels[index] = clone(mazeDraft)
    commit(next, 'Valid maze level saved locally.')
  }
  const _editMaze = (changes) => setMazeDraft((draft) => ({ ...draft, ...changes }))
  const _saveWordDraft = () => {
    const error = validateWords(wordDraft, wordSizeDraft)
    if (error) { setNotice(`Puzzle not saved: ${error}`); return }
    const next = clone(content)
    next.wordSearch = { words: wordDraft.map((word) => word.trim().toUpperCase()), size: wordSizeDraft, hint: wordHintDraft.trim() }
    if (commit(next, 'Valid word-search configuration saved locally. Your next puzzle uses the new settings.')) {
      storage.remove('arati.word.puzzle')
      storage.set('arati.word.found', [])
    }
  }
  const saveWhatsApp = () => {
    const normalized = normalizeWhatsAppNumber(whatsAppDraft)
    if (normalized.error) { setNotice(`Number not saved: ${normalized.error}`); return }
    const next = clone(content)
    next.settings.whatsappNumber = normalized.number
    if (commit(next, 'WhatsApp recipient saved in this browser.')) setWhatsAppDraft(normalized.number)
  }
  const testWhatsApp = () => {
    const result = buildWhatsAppUrl(whatsAppDraft, 'Hello! This is a test link from Arati’s little world. 🌷')
    if (result.error) { setNotice(result.error); return }
    try {
      const testWindow = window.open(result.url, '_blank')
      if (!testWindow) { setNotice('Your browser may have blocked the new tab. Allow popups, then try again.'); return }
      testWindow.opener = null
      setNotice('A harmless test message is ready in WhatsApp. Review it there; nothing was sent.')
    } catch {
      setNotice('WhatsApp could not be opened. Check your browser settings and try again.')
    }
  }
  const restore = () => {
    if (commit(clone(defaultContent), 'Original seed content restored.')) {
      setLetterId(defaultContent.letters[0].slug); setReminderId(defaultContent.reminders[0].id); setMazeId(defaultContent.mazeLevels[0].id); setConfirmReset(false)
      setMazeDraft(clone(defaultContent.mazeLevels[0]))
      setWordDraft([...defaultContent.wordSearch.words]); setWordSizeDraft(defaultContent.wordSearch.size); setWordHintDraft(defaultContent.wordSearch.hint)
    }
  }
  const storageBytes = (() => {
    try {
      let total = 0
      for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); total += key.length + localStorage.getItem(key).length }
      return `${(total / 1024).toFixed(1)} KB`
    } catch { return 'Unavailable' }
  })()

  if (active === 'Topics & letters') {
    return <LetterTopics
      content={content}
      onCreateLetter={createTopicLetter}
      onEditLetter={(slug) => { setLetterId(slug); setActive('Letters') }}
      onBack={() => setActive('Overview')}
    />
  }

  return <section className="admin-wrap"><div className="page-heading admin-heading"><span className="eyebrow">🛠️ LOCAL EDITOR</span><h1>Little world editor</h1><p>This is a browser-local content manager, not secure authentication or shared cloud storage. Anyone using this browser profile can open it; edits stay on this device.</p></div><div className="admin-layout"><nav className="admin-tabs" aria-label="Content editor sections">{tabs.map((tab) => <button key={tab} onClick={() => setActive(tab)} className={active === tab ? 'active' : ''}>{tab}</button>)}</nav><div className="admin-panel card"><div className="admin-panel-title"><h2>{active}</h2><span>Saved only in this browser</span></div>{notice && <p className="notice" role="status">{notice}</p>}
      {active === 'Overview' && <div><p>Counts reflect editable public content only. Private journal entries, thoughts, and feelings selections are never shown here.</p><div className="admin-stats"><div><b>{content.letters.length}</b><span>Total letters</span></div><div><b>{content.letters.filter((item) => item.published).length}</b><span>Published</span></div><div><b>{content.letters.filter((item) => !item.published).length}</b><span>Drafts</span></div><div><b>{content.reminders.length}</b><span>Reminders</span></div><div><b>{content.mazeLevels.length}</b><span>Maze levels</span></div><div><b>{content.wordSearch.words.length === 9 ? 'Ready' : 'Check'}</b><span>Word search</span></div><div><b>{storageBytes}</b><span>Storage estimate</span></div></div><p>Changes are not synced to another device and may be lost if browser data is cleared.</p></div>}
      {active === 'Home' && <div className="form-stack"><Field label="Hero heading"><input value={content.home.heading} onChange={(e) => update(['home', 'heading'], e.target.value)} /></Field><Field label="Subtitle"><textarea value={content.home.subtitle} onChange={(e) => update(['home', 'subtitle'], e.target.value)} /></Field><Field label="Explore button"><input value={content.home.exploreLabel} onChange={(e) => update(['home', 'exploreLabel'], e.target.value)} /></Field><Field label="Comfort button"><input value={content.home.comfortLabel} onChange={(e) => update(['home', 'comfortLabel'], e.target.value)} /></Field><Field label="Rotating messages (one per line)"><textarea value={content.home.messages.join('\n')} onChange={(e) => update(['home', 'messages'], e.target.value.split('\n').filter(Boolean))} /></Field>{Object.entries(content.home.sections || defaultContent.home.sections).map(([key, value]) => <Field label={`Section heading: ${key}`} key={key}><input value={value} onChange={(e) => update(['home', 'sections', key], e.target.value)} /></Field>)}<Link className="button button-secondary fit" to="/">Preview the home page ↗</Link><button className="button button-quiet fit" onClick={() => window.confirm('Restore the default home page content?') && update(['home'], clone(defaultContent.home))}><RotateCcw size={16} /> Restore home defaults</button></div>}
      {active === 'Letters' && <div className="form-stack"><div className="button-row"><select aria-label="Choose letter" value={letterId} onChange={(e) => setLetterId(e.target.value)}>{content.letters.map((item) => <option value={item.slug} key={item.slug}>{item.title}</option>)}</select><button className="button button-secondary" onClick={() => { const item = { title: 'A new little letter', slug: `new-letter-${Date.now()}`, emoji: '💌', category: 'Everyday', language: 'English', body: '', published: false }; const next = clone(content); next.letters.push(item); if (commit(next)) setLetterId(item.slug) }}>Add a letter</button></div>{currentLetter && <><Field label="Title"><input value={currentLetter.title} onChange={(e) => editLetter({ title: e.target.value })} /></Field><Field label="Unique slug"><input value={currentLetter.slug} onChange={(e) => { const value = e.target.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'); if (!value || content.letters.some((item) => item.slug === value && item.slug !== letterId)) { setNotice('Letter slugs must be non-empty and unique.'); return } const old = letterId; const next = clone(content); const target = next.letters.find((item) => item.slug === old); target.slug = value; if (commit(next)) setLetterId(value) }} /></Field><div className="field-grid"><Field label="Emoji"><input value={currentLetter.emoji} onChange={(e) => editLetter({ emoji: e.target.value })} /></Field><Field label="Category"><input value={currentLetter.category} onChange={(e) => editLetter({ category: e.target.value })} /></Field><Field label="Language"><select value={currentLetter.language} onChange={(e) => editLetter({ language: e.target.value })}><option>English</option><option>Marathi</option><option>English & Marathi</option></select></Field></div><Field label="Letter body"><textarea rows="10" value={currentLetter.body} onChange={(e) => editLetter({ body: e.target.value })} /></Field><label className="check-field"><input type="checkbox" checked={!!currentLetter.published} onChange={(e) => { if (e.target.checked && (!currentLetter.title.trim() || !currentLetter.body.trim() || !currentLetter.slug.trim())) { setNotice('Add a title, unique slug, and letter body before publishing.'); return } editLetter({ published: e.target.checked }) }} /> Published on the public letters page</label><div className="button-row"><button className="button button-secondary" onClick={() => { const index = content.letters.findIndex((item) => item.slug === letterId); const next = clone(content); next.letters = reorder(next.letters, index, -1); commit(next) }}>Move up</button><button className="button button-secondary" onClick={() => { const index = content.letters.findIndex((item) => item.slug === letterId); const next = clone(content); next.letters = reorder(next.letters, index, 1); commit(next) }}>Move down</button><button className="button button-quiet" onClick={() => setPreview('letter')}>Preview letter</button><button className="button button-danger" onClick={() => { if (window.confirm('Delete this letter? This cannot be undone.')) { const next = clone(content); next.letters = next.letters.filter((item) => item.slug !== letterId); if (commit(next)) setLetterId(next.letters[0]?.slug || '') } }}>Delete letter</button></div></>}</div>}
      {active === 'Reminders' && <div className="form-stack"><div className="button-row"><select aria-label="Choose reminder" value={reminderId} onChange={(e) => setReminderId(e.target.value)}>{content.reminders.map((item) => <option value={item.id} key={item.id}>{item.text}</option>)}</select><button className="button button-secondary" onClick={() => { const item = { id: `reminder-${Date.now()}`, text: 'A kind reminder', category: 'Self-kindness' }; const next = clone(content); next.reminders.push(item); if (commit(next)) setReminderId(item.id) }}>Add reminder</button></div>{currentReminder && <><Field label="Reminder"><textarea value={currentReminder.text} onChange={(e) => { const next = clone(content); next.reminders.find((item) => item.id === reminderId).text = e.target.value; commit(next) }} /></Field><Field label="Category"><input value={currentReminder.category} onChange={(e) => { const next = clone(content); next.reminders.find((item) => item.id === reminderId).category = e.target.value; commit(next) }} /></Field><div className="import-preview"><b>Preview</b><p>{currentReminder.text}</p><small>{currentReminder.category}</small></div><div className="button-row"><button className="button button-secondary" onClick={() => { const next = clone(content); next.reminders = reorder(next.reminders, next.reminders.findIndex((item) => item.id === reminderId), -1); commit(next) }}>Move up</button><button className="button button-secondary" onClick={() => { const next = clone(content); next.reminders = reorder(next.reminders, next.reminders.findIndex((item) => item.id === reminderId), 1); commit(next) }}>Move down</button><button className="button button-danger" onClick={() => { if (window.confirm('Delete this reminder?')) { const next = clone(content); next.reminders = next.reminders.filter((item) => item.id !== reminderId); if (commit(next)) setReminderId(next.reminders[0]?.id || '') } }}>Delete reminder</button><button className="button button-quiet" onClick={() => window.confirm('Restore all initial reminders?') && update(['reminders'], clone(defaultContent.reminders))}>Restore initial reminders</button></div></>}</div>}
      {active === 'Word search' && <div className="form-stack"><p>Keep exactly nine unique words. Grid size must be at least nine and fit the longest word; the game verifies generated placements.</p><Field label="Target names (one per line)"><textarea rows="9" value={wordDraft.join('\n')} onChange={(e) => setWordDraft(e.target.value.split('\n'))} /></Field><Field label="Grid size (9–18)"><input type="number" min="9" max="18" value={wordSizeDraft} onChange={(e) => setWordSizeDraft(Number(e.target.value))} /></Field><Field label="Hint shown in the game"><input value={wordHintDraft} onChange={(e) => setWordHintDraft(e.target.value)} /></Field><p className={validateWords(wordDraft, wordSizeDraft) ? 'error-text' : 'success-text'}>{validateWords(wordDraft, wordSizeDraft) || 'Puzzle configuration is valid.'}</p><Field label="Puzzle instructions"><input value="Select the first and last letters of each name." readOnly /></Field><div className="button-row"><button className="button button-primary" onClick={_saveWordDraft}>Save valid configuration</button><Link className="button button-secondary" to="/games/word-search">Preview / restart puzzle ↗</Link></div></div>}
      {active === 'Blocks' && <div className="form-stack"><Field label="Game title"><input value={content.blockSettings.title} onChange={(e) => update(['blockSettings', 'title'], e.target.value)} /></Field><Field label="Instructions shown to players"><input value={content.blockSettings.instructions} onChange={(e) => update(['blockSettings', 'instructions'], e.target.value)} /></Field><Field label="Celebration score milestones (comma separated)"><input value={content.blockSettings.milestones.join(', ')} onChange={(e) => { const values = e.target.value.split(',').map(Number).filter(Number.isFinite); update(['blockSettings', 'milestones'], values) }} /></Field><p>Milestones trigger a small celebration when reached. Puzzle mechanics and scoring remain unchanged.</p><button className="button button-danger fit" onClick={() => { if (window.confirm('Reset your locally saved best block score?')) { storage.remove('arati.blocks.best'); setNotice('Best score reset locally.') } }}>Reset local best score</button></div>}
      {active === 'Maze' && <div className="form-stack">
        <div className="button-row">
          <select aria-label="Choose maze level" value={mazeId} onChange={(e) => { setMazeId(e.target.value); setMazeDraft(clone(content.mazeLevels.find((item) => item.id === e.target.value) || null)) }}>{content.mazeLevels.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <button className="button button-secondary" onClick={() => { const item = { id: `level-${Date.now()}`, name: 'New garden path', difficulty: 'Easy', width: 5, height: 5, start: [0, 0], end: [4, 4], walls: [], hint: 'Follow the open path.' }; const next = clone(content); next.mazeLevels.push(item); if (commit(next)) { setMazeId(item.id); setMazeDraft(clone(item)) } }}>Add level</button>
        </div>
        {currentMaze && <>
          <Field label="Level name"><input value={currentMaze.name} onChange={(e) => _editMaze({ name: e.target.value })} /></Field>
          <Field label="Difficulty"><select value={currentMaze.difficulty} onChange={(e) => _editMaze({ difficulty: e.target.value })}><option>Easy</option><option>Medium</option><option>Hard</option></select></Field>
          <Field label="Dimensions (width, height)"><div className="field-grid">
            <input aria-label="Width" type="number" min="2" max="25" value={currentMaze.width} onChange={(e) => _editMaze({ width: Number(e.target.value) })} />
            <input aria-label="Height" type="number" min="2" max="25" value={currentMaze.height} onChange={(e) => _editMaze({ height: Number(e.target.value) })} />
          </div></Field>
          <Field label="Start coordinate [x, y]"><input value={JSON.stringify(currentMaze.start)} onChange={(e) => { try { _editMaze({ start: JSON.parse(e.target.value) }) } catch { setNotice('Use a valid JSON coordinate pair, for example [0, 0].') } }} /></Field>
          <Field label="Finish coordinate [x, y]"><input value={JSON.stringify(currentMaze.end)} onChange={(e) => { try { _editMaze({ end: JSON.parse(e.target.value) }) } catch { setNotice('Use a valid JSON coordinate pair, for example [4, 4].') } }} /></Field>
          <Field label="Wall coordinates [[x, y], …]"><textarea value={JSON.stringify(currentMaze.walls)} onChange={(e) => { try { _editMaze({ walls: JSON.parse(e.target.value) }) } catch { setNotice('Wall coordinates must be a valid JSON array.') } }} /></Field>
          <Field label="Instructions"><input value="Use arrow keys or directional buttons to reach the finish." readOnly /></Field>
          <Field label="Hint"><input value={currentMaze.hint} onChange={(e) => _editMaze({ hint: e.target.value })} /></Field>
          <p className={validateMaze(currentMaze) ? 'error-text' : 'success-text'}>{validateMaze(currentMaze) || 'A valid path connects start and finish.'}</p>
          <div className="button-row">
            <button className="button button-primary" onClick={_saveMazeDraft} disabled={!!validateMaze(currentMaze)}>Save valid level</button>
            <button className="button button-secondary" onClick={() => setPreview('maze')} disabled={!!validateMaze(currentMaze)}>Preview level</button>
            <button className="button button-danger" onClick={() => { if (content.mazeLevels.length === 1) { setNotice('Keep at least one maze level.'); return } if (window.confirm('Delete this maze level?')) { const next = clone(content); next.mazeLevels = next.mazeLevels.filter((item) => item.id !== mazeId); if (commit(next)) { setMazeId(next.mazeLevels[0].id); setMazeDraft(clone(next.mazeLevels[0])) } } }}>Delete level</button>
            <button className="button button-quiet" onClick={() => { if (window.confirm('Reset saved maze progress?')) { storage.set('arati.maze.level', 0); setNotice('Saved maze progress reset.') } }}>Reset progress</button>
          </div>
        </>}
      </div>}
      {active === 'Theme' && <div className="form-stack"><p>Choose soft color tokens and optional decorations. Preview your palette on the page.</p>{[['pink', 'Pastel pink'], ['lavender', 'Lavender'], ['cream', 'Cream'], ['peach', 'Peach'], ['sky', 'Sky blue']].map(([key, label]) => <Field key={key} label={label}><input type="color" value={content.theme[key]} onChange={(e) => update(['theme', key], e.target.value)} /></Field>)}<label className="check-field"><input type="checkbox" checked={content.theme.animations} onChange={(e) => update(['theme', 'animations'], e.target.checked)} /> Enable gentle animations</label><label className="check-field"><input type="checkbox" checked={content.theme.decorations} onChange={(e) => update(['theme', 'decorations'], e.target.checked)} /> Show decorative sparkles</label><button className="button button-quiet fit" onClick={() => window.confirm('Restore the original pastel theme?') && update(['theme'], clone(defaultContent.theme))}>Restore original theme</button></div>}
      {active === 'Settings' && <div className="form-stack"><Field label="Site title"><input value={content.settings.title} onChange={(e) => update(['settings', 'title'], e.target.value)} /></Field><Field label="Description"><textarea value={content.settings.description} onChange={(e) => update(['settings', 'description'], e.target.value)} /></Field><Field label="Default language"><select value={content.settings.language} onChange={(e) => update(['settings', 'language'], e.target.value)}><option>English</option><option>मराठी</option></select></Field><Field label="Footer text"><input value={content.settings.footer} onChange={(e) => update(['settings', 'footer'], e.target.value)} /></Field>{Object.entries(content.settings.navLabels || defaultContent.settings.navLabels).map(([key, value]) => <Field label={`Navigation label: ${key}`} key={key}><input value={value} onChange={(e) => update(['settings', 'navLabels', key], e.target.value)} /></Field>)}<button className="button button-quiet fit" onClick={() => { if (!window.confirm('Restore default site settings?')) return; update(['settings'], clone(defaultContent.settings)); setWhatsAppDraft(DEFAULT_WHATSAPP_NUMBER) }}>Restore default site settings</button><p className="privacy-note">To change the recipient, use the WhatsApp Message Settings section.</p></div>}
      {active === 'WhatsApp Message Settings' && <div className="form-stack whatsapp-settings"><p>This recipient is used only when you explicitly choose to open WhatsApp. Changes are saved only in this browser.</p><Field label="Recipient phone number (international format)"><input aria-label="WhatsApp recipient number" inputMode="tel" autoComplete="tel" placeholder="+91 7558764877" value={whatsAppDraft} onChange={(e) => setWhatsAppDraft(e.target.value)} /></Field><div className="number-preview"><span>Live recipient preview</span><b aria-live="polite">{formatWhatsAppPreview(whatsAppDraft)}</b><small>India's country code is added automatically when you enter a 10-digit Indian number. You may also type a full number such as +91 7558764877.</small></div>{normalizeWhatsAppNumber(whatsAppDraft).error && <p className="error-text" role="alert">{normalizeWhatsAppNumber(whatsAppDraft).error}</p>}<div className="button-row"><button className="button button-primary" onClick={saveWhatsApp}>Save Settings</button><button className="button button-secondary" onClick={testWhatsApp}>Test WhatsApp Link</button><button className="button button-quiet" onClick={() => { if (!window.confirm('Restore the default India number (7558764877)?')) return; setWhatsAppDraft(DEFAULT_WHATSAPP_NUMBER); const next = clone(content); next.settings.whatsappNumber = DEFAULT_WHATSAPP_NUMBER; commit(next, 'Default WhatsApp number restored for this browser.') }}>Restore Default Number</button></div><p className="privacy-note">The final Click to Chat URL contains digits only. WhatsApp opens only after a button click and controls message delivery and read receipts.</p></div>}
      {active === 'Data tools' && <div className="form-stack"><p>Export only public site content as JSON. Private journal entries and thoughts are excluded.</p><button className="button button-primary fit" onClick={download}><Download size={16} /> Export public content</button><label className="button button-secondary fit upload-label"><Upload size={16} /> Choose compatible JSON file<input ref={fileRef} type="file" accept="application/json,.json" onChange={readImport} /></label>{importPreview && <div className="import-preview"><b>Import preview</b><p>{importPreview.letters.length} letters · {importPreview.reminders.length} reminders · {importPreview.mazeLevels.length} maze levels</p><button className="button button-primary" onClick={() => window.confirm('Replace current public content with this import?') && applyImport()}>Confirm replacement</button><button className="button button-quiet" onClick={() => setImportPreview(null)}>Cancel</button></div>}<p>Restore default seed content to undo local public-content edits. This does not clear private journal entries.</p>{confirmReset ? <div className="button-row"><span>Restore all public defaults?</span><button className="button button-danger" onClick={restore}>Yes, restore</button><button className="button button-quiet" onClick={() => setConfirmReset(false)}>Cancel</button></div> : <button className="button button-danger fit" onClick={() => setConfirmReset(true)}>Restore original seed content</button>}</div>}
    </div></div>
    {preview === 'letter' && currentLetter && <div className="dialog-backdrop"><section className="preview-dialog card" role="dialog" aria-modal="true" aria-labelledby="letter-preview-title"><button className="button button-quiet preview-close" onClick={() => setPreview('')} aria-label="Close letter preview">Close preview</button><span className="detail-envelope" aria-hidden="true">{currentLetter.emoji}</span><span className="eyebrow">{currentLetter.category} · {currentLetter.language} · {currentLetter.published ? 'Published' : 'Draft preview'}</span><h2 id="letter-preview-title">{currentLetter.title}</h2><div className="letter-body">{currentLetter.body ? currentLetter.body.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>) : <p>This draft does not have any letter text yet.</p>}</div></section></div>}
    {preview === 'maze' && currentMaze && <div className="dialog-backdrop"><section className="preview-dialog card" role="dialog" aria-modal="true" aria-labelledby="maze-preview-title"><button className="button button-quiet preview-close" onClick={() => setPreview('')} aria-label="Close maze preview">Close preview</button><h2 id="maze-preview-title">{currentMaze.name} · {currentMaze.difficulty}</h2><div className="maze-board" style={{ '--maze-columns': currentMaze.width }} role="grid" aria-label={`${currentMaze.name} maze preview`}>{Array.from({ length: currentMaze.height }, (_, y) => Array.from({ length: currentMaze.width }, (_, x) => { const start = currentMaze.start[0] === x && currentMaze.start[1] === y, end = currentMaze.end[0] === x && currentMaze.end[1] === y, wall = currentMaze.walls.some(([wx, wy]) => wx === x && wy === y); return <span role="gridcell" key={`${x}-${y}`} className={`maze-cell${wall ? ' wall' : ''}${start ? ' start' : ''}${end ? ' finish' : ''}`} aria-label={wall ? 'Wall' : start ? 'Start' : end ? 'Finish' : 'Open path'}>{start ? 'S' : end ? '✿' : ''}</span> }))}</div><p className={validateMaze(currentMaze) ? 'error-text' : 'success-text'}>{validateMaze(currentMaze) || 'A valid path connects start and finish.'}</p></section></div>}
    </section>
}

function Field({ label, children }) {
  return <label className="field"><span>{label}</span>{children}</label>
}

function LetterTopics({ content, onCreateLetter, onEditLetter, onBack }) {
  const [topic, setTopic] = useState('')
  const [notice, setNotice] = useState('')
  const topics = [...new Set(content.letters.map((letter) => letter.category.trim()).filter(Boolean))]
    .sort((first, second) => first.localeCompare(second))
  const create = (event) => {
    event.preventDefault()
    const name = topic.trim()
    if (!name) { setNotice('Enter a topic name to start a letter.'); return }
    if (topics.some((existing) => existing.toLowerCase() === name.toLowerCase())) {
      setNotice('That topic already exists. Choose it below to add a letter to it.')
      return
    }
    if (onCreateLetter(name)) setTopic('')
    else setNotice('The new topic could not be saved in this browser.')
  }

  return <section className="admin-wrap topics-editor">
    <div className="page-heading admin-heading">
      <span className="eyebrow">🛠️ LOCAL EDITOR</span>
      <h1>Letter topics</h1>
      <p>Group letters by topic so Arati can find the words that fit. Everything is saved only in this browser.</p>
    </div>
    <div className="admin-layout">
      <nav className="admin-tabs" aria-label="Content editor sections">
        <button onClick={onBack}>Overview</button>
        <button className="active" aria-current="page">Topics &amp; letters</button>
      </nav>
      <div className="admin-panel card">
        <div className="admin-panel-title"><h2>Topics &amp; letters</h2><span>Unpublished drafts stay private</span></div>
        <p className="topics-intro">A topic is the category shown on the letters page. Starting a letter creates an unpublished draft; it will not appear publicly until you finish it and publish it in the Letters editor.</p>
        <form className="topic-create-form" onSubmit={create}>
          <label className="field" htmlFor="new-letter-topic"><span>Create a new topic</span></label>
          <div className="topic-create-row">
            <input id="new-letter-topic" value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="For example, Little wins" maxLength={60} />
            <button className="button button-primary" type="submit">Start a letter in this topic</button>
          </div>
          {notice && <p className="notice" role="status">{notice}</p>}
        </form>
        <h3 className="topics-list-heading">Your topics <span>{topics.length}</span></h3>
        {topics.length ? <div className="topics-list">{topics.map((name) => {
          const letters = content.letters.filter((letter) => letter.category.trim() === name)
          return <section className="topic-card" key={name}>
            <div className="topic-card-heading"><div><span className="topic-icon">✿</span><h3>{name}</h3></div><span>{letters.length} {letters.length === 1 ? 'letter' : 'letters'}</span></div>
            <ul>{letters.map((letter) => <li key={letter.slug}>
              <span>{letter.title}<small>{letter.published ? 'Published' : 'Draft'}</small></span>
              <button className="button button-secondary" onClick={() => onEditLetter(letter.slug)}>Edit</button>
            </li>)}</ul>
            <button className="topic-add-letter" onClick={() => onCreateLetter(name)}>＋ Add another letter to {name}</button>
          </section>
        })}</div> : <p className="empty-state card">No topics yet. Create one above to start your first letter.</p>}
      </div>
    </div>
  </section>
}
