import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { ArrowRight, Camera, ImagePlus, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react'

export const MEMORIES_KEY = 'bestfriend.memories.v1'
const MAX_PHOTO_BYTES = 1_500_000

function readMemories() {
  try {
    const saved = localStorage.getItem(MEMORIES_KEY)
    if (!saved) return { items: [], error: '' }
    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed)) throw new Error('Saved scrapbook data is not a list.')
    const items = parsed.filter((item) => item && typeof item.id === 'string'
      && typeof item.caption === 'string' && typeof item.date === 'string'
      && typeof item.image === 'string' && item.image.startsWith('data:image/'))
    return { items, error: items.length === parsed.length ? '' : 'Some saved memories were invalid and were left out.' }
  } catch {
    return { items: [], error: 'Saved memories could not be read. You can start a fresh scrapbook.' }
  }
}

function createId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function emptyMemoryForm() {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return { caption: '', date: date.toISOString().slice(0, 10), image: '' }
}

function safeExternalUrl(value) {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

export default function Memories({ songs = [] }) {
  const reducedMotion = useReducedMotion()
  const [initial] = useState(readMemories)
  const [memories, setMemories] = useState(initial.items)
  const [notice, setNotice] = useState(initial.error)
  const [active, setActive] = useState(null)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [brokenPhotos, setBrokenPhotos] = useState([])
  const [form, setForm] = useState(emptyMemoryForm)
  const [formError, setFormError] = useState('')
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!editing && !active) return undefined
    dialogRef.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (editing) { setEditing(false); setFormError('') }
        else setActive(null)
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href]')]
      if (!focusable.length) { event.preventDefault(); return }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active, editing])

  const persist = (next, message) => {
    try {
      localStorage.setItem(MEMORIES_KEY, JSON.stringify(next))
      setMemories(next)
      setNotice(message)
      return true
    } catch {
      setNotice('This photo could not be saved. Try a smaller image or free some browser storage.')
      return false
    }
  }

  const openNew = () => {
    setActive(null)
    setForm(emptyMemoryForm())
    setFormError('')
    setEditing(true)
    setConfirmDelete(false)
  }

  const openMemory = (memory) => {
    setActive(memory)
    setForm({ caption: memory.caption, date: memory.date, image: memory.image })
    setEditing(false)
    setConfirmDelete(false)
    setFormError('')
  }

  const choosePhoto = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setFormError('Choose an image file to add to your scrapbook.')
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setFormError('Choose a photo smaller than 1.5 MB so it can be saved on this device.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm((current) => ({ ...current, image: reader.result }))
        setFormError('')
      } else setFormError('This image could not be read. Please choose another one.')
    }
    reader.onerror = () => setFormError('This image could not be read. Please choose another one.')
    reader.readAsDataURL(file)
  }

  const saveMemory = (event) => {
    event.preventDefault()
    if (!form.caption.trim()) {
      setFormError('Add a short caption before saving this memory.')
      return
    }
    if (!form.image) {
      setFormError('Choose a photo to finish this scrapbook memory.')
      return
    }
    const item = { id: active?.id || createId(), caption: form.caption.trim(), date: form.date, image: form.image }
    const next = active ? memories.map((memory) => memory.id === active.id ? item : memory) : [item, ...memories]
    if (persist(next, active ? 'Your memory was updated on this device.' : 'Your memory was added to this device.')) {
      setActive(item)
      setEditing(false)
      setFormError('')
    }
  }

  const removeMemory = () => {
    if (!active) return
    if (persist(memories.filter((memory) => memory.id !== active.id), 'Memory removed from this device.')) {
      setActive(null)
      setEditing(false)
      setConfirmDelete(false)
    }
  }
  const markPhotoBroken = (id) => setBrokenPhotos((items) => items.includes(id) ? items : [...items, id])

  return <section className="memories-page">
    <header className="memories-hero">
      <div className="memories-hero-copy"><span className="eyebrow"><Sparkles size={14} /> A LITTLE COLLECTION OF YOURS</span><h1>Our little scrapbook</h1><p>Keep the photos and moments you choose to remember. Add a real photo and a few words whenever you're ready.</p></div>
      <span className="memories-count" aria-live="polite"><b>{memories.length.toString().padStart(2, '0')}</b><span>{memories.length === 1 ? 'moment saved' : 'moments saved'}</span></span>
    </header>
    {notice && <p className="memory-notice" role="status">{notice}</p>}
    {memories.length ? <>
      <div className="memory-collection-heading"><div><span className="eyebrow">THE GOOD DAYS, BIG AND SMALL</span><h2>Your saved moments</h2></div><button className="button button-primary" onClick={openNew}><Plus size={16} /> Add a memory</button></div>
      <div className={`memory-grid${reducedMotion ? ' reduced-motion' : ''}`}>{memories.map((memory, index) => <article className={`polaroid polaroid-${index % 4}`} key={memory.id}><button className="polaroid-open" onClick={() => openMemory(memory)} aria-label={`View memory: ${memory.caption}`}>{brokenPhotos.includes(memory.id) ? <span className="photo-error" role="img" aria-label="Photo unavailable">Photo unavailable</span> : <img src={memory.image} alt={memory.caption} loading="lazy" onError={() => markPhotoBroken(memory.id)} />}<span className="polaroid-caption">{memory.caption}</span><time dateTime={memory.date}>{new Date(`${memory.date}T12:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</time><span className="polaroid-heart" aria-hidden="true">♡</span></button></article>)}</div>
    </> : <div className="memory-empty card"><div className="empty-scrapbook" aria-hidden="true"><span className="empty-tape" /><div className="empty-photo-frame"><Camera size={28} strokeWidth={1.4} /><span>A photo you choose</span><i>♡</i></div><span className="empty-scrapbook-note">a little moment, kept</span></div><div className="memory-empty-copy"><span className="eyebrow">PAGE ONE IS WAITING</span><h2>A blank page, saved just for you.</h2><p>Your scrapbook starts with the moments that matter to you. Add a photo and a caption when you're ready—nothing here is pre-filled or presented as a shared memory.</p><button className="button button-primary" onClick={openNew}><ImagePlus size={17} /> Add your first memory <ArrowRight size={16} /></button><small>Your photos stay in this browser on this device.</small></div></div>}
    {songs.length > 0 && <section className="song-section"><span className="eyebrow">A LITTLE SOUNDTRACK</span><h2>Songs you picked</h2><div className="song-grid">{songs.filter((song) => song && song.title && song.artist).map((song) => <article className="song-card card" key={`${song.title}-${song.artist}`}><span aria-hidden="true">♫</span><div><h3>{song.title}</h3><p>{song.artist}</p>{song.caption && <small>{song.caption}</small>}</div>{safeExternalUrl(song.url) && <a className="button button-quiet" href={safeExternalUrl(song.url)} target="_blank" rel="noopener noreferrer">Listen externally</a>}</article>)}</div></section>}
    <p className="local-memory-note"> </p>

    {editing && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) { setEditing(false); setFormError('') } }}><section ref={dialogRef} tabIndex={-1} className="memory-dialog card" role="dialog" aria-modal="true" aria-labelledby="memory-editor-title"><button className="dialog-close" onClick={() => setEditing(false)} aria-label="Close memory editor"><X size={19} /></button><span className="eyebrow">A PAGE IN YOUR SCRAPBOOK</span><h2 id="memory-editor-title">{active ? 'Edit this memory' : 'Add a memory'}</h2><form onSubmit={saveMemory}><label className="field"><span>Photo</span><input aria-label="Choose a photo" type="file" accept="image/*" onChange={choosePhoto} />{form.image && <img className="memory-form-preview" src={form.image} alt="Preview of the selected memory" />}</label><label className="field"><span>Caption</span><textarea rows="3" maxLength="180" value={form.caption} onChange={(event) => setForm((current) => ({ ...current, caption: event.target.value }))} placeholder="A few words about this moment…" /></label><label className="field"><span>Date</span><input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} /></label>{formError && <p role="alert" className="status-line error-line">{formError}</p>}<div className="button-row"><button type="submit" className="button button-primary">Save memory</button><button type="button" className="button button-quiet" onClick={() => { setEditing(false); setFormError('') }}>Cancel</button></div></form></section></div>}

    {active && !editing && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setActive(null) }}><article ref={dialogRef} tabIndex={-1} className="memory-lightbox card" role="dialog" aria-modal="true" aria-labelledby="memory-detail-title"><button className="dialog-close" onClick={() => setActive(null)} aria-label="Close memory"><X size={19} /></button>{brokenPhotos.includes(active.id) ? <span className="photo-error photo-error-large" role="img" aria-label="Photo unavailable">Photo unavailable</span> : <img src={active.image} alt={active.caption} onError={() => markPhotoBroken(active.id)} />}<div className="memory-lightbox-copy"><time dateTime={active.date}>{new Date(`${active.date}T12:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</time><h2 id="memory-detail-title">{active.caption}</h2><div className="button-row"><button className="button button-secondary" onClick={() => { setEditing(true); setConfirmDelete(false) }}><Pencil size={15} /> Edit</button><button className="button button-danger" onClick={() => setConfirmDelete(true)}><Trash2 size={15} /> Delete</button></div>{confirmDelete && <div className="memory-confirm-delete" role="group" aria-label="Confirm memory deletion"><p>Remove this memory from this device?</p><button className="button button-danger" onClick={removeMemory}>Yes, delete it</button><button className="button button-quiet" onClick={() => setConfirmDelete(false)}>Keep it</button></div>}</div></article></div>}
  </section>
}
