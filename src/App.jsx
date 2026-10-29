import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowRight, BookHeart, Check, Heart, Menu, Moon, Search, Shuffle, Sun, X } from 'lucide-react'
import { BallBounce, BlockPuzzle, GamesHub, Maze, MemoryMatch, PageHeading, SnakeGame, TicTacToe, WordSearch } from './Games'
import { defaultContent } from './data'
import Memories, { MEMORIES_KEY } from './Memories'
import { loadContent, storage } from './storage'
import { buildWhatsAppUrl, formatWhatsAppPreview, getWhatsAppLinkTarget } from './whatsapp'
import { fetchSharedContent, sharedContentEnabled } from './sharedContent'
import './App.css'

const Admin = lazy(() => import('./Admin'))
const ChessGame = lazy(() => import('./ChessGame'))

const feelings = [
  { id: 'happy', title: 'Happy', icon: '😊', note: 'I hope you let yourself enjoy this moment, just as it is. You deserve to feel good without needing to explain why.' },
  { id: 'sad', title: 'Sad', icon: '🌧️', note: "It's okay if today feels a little heavier. You don't have to fix everything at once." },
  { id: 'overthinking', title: 'Overthinking', icon: '🌷', note: 'Take a breath. You can slow down and look at one thing at a time.' },
  { id: 'comfort', title: 'Need comfort', icon: '🫂', note: "You deserve gentleness, even when you don't feel your best." },
  { id: 'overwhelmed', title: 'Feeling overwhelmed', icon: '☁️', note: 'One small next step is enough. It is okay to pause, ask for help, or set something aside.' },
  { id: 'listen', title: 'Need someone to listen', icon: '💌', note: 'You can share as much or as little as you like. You do not need perfect words.' },
  { id: 'proud', title: 'Proud of myself', icon: '🌟', note: "Give yourself a moment to appreciate how far you've come." },
  { id: 'exploring', title: 'Just exploring', icon: '🦋', note: 'Welcome in. You can wander through this little world at your own pace.' },
]

function Site() {
  const [content, setContent] = useState(() => loadContent() || structuredClone(defaultContent))
  const [sharedSyncState, setSharedSyncState] = useState(sharedContentEnabled ? 'loading' : 'local')
  const [sharedSyncError, setSharedSyncError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [dark, setDark] = useState(() => storage.get('arati.theme.dark', false))
  const [welcomeDone, setWelcomeDone] = useState(false)
  const location = useLocation()
  useEffect(() => {
    if (!sharedContentEnabled) return undefined
    let active = true
    let fetching = false
    const refresh = async () => {
      if (fetching) return
      fetching = true
      try {
        const sharedContent = await fetchSharedContent()
        if (!active) return
        if (sharedContent) setContent(sharedContent)
        setSharedSyncState(sharedContent ? 'ready' : 'empty')
        setSharedSyncError('')
      } catch (error) {
        if (!active) return
        setSharedSyncState('error')
        setSharedSyncError(error.message)
      } finally {
        fetching = false
      }
    }
    refresh()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh()
    }, 15000)
    window.addEventListener('focus', refresh)
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [])
  const savedPersonalization = content.personalization
  const personalization = savedPersonalization && typeof savedPersonalization === 'object' && !Array.isArray(savedPersonalization)
    ? {
      ...defaultContent.personalization,
      ...savedPersonalization,
      name: typeof savedPersonalization.name === 'string' && savedPersonalization.name.trim() ? savedPersonalization.name.trim() : defaultContent.personalization.name,
      greeting: typeof savedPersonalization.greeting === 'string' ? savedPersonalization.greeting : defaultContent.personalization.greeting,
      introduction: typeof savedPersonalization.introduction === 'string' ? savedPersonalization.introduction : defaultContent.personalization.introduction,
      surpriseMessage: typeof savedPersonalization.surpriseMessage === 'string' ? savedPersonalization.surpriseMessage : defaultContent.personalization.surpriseMessage,
      compliments: Array.isArray(savedPersonalization.compliments) ? savedPersonalization.compliments.filter((item) => typeof item === 'string') : defaultContent.personalization.compliments,
      songs: Array.isArray(savedPersonalization.songs) ? savedPersonalization.songs.filter((song) => song && typeof song.title === 'string' && typeof song.artist === 'string') : [],
    }
    : defaultContent.personalization
  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduced ? 'instant' : 'smooth' })
  }, [location.pathname])
  useEffect(() => {
    const theme = content.theme || defaultContent.theme
    const root = document.documentElement
    root.style.setProperty('--pink', theme.pink)
    root.style.setProperty('--lavender', theme.lavender)
    root.style.setProperty('--cream', theme.cream)
    root.style.setProperty('--peach', theme.peach)
    root.style.setProperty('--sky', theme.sky)
    root.dataset.motion = theme.animations ? 'on' : 'off'
    root.dataset.decorations = theme.decorations ? 'on' : 'off'
    root.dataset.theme = dark ? 'dark' : 'light'
    storage.set('arati.theme.dark', dark)
  }, [content.theme, dark])
  useEffect(() => {
    document.title = personalizeText(content.settings.title || defaultContent.settings.title, personalization.name || defaultContent.personalization.name)
    const description = document.querySelector('meta[name="description"]')
    if (description) description.setAttribute('content', content.settings.description || defaultContent.settings.description)
  }, [content.settings.description, content.settings.title, personalization.name])
  const labels = { ...defaultContent.settings.navLabels, ...content.settings.navLabels }
  const links = [
    [labels.home, '/'], [labels.world, '/little-world'], [labels.feelings, '/feelings'], [labels.letters, '/letters'],
    [labels.memories, '/memories'], [labels.games, '/games'],
    [labels.reminders, '/reminders'], [labels.thoughts, '/share-thoughts'], [labels.journal, '/private-journal'],
  ]
  const notSaved = !localStorageUsable()
  return <div className="site">
    <header className="site-header"><Link className="brand" to="/" aria-label={`A Little Place for ${personalization.name} home`}><span className="brand-mark">♡</span><span>A Little Place <small>for {personalization.name}</small></span></Link><button className="menu-toggle" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X /> : <Menu />}</button><nav className={`main-nav${menuOpen ? ' open' : ''}`} aria-label="Main navigation">{links.map(([label, path]) => <NavLink key={path} to={path} end={path === '/'} onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{label}</NavLink>)}<button className="theme-toggle" onClick={() => setDark((value) => !value)} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button></nav></header>
    {notSaved && <div className="storage-banner" role="status">Browser storage is unavailable. Your changes may not be saved on this device.</div>}
    {sharedContentEnabled && sharedSyncState !== 'ready' && <div className="storage-banner" role={sharedSyncState === 'error' ? 'alert' : 'status'}>{sharedSyncState === 'loading' ? 'Connecting to shared site content…' : sharedSyncState === 'empty' ? 'Shared content has not been published yet. Showing the default site until an admin publishes it.' : sharedSyncError}</div>}
    <main className="main-content"><AnimatePresence mode="wait"><motion.div key={location.pathname} className="route-content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.2 }}><Routes>
      <Route path="/" element={<Home content={content} onReplay={() => setWelcomeDone(false)} />} />
      <Route path="/little-world" element={<LittleWorld />} />
      <Route path="/feelings" element={<Feelings personalization={personalization} />} />
      <Route path="/letters" element={<Letters content={content} />} />
      <Route path="/letters/:slug" element={<LetterDetail content={content} />} />
      <Route path="/memories" element={<Memories songs={Array.isArray(personalization.songs) ? personalization.songs : []} />} />
      <Route path="/surprise" element={<Surprise personalization={personalization} />} />
      <Route path="/games" element={<GamesHub />} />
      <Route path="/games/block-puzzle" element={<BlockPuzzle content={content} />} />
      <Route path="/games/word-search" element={<WordSearch config={content.wordSearch} />} />
      <Route path="/games/maze" element={<Maze levels={content.mazeLevels} />} />
      <Route path="/games/chess" element={<Suspense fallback={<p className="studio-loading" role="status">Setting up the chess board…</p>}><ChessGame /></Suspense>} />
      <Route path="/games/snake" element={<SnakeGame />} />
      <Route path="/games/ball-bounce" element={<BallBounce />} />
      <Route path="/games/tic-tac-toe" element={<TicTacToe />} />
      <Route path="/games/memory-match" element={<MemoryMatch />} />
      <Route path="/reminders" element={<Reminders items={content.reminders} />} />
      <Route path="/share-thoughts" element={<ShareThoughts settings={content.settings} />} />
      <Route path="/private-journal" element={<PrivateJournal />} />
      <Route path="/superadmin" element={<Suspense fallback={<p className="studio-loading" role="status">Opening the content studio…</p>}><Admin content={content} onContent={setContent} sharedContentEnabled={sharedContentEnabled} onSharedContentSaved={() => setSharedSyncState('ready')} /></Suspense>} />
      <Route path="/superadmin25" element={<Suspense fallback={<p className="studio-loading" role="status">Opening the content studio…</p>}><Admin content={content} onContent={setContent} sharedContentEnabled={sharedContentEnabled} onSharedContentSaved={() => setSharedSyncState('ready')} /></Suspense>} />
      <Route path="*" element={<NotFound />} />
    </Routes></motion.div></AnimatePresence></main>
    <footer className="site-footer"><div className="footer-flower" aria-hidden="true">✿</div><p>{content.settings.footer}</p><span>A soft reminder: go at your own pace.</span></footer>
    <AnimatePresence>{location.pathname === '/' && !welcomeDone && <WelcomeExperience personalization={personalization} onEnter={() => {
      setWelcomeDone(true)
    }} />}</AnimatePresence>
  </div>
}

function localStorageUsable() {
  try { const key = 'arati.storage.check'; localStorage.setItem(key, '1'); localStorage.removeItem(key); return true } catch { return false }
}

function personalizeText(value, name) {
  return typeof value === 'string' ? value.replace(/Arati/g, name) : value
}

function WelcomeExperience({ personalization, onEnter }) {
  const reducedMotion = useReducedMotion()
  const [typed, setTyped] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [letterStage, setLetterStage] = useState(0)
  const [flying, setFlying] = useState([])
  const [sparkle, setSparkle] = useState(false)
  const timers = useRef([])
  const name = personalization.name || defaultContent.personalization.name
  const heading = `Hey ${name}… 💗`
  const schedule = (callback, delay) => {
    const timer = window.setTimeout(callback, delay)
    timers.current.push(timer)
  }
  useEffect(() => {
    if (reducedMotion) return undefined
    let index = 0
    const typing = window.setInterval(() => {
      index += 1
      setTyped(heading.slice(0, index))
      if (index >= heading.length) {
        window.clearInterval(typing)
        schedule(() => setRevealed(true), 420)
      }
    }, 68)
    return () => {
      window.clearInterval(typing)
      timers.current.forEach((timer) => window.clearTimeout(timer))
      timers.current = []
    }
  }, [reducedMotion, heading])
  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer))
    timers.current = []
  }, [])
  const openLetter = () => {
    if (letterStage !== 0) return
    setLetterStage(1)
    if (reducedMotion) { setLetterStage(5); return }
    schedule(() => setLetterStage(2), 320)
    schedule(() => setLetterStage(3), 760)
    schedule(() => setLetterStage(4), 1250)
    schedule(() => setLetterStage(5), 1900)
  }
  const clickHeart = (id) => {
    setFlying((items) => [...items, id])
    window.setTimeout(() => setFlying((items) => items.filter((item) => item !== id)), 1100)
  }
  return <motion.section className="welcome-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-label={`Welcome to ${name}'s little world`}>
    <div className="welcome-sky" onPointerMove={(event) => {
      const rect = event.currentTarget.getBoundingClientRect()
      event.currentTarget.style.setProperty('--pointer-x', `${(event.clientX - rect.left) / rect.width}`)
      event.currentTarget.style.setProperty('--pointer-y', `${(event.clientY - rect.top) / rect.height}`)
    }}>
      <div className="welcome-cloud cloud-left" /><div className="welcome-cloud cloud-right" />
      {Array.from({ length: 7 }, (_, index) => <button key={`heart-${index}`} className={`welcome-heart heart-${index % 5}${flying.includes(index) ? ' heart-flying' : ''}`} onClick={() => clickHeart(index)} aria-label="Let a little heart float away">♥</button>)}
      {Array.from({ length: 6 }, (_, index) => <button key={`star-${index}`} className={`welcome-star star-${index % 6}${sparkle ? ' star-flash' : ''}`} onClick={() => { setSparkle(true); schedule(() => setSparkle(false), 700) }} aria-label="Make a star sparkle">✦</button>)}
      <div className="welcome-window-glow" />
      <motion.div className="welcome-scene" style={{ '--pointer-x': '.5', '--pointer-y': '.5' }}>
        <div className="welcome-shelf"><span>♡</span><span>✿</span><span>☆</span></div>
        <div className="welcome-character" role="img" aria-label="A cozy smiling flower friend waving hello"><span className="character-sun">🌼</span><span className="character-face">☺</span><span className="character-wave">👋</span></div>
        <div className="welcome-books"><i>Kindness</i><i>Good Days</i><i>Big Dreams</i></div>
        <span className="welcome-cat" role="img" aria-label="A sleepy cat">🐈</span>
      </motion.div>
      <div className="welcome-copy">
        <motion.h1 aria-label={heading}>{reducedMotion ? heading : typed}<span className="typing-caret" aria-hidden="true">|</span></motion.h1>
        <AnimatePresence>{(reducedMotion || revealed) && <motion.div className="welcome-intro" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .65 }}>
          <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .15 }}>{personalization.greeting || 'A little world made just for you.'}</motion.h2>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .5 }}>{personalization.introduction || defaultContent.personalization.introduction}</motion.p>
        </motion.div>}</AnimatePresence>
        <motion.div className={`welcome-letter-stage stage-${letterStage}`}>
          <AnimatePresence mode="wait">
            {letterStage < 5 ? <motion.div key="envelope" className="welcome-envelope-wrap" initial={{ opacity: 0, y: 20 }} animate={{ opacity: reducedMotion || revealed ? 1 : .65, y: reducedMotion || revealed ? 0 : 10 }} exit={{ opacity: 0, y: -45, rotate: -6, scale: .82 }} transition={{ duration: .55 }}>
              <button className="welcome-envelope" onClick={openLetter} disabled={!(reducedMotion || revealed) || letterStage > 0} aria-label="Open your waiting welcome letter" aria-expanded={letterStage > 0}>
                <span className="envelope-back" /><span className="envelope-paper">A little note<br />just for you</span><span className="envelope-flap" /><span className="envelope-front" /><span className={`heart-seal${letterStage >= 2 ? ' seal-open' : ''}`}>♥</span>
              </button>
              <p className="envelope-instruction">{letterStage === 0 ? 'You have a little letter waiting for you… 💌' : letterStage < 5 ? 'A little surprise is unfolding… ✨' : ''}</p>
            </motion.div> : <motion.article className="welcome-letter-card" key="letter-card" initial={{ opacity: 0, y: 70, rotateX: 18, scale: .85 }} animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }} transition={{ type: 'spring', damping: 19, stiffness: 110 }} aria-label={`Welcome letter for ${name}`}>
              <span className="letter-corner-flower">✿</span><div className="welcome-letter-text"><p>Dear {name}, 💗</p><p>Welcome to your little world!</p><p>{personalization.introduction || defaultContent.personalization.introduction} I hope this corner offers a smile, a little comfort, and a reminder that you deserve kindness and beautiful things.</p><p>Explore, read a little letter, or simply stay here for a moment. There's no rush—take your time.</p><p>With lots of love,<br />Your best friend 💌</p></div><button className="button button-primary welcome-enter" onClick={onEnter}>Open your little surprise <ArrowRight size={16} /></button></motion.article>}
          </AnimatePresence>
          {letterStage >= 2 && letterStage < 5 && <div className="letter-sparkles" aria-hidden="true">✧　♥　✦　♡　✧</div>}
        </motion.div>
      </div>
      <button className="welcome-skip" onClick={onEnter}>Skip welcome <ArrowRight size={15} /></button>
      <span className="welcome-bottom-flower" aria-hidden="true">🌷</span>
    </div>
  </motion.section>
}

function Home({ content, onReplay }) {
  const [message, setMessage] = useState(0)
  const [floatingHearts, setFloatingHearts] = useState([0, 1, 2])
  const [sparkleStar, setSparkleStar] = useState('')
  const [comfortOpen, setComfortOpen] = useState(false)
  const [letterOpen, setLetterOpen] = useState(false)
  const [parallax, setParallax] = useState({ x: 0, y: 0 })
  const name = content.personalization?.name || defaultContent.personalization.name
  const savedMemories = storage.get(MEMORIES_KEY, [])
  const featuredMemory = Array.isArray(savedMemories) ? savedMemories.find((memory) => memory && typeof memory.caption === 'string' && typeof memory.date === 'string' && typeof memory.image === 'string' && memory.image.startsWith('data:image/')) : null
  useEffect(() => {
    if (content.home.messages.length < 2) return undefined
    const timer = window.setInterval(() => setMessage((index) => (index + 1) % content.home.messages.length), 6000)
    return () => window.clearInterval(timer)
  }, [content.home.messages.length])
  const dismissHeart = (heart) => {
    setFloatingHearts((items) => items.filter((item) => item !== heart))
    window.setTimeout(() => setFloatingHearts((items) => items.includes(heart) ? items : [...items, heart]), 1500)
  }
  const cards = [
    { emoji: '📷', title: 'Our Memories', subtitle: 'Add a little moment', to: '/memories', tone: 'memory-tile' },
    { emoji: '💌', title: 'Open When…', subtitle: 'Words for every moment', to: '/letters', tone: 'letter-tile' },
    { emoji: '🌷', title: 'Happiness Corner', subtitle: 'A softer moment', to: '/feelings', tone: 'reminder-tile' },
    { emoji: '🎁', title: 'A Little Surprise', subtitle: 'There is a gift for you', to: '/surprise', tone: 'surprise-tile' },
  ]
  return <div className="home-page magical-home">
    <section className="home-welcome-hero" onPointerMove={(event) => {
      const rect = event.currentTarget.getBoundingClientRect()
      setParallax({ x: ((event.clientX - rect.left) / rect.width - .5) * 12, y: ((event.clientY - rect.top) / rect.height - .5) * 10 })
    }}>
      <div className="parallax-hearts" aria-label="Floating hearts">
        <AnimatePresence>{floatingHearts.map((heart) => <motion.button key={heart} className={`parallax-heart ph-${heart % 7}`} aria-label="Let a heart float away" initial={{ opacity: 1 }} animate={{ y: [0, -12, 0], x: [0, 4, 0] }} transition={{ duration: 4 + heart % 3, repeat: Infinity }} exit={{ y: -90, opacity: 0, scale: 1.6 }} onClick={() => dismissHeart(heart)}>♥</motion.button>)}</AnimatePresence>
        {['✦', '✧', '✶', '✧'].map((star, index) => <button key={index} className={`home-star hs-${index}${sparkleStar === String(index) ? ' sparkle-now' : ''}`} aria-label="Make a star sparkle" onClick={() => { setSparkleStar(String(index)); window.setTimeout(() => setSparkleStar(''), 650) }}>{star}</button>)}
      </div>
      <div className="home-illustration" style={{ '--parallax-x': `${parallax.x}px`, '--parallax-y': `${parallax.y}px` }} aria-label="A cheerful flower friend waving hello beside a sleepy cat and books" role="img">
        <div className="home-shelf-books"><i>Kindness</i><i>Good Days</i><i>Big Dreams</i><i>You Got This</i></div>
        <div className="home-friend"><span className="friend-flower">🌼</span><span className="friend-face">☺</span><span className="friend-hand">👋</span></div>
        <div className="sleepy-cat">🐈<small>z z z</small></div><div className="book-stack"><i>Little joys</i><i>Soft days</i><i>Dream a little</i></div>
      </div>
      <div className="home-greeting">
        <span className="eyebrow">A LITTLE CORNER JUST FOR YOU</span>
        <h1>{(content.home.heading || defaultContent.home.heading).replace(/Arati/g, name)}</h1>
        <p>{content.home.subtitle}</p>
        <div className="button-row home-hero-actions"><Link className="button button-glow" to="/little-world">✧ {content.home.exploreLabel}</Link><button className="button button-comfort" onClick={() => setComfortOpen(true)}>♥ Need a little comfort?</button></div>
        <button className="replay-welcome" onClick={onReplay}>Open your welcome letter again 💌</button>
      </div>
      <button className="hero-letter-invite" onClick={() => setLetterOpen(true)} aria-label="Open the welcome letter again"><span className="invite-letter">You are<br />amazing,<br />{name} <b>♥</b></span><span className="invite-envelope">💌</span></button>
    </section>
    <div className="home-quick-cards">{cards.map((card) => <Link className={`home-quick-card ${card.tone}`} to={card.to} key={card.to}><span className="quick-emoji">{card.emoji}</span><b>{card.title}</b><small>{card.subtitle}</small><span className="quick-arrow">→</span></Link>)}</div>
    <section className={`memory-invitation card${featuredMemory ? ' has-featured-memory' : ''}`}>{featuredMemory ? <div className="memory-feature-image"><img src={featuredMemory.image} alt={featuredMemory.caption} loading="lazy" onError={(event) => { event.currentTarget.hidden = true }} /><span>Photo unavailable</span></div> : <div className="memory-invitation-art" aria-hidden="true">♡</div>}<div><span className="eyebrow">{featuredMemory ? 'A MOMENT YOU SAVED' : 'YOUR SCRAPBOOK'}</span><h2>{featuredMemory ? featuredMemory.caption : 'A space for the moments that are yours.'}</h2><p>{featuredMemory ? `Saved on ${new Date(`${featuredMemory.date}T12:00:00`).toLocaleDateString()}. Add more moments whenever you feel like it.` : 'No memories are pre-filled. Add a photo and a caption whenever you feel like saving a moment.'}</p><Link className="text-link" to="/memories">{featuredMemory ? 'Visit your scrapbook' : 'Start your scrapbook'} <ArrowRight size={16} /></Link></div></section>
    <motion.section className="home-message" key={message} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><button aria-label="Send this heart floating away" onClick={(event) => { event.currentTarget.classList.add('heart-fly-away'); window.setTimeout(() => event.currentTarget?.classList.remove('heart-fly-away'), 800) }}>♥</button><p>{content.home.messages[message] || 'You are enough, just as you are. 💗'}</p><button aria-label="Send this heart floating away" onClick={(event) => { event.currentTarget.classList.add('heart-fly-away'); window.setTimeout(() => event.currentTarget?.classList.remove('heart-fly-away'), 800) }}>♥</button></motion.section>
    <div className="home-lower-links"><Link to="/letters">Read a little letter <ArrowRight size={15} /></Link><Link to="/games">Play a little game <ArrowRight size={15} /></Link><Link to="/reminders">Find a gentle reminder <ArrowRight size={15} /></Link></div>
    {comfortOpen && <div className="dialog-backdrop comfort-backdrop"><motion.section className="comfort-dialog card" role="dialog" aria-modal="true" aria-labelledby="comfort-title" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><button className="dialog-close" onClick={() => setComfortOpen(false)} aria-label="Close comfort screen"><X /></button><span>☁️</span><h2 id="comfort-title">Take one slow breath, {name}.</h2><p>You don't have to solve everything right now. Let your shoulders soften. One small next step—or a quiet pause—is enough.</p><Link className="button button-primary" to="/feelings">Choose how you feel 🌷</Link></motion.section></div>}
    {letterOpen && <div className="dialog-backdrop"><motion.article className="home-letter-dialog card" role="dialog" aria-modal="true" aria-labelledby="home-letter-title" initial={{ opacity: 0, y: 30, scale: .94 }} animate={{ opacity: 1, y: 0, scale: 1 }}><button className="dialog-close" onClick={() => setLetterOpen(false)} aria-label="Close welcome letter"><X /></button><span className="detail-envelope">💌</span><h2 id="home-letter-title">A little note for you, {name}</h2><p>Welcome to your little world! I hope this tiny corner brings you a smile, a little comfort, and a reminder that you deserve kind things. Explore at your own pace. 🌷</p><button className="button button-primary" onClick={() => setLetterOpen(false)}>Close this little letter</button></motion.article></div>}
  </div>
}

function SectionHeader({ kicker, title, link, linkText }) {
  return <div className="section-heading"><div><span className="eyebrow">{kicker}</span><h2>{title}</h2></div>{link && <Link className="text-link" to={link}>{linkText} <ArrowRight size={16} /></Link>}</div>
}

function LetterCard({ letter, favorite = false, onFavorite }) {
  return <article className="letter-card card"><Link to={`/letters/${letter.slug}`} className="letter-card-link"><span className="envelope" aria-hidden="true">{letter.emoji || '💌'}</span><span className="letter-category">{letter.category}</span><h2>{letter.title}</h2><span className="read-note">Open this letter <ArrowRight size={15} /></span></Link>{onFavorite && <button className={`favorite-button${favorite ? ' favorited' : ''}`} onClick={() => onFavorite(letter.slug)} aria-label={favorite ? 'Remove letter from favorites' : 'Add letter to favorites'}><Heart size={18} fill={favorite ? 'currentColor' : 'none'} /></button>}</article>
}

function LittleWorld() {
  return <><PageHeading emoji="🌷" title="A little world, made with a lot of care 🌷" intro="This is a small place to relax, read kind words, play a little, and take a pause from a difficult day." /><div className="world-grid"><article className="card world-card"><span>📖</span><h2>Kind words, whenever</h2><p>Letters and reminders are here for the moments you want a gentle thought nearby.</p><Link to="/letters">Browse the letters →</Link></article><article className="card world-card"><span>🎮</span><h2>A playful pause</h2><p>Try a little puzzle or find a path through a garden. There is no score to compare.</p><Link to="/games">Visit the games →</Link></article><article className="card world-card"><span>🌙</span><h2>Room for your own thoughts</h2><p>Your journal stays in this browser. Write only what feels comfortable to keep here.</p><Link to="/private-journal">Visit your journal →</Link></article></div><div className="world-note">There is no right way to use this space. You can explore, pause, or leave and come back whenever you like. ✨</div></>
}

function Feelings({ personalization }) {
  const [selected, setSelected] = useState(null)
  const [compliment, setCompliment] = useState('')
  const [tinyJoy, setTinyJoy] = useState('')
  const feeling = feelings.find((item) => item.id === selected)
  const link = selected === 'sad' || selected === 'comfort' || selected === 'overwhelmed' ? ['/letters/difficult-day', 'A letter for a difficult day'] : selected === 'overthinking' ? ['/letters/overthinking', 'A letter about overthinking'] : selected === 'proud' ? ['/letters/proud-of-yourself', 'Celebrate your progress'] : selected === 'listen' ? ['/share-thoughts', 'Write some thoughts'] : ['/reminders', 'A gentle reminder']
  const compliments = personalization.compliments?.length ? personalization.compliments : defaultContent.personalization.compliments
  const makeSmile = () => {
    const options = compliments.filter((item) => item !== compliment)
    setCompliment(options[Math.floor(Math.random() * options.length)] || compliments[0])
  }
  const tinyJoyMessages = ['Stretch your shoulders and enjoy one slow breath.', 'Put on a song you love and listen to just the first minute.', 'Step outside or look out of a window for a little change of scene.', 'Make yourself a cozy drink and take the first sip without rushing.']
  const findTinyJoy = () => setTinyJoy(tinyJoyMessages[Math.floor(Math.random() * tinyJoyMessages.length)])
  const name = personalization.name || defaultContent.personalization.name
  return <><PageHeading emoji="♡" title={`How are you feeling today, ${name}?`} intro="There is no right answer. Choose whatever feels closest, or just explore." /><div className="feelings-grid">{feelings.map((item) => <button key={item.id} className={`feeling-card${selected === item.id ? ' selected' : ''}`} onClick={() => setSelected(item.id)} aria-pressed={selected === item.id}><span>{item.icon}</span><b>{item.title}</b></button>)}</div>{feeling && <motion.section className="card feeling-response" initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }}><span className="response-emoji">{feeling.icon}</span><h2>A little note for you</h2><p>{feeling.note}</p><div className="button-row"><Link className="button button-primary" to={link[0]}>{link[1]} <ArrowRight size={16} /></Link><Link className="button button-quiet" to="/games">Take a small play break</Link></div><small>Your choice is temporary and is not saved or shared.</small></motion.section>}<section className="happiness-tools"><article className="happiness-tool card"><span className="eyebrow">A LITTLE KINDNESS</span><h2>Make me smile</h2><p>{compliment || 'A kind thought, whenever you need one.'}</p><button className="button button-secondary" onClick={makeSmile}>Show me a kind thought <Heart size={16} /></button></article><article className="happiness-tool card"><span className="eyebrow">A TINY PAUSE</span><h2>Tiny happiness generator</h2><p>{tinyJoy || 'A small, gentle idea for a brighter moment.'}</p><button className="button button-secondary" onClick={findTinyJoy}>Find a tiny joy <Shuffle size={16} /></button></article></section><p className="happiness-note">A comforting corner, not a substitute for support from people you trust.</p></>
}

function Surprise({ personalization }) {
  const [opened, setOpened] = useState(false)
  const reducedMotion = useReducedMotion()
  const name = personalization.name || defaultContent.personalization.name
  return <section className={`surprise-page${opened ? ' is-open' : ''}`}>
    <PageHeading emoji="✧" title="A little something, just for you" intro="No guessing, no rush. Open this whenever you're ready." />
    <div className="surprise-stage card">
      <div className="surprise-sparkles" aria-hidden="true">{opened ? '✦　✧　♡　✧　✦' : '✧　✦　✧'}</div>
      <motion.div className="gift-illustration" animate={reducedMotion ? {} : opened ? { rotate: [0, -5, 5, 0], scale: [1, 1.08, 1] } : { y: [0, -5, 0] }} transition={opened || reducedMotion ? { duration: .65 } : { duration: 3, repeat: Infinity }}>
        <span className="gift-bow">♡</span><span className="gift-lid" /><span className="gift-box"><i /></span>
      </motion.div>
      <motion.div key={opened ? 'message' : 'sealed'} className="surprise-message" initial={reducedMotion ? false : { opacity: 0, y: opened ? 15 : -8 }} animate={{ opacity: 1, y: 0 }}><span className="eyebrow">{opened ? `A NOTE FOR ${name.toUpperCase()}` : 'SEALED WITH A LITTLE LOVE'}</span><h2>{opened ? 'Just in case you needed a little reminder…' : 'A small reminder, tucked inside.'}</h2><p>{opened ? personalization.surpriseMessage || defaultContent.personalization.surpriseMessage : "Whenever you're ready, there's a kind thought waiting for you."}</p>{opened && <span className="surprise-signoff">With care, always ♡</span>}</motion.div>
      <button className="button button-primary surprise-action" onClick={() => setOpened((value) => !value)}>{opened ? 'Wrap it up and open again' : 'Open your surprise'} <Heart size={16} /></button>
    </div>
    <p className="surprise-replay-note">You can replay this little moment as often as you like.</p>
  </section>
}

function Letters({ content }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [favorites, setFavorites] = useState(() => storage.get('arati.letters.favorites', []))
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const name = content.personalization?.name || defaultContent.personalization.name
  const published = content.letters.filter((letter) => letter.published)
  const categories = ['All', ...new Set(published.map((letter) => letter.category).filter(Boolean))]
  const visible = published.filter((letter) => (category === 'All' || letter.category === category) && (!onlyFavorites || favorites.includes(letter.slug)) && `${letter.title} ${letter.category} ${letter.body}`.toLowerCase().includes(query.toLowerCase()))
  const toggleFavorite = (slug) => setFavorites((items) => { const next = items.includes(slug) ? items.filter((item) => item !== slug) : [...items, slug]; storage.set('arati.letters.favorites', next); return next })
  return <><PageHeading emoji="💌" title="A few kind words, whenever you need them" intro="Choose a little envelope and open it when it feels right. You can take your time." /><div className="letter-controls"><label className="search-box"><Search size={17} /><input type="search" placeholder="Search letters" value={query} onChange={(e) => setQuery(e.target.value)} /></label><label className="select-label"><span>Category</span><select value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><button className={`button ${onlyFavorites ? 'button-primary' : 'button-secondary'}`} onClick={() => setOnlyFavorites((value) => !value)}><Heart size={16} fill={onlyFavorites ? 'currentColor' : 'none'} /> Favorites</button></div>{visible.length ? <div className="preview-grid">{visible.map((letter) => <LetterCard key={letter.slug} letter={{ ...letter, title: personalizeText(letter.title, name) }} favorite={favorites.includes(letter.slug)} onFavorite={toggleFavorite} />)}</div> : <div className="empty-state card">No letters match just now. Try another search or category. 💗</div>}</>
}

function LetterDetail({ content }) {
  const { slug } = useParams()
  const navigate = useNavigate()
  const name = content.personalization?.name || defaultContent.personalization.name
  const sourceLetter = content.letters.find((item) => item.slug === slug && item.published)
  const letter = sourceLetter && { ...sourceLetter, title: personalizeText(sourceLetter.title, name), body: personalizeText(sourceLetter.body, name) }
  const lettersList = content.letters.filter((item) => item.published)
  const index = lettersList.findIndex((item) => item.slug === slug)
  const [favorite, setFavorite] = useState(() => storage.get('arati.letters.favorites', []).includes(slug))
  if (!letter) return <NotFound />
  const setFav = () => { const saved = storage.get('arati.letters.favorites', []); const next = favorite ? saved.filter((item) => item !== slug) : [...saved, slug]; storage.set('arati.letters.favorites', next); setFavorite(!favorite) }
  return <article className="letter-detail card"><Link to="/letters" className="text-link back-link">← Back to all letters</Link><div className="detail-envelope" aria-hidden="true">{letter.emoji || '💌'}</div><span className="eyebrow">{letter.category} · {letter.language}</span><h1>{letter.title}</h1><button className={`button button-secondary favorite-detail${favorite ? ' favorited' : ''}`} onClick={setFav}><Heart size={16} fill={favorite ? 'currentColor' : 'none'} /> {favorite ? 'Saved to favorites' : 'Save as a favorite'}</button><div className="letter-body">{letter.body.split(/\n\s*\n/).map((paragraph, i) => <p key={i}>{paragraph}</p>)}</div><div className="button-row letter-pager"><button disabled={index <= 0} className="button button-quiet" onClick={() => navigate(`/letters/${lettersList[index - 1]?.slug}`)}>← Previous letter</button><button disabled={index >= lettersList.length - 1} className="button button-secondary" onClick={() => navigate(`/letters/${lettersList[index + 1]?.slug}`)}>Next letter →</button></div></article>
}

function Reminders({ items }) {
  const [current, setCurrent] = useState(() => items[Math.floor(Math.random() * items.length)])
  const [category, setCategory] = useState('All')
  const [favorites, setFavorites] = useState(() => storage.get('arati.reminders.favorites', []))
  const [status, setStatus] = useState('')
  const categories = ['All', ...new Set(items.map((item) => item.category).filter(Boolean))]
  const available = items.filter((item) => category === 'All' || item.category === category)
  const visibleCurrent = available.find((item) => item.id === current?.id) || available[0]
  const shuffle = () => {
    const alternatives = available.filter((item) => item.id !== visibleCurrent?.id)
    setCurrent(alternatives[Math.floor(Math.random() * alternatives.length)] || available[0])
    setStatus('')
  }
  const toggleFavorite = () => {
    if (!visibleCurrent) return
    const next = favorites.includes(visibleCurrent.id) ? favorites.filter((item) => item !== visibleCurrent.id) : [...favorites, visibleCurrent.id]
    if (storage.set('arati.reminders.favorites', next)) { setFavorites(next); setStatus(next.includes(visibleCurrent.id) ? 'Added to your favorites 💗' : 'Removed from favorites.') }
    else setStatus('Could not save your favorite in this browser.')
  }
  const copy = async () => {
    if (!visibleCurrent) return
    try { await navigator.clipboard.writeText(visibleCurrent.text); setStatus('Copied to your clipboard ✨') }
    catch { setStatus('Clipboard access is unavailable. You can select and copy the reminder.') }
  }
  return <><PageHeading emoji="🌷" title="Little reminders for your heart 🌷" intro="A gentle thought can be a good companion. Keep the ones that feel helpful." /><div className="reminder-tools"><label className="select-label"><span>Filter by category</span><select value={category} onChange={(e) => { setCategory(e.target.value); setStatus('') }}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label></div>{visibleCurrent && <motion.div className="reminder-feature card" key={visibleCurrent.id} initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }}><span className="reminder-sparkle">✧</span><span className="eyebrow">{visibleCurrent.category}</span><blockquote>“{visibleCurrent.text}”</blockquote><span className="reminder-sparkle">✿</span><div className="button-row"><button className="button button-primary" onClick={shuffle}><Shuffle size={16} /> Another reminder</button><button className="button button-secondary" onClick={toggleFavorite}><Heart size={16} fill={favorites.includes(visibleCurrent.id) ? 'currentColor' : 'none'} /> {favorites.includes(visibleCurrent.id) ? 'Favorited' : 'Favorite'}</button><button className="button button-quiet" onClick={copy}>Copy reminder</button></div>{status && <p className="status-line" role="status"><Check size={15} /> {status}</p>}</motion.div>}<h2 className="subsection-title">Keep close</h2><div className="reminder-list">{items.filter((item) => favorites.includes(item.id)).map((item) => <div className="reminder-row card" key={item.id}><Heart size={16} fill="currentColor" /><span>{item.text}</span><small>{item.category}</small></div>)}{!favorites.length && <p className="muted">Your favorites will stay in this browser.</p>}</div></>
}

export function ShareThoughts({ settings }) {
  const [text, setText] = useState(() => storage.get('arati.thoughts.draft', ''))
  const [selectedFeeling, setSelectedFeeling] = useState('')
  const [includeFeeling, setIncludeFeeling] = useState(true)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const feeling = feelings.find((item) => item.id === selectedFeeling)
  const composedMessage = [includeFeeling && feeling ? `How I'm feeling: ${feeling.title} ${feeling.icon}` : '', text.trim()]
    .filter(Boolean)
    .join('\n\n')
  const whatsappShare = buildWhatsAppUrl(settings.whatsappNumber, composedMessage)
  const whatsappTarget = getWhatsAppLinkTarget(navigator.userAgent, navigator.platform, navigator.maxTouchPoints)
  const keep = () => {
    if (storage.set('arati.thoughts.draft', text)) setStatus('Your draft was kept in this browser. It was not sent anywhere.')
    else setStatus('Could not save this draft. Please check browser storage.')
    setError('')
  }
  const shareOnWhatsApp = (event) => {
    if (whatsappShare.error) {
      event.preventDefault()
      setError(whatsappShare.error)
      setStatus('')
      return
    }
    setError('')
    setStatus('Your message is ready to share in WhatsApp. Review it there and tap Send.')
  }
  const clear = () => {
    if ((text || selectedFeeling) && !window.confirm('Clear your message and selected feeling? This only clears the current form.')) return
    setText('')
    setSelectedFeeling('')
    setIncludeFeeling(true)
    setStatus('')
    setError('')
  }
  return <><PageHeading emoji="💗" title="Whenever you're ready, I'm here to listen 💗" intro="You can share whatever is on your mind. Write it in your own words—there's no need to make it perfect. 🌷" /><section className="card thought-card share-thought-card"><fieldset className="feeling-picker" aria-describedby="feeling-help"><legend>How are you feeling today?</legend><p id="feeling-help">Choose one if you like. You can share a feeling without writing a message.</p><div className="feeling-choice-grid">{feelings.map((item) => <label key={item.id} className={`feeling-choice${selectedFeeling === item.id ? ' selected' : ''}`}><input type="radio" name="share-feeling" value={item.id} checked={selectedFeeling === item.id} onChange={() => { setSelectedFeeling(item.id); setStatus(''); setError('') }} /><span aria-hidden="true">{item.icon}</span><b>{item.title}</b></label>)}</div></fieldset>{feeling && <label className="include-feeling"><input type="checkbox" checked={includeFeeling} onChange={(event) => { setIncludeFeeling(event.target.checked); setStatus(''); setError('') }} /><span>Include “{feeling.title}” in the WhatsApp message</span></label>}<label className="field"><span>Your message <small>(optional when sharing a feeling)</small></span><textarea className="thought-editor" rows="9" aria-describedby="thought-count thought-privacy" value={text} onChange={(e) => { setText(e.target.value); setStatus(''); setError('') }} placeholder="Start wherever you like…" /></label><div className="thought-meta"><span id="thought-count" aria-live="polite">{text.length} characters</span><button className="text-button" onClick={clear}>Clear message</button></div><div className="button-row"><button className="button button-private" onClick={keep}>Keep privately 🌙</button>{whatsappShare.url ? <a className="button button-whatsapp" href={whatsappShare.url} target={whatsappTarget} rel="noopener noreferrer" onClick={shareOnWhatsApp}>Share on WhatsApp 💚</a> : <button className="button button-whatsapp" onClick={shareOnWhatsApp}>Share on WhatsApp 💚</button>}</div><p className="whatsapp-recipient">Receiver: <strong>{formatWhatsAppPreview(settings.whatsappNumber)}</strong> <span>Change this in Superadmin → WhatsApp Message Settings.</span></p><p className="privacy-note" id="thought-privacy">On a phone, WhatsApp opens in the current tab so the app can launch if installed. Review the prefilled message and tap Send. The website cannot send it automatically. Your feeling is temporary and is not saved with your draft; your private journal is never included.</p>{error && <p role="alert" className="status-line error-line">{error}</p>}{status && <p role="status" className="status-line">{status}</p>}</section></>
}

function PrivateJournal() {
  const [initialJournal] = useState(() => {
    try {
      const value = localStorage.getItem('arati.journal.entries')
      const entries = value ? JSON.parse(value) : []
      if (!Array.isArray(entries)) throw new Error('Invalid journal data')
      return { entries: entries.filter((entry) => entry && typeof entry.id === 'string' && typeof entry.body === 'string'), error: '' }
    } catch {
      return { entries: [], error: 'Your saved entries could not be read. Browser storage may be unavailable or the data may be invalid.' }
    }
  })
  const [entries, setEntries] = useState(initialJournal.entries)
  const [storageError, setStorageError] = useState(initialJournal.error)
  const [activeId, setActiveId] = useState(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [status, setStatus] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const save = (next) => {
    try {
      localStorage.setItem('arati.journal.entries', JSON.stringify(next))
      setEntries(next); setStatus('Saved only in this browser.'); setStorageError('')
      return true
    } catch { setStorageError('Could not save. Browser storage may be full or unavailable. Your changes were not saved.'); return false }
  }
  const newEntry = () => { setActiveId(null); setTitle(''); setBody(''); setStatus('') }
  const openEntry = (entry) => { setActiveId(entry.id); setTitle(entry.title); setBody(entry.body); setStatus('') }
  const saveEntry = () => {
    if (!body.trim() && !title.trim()) { setStatus('Write a little something before saving.'); return }
    const now = new Date().toISOString()
    const next = activeId ? entries.map((entry) => entry.id === activeId ? { ...entry, title: title.trim() || 'A little note', body, updated: now } : entry) : [{ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, title: title.trim() || 'A little note', body, created: now, updated: now }, ...entries]
    if (save(next) && !activeId) setActiveId(next[0].id)
  }
  const removeEntry = (id) => {
    if (!window.confirm('Delete this journal entry from this browser?')) return
    if (save(entries.filter((entry) => entry.id !== id)) && activeId === id) newEntry()
  }
  const clearAll = () => {
    if (save([])) { newEntry(); setConfirmClear(false); setStatus('All journal entries were cleared from this browser.') }
  }
  return <><PageHeading emoji="🌙" title="A little space for your thoughts 🌙" intro="A calm, private-to-this-browser place to write. Keep only what feels comfortable." /><div className="journal-warning"><BookHeart size={18} /><p>Entries are stored in this browser only. They are not encrypted or password-protected, and may be lost if browser data is cleared or you change devices. Do not use this as your only copy of anything important.</p></div>{storageError && <p className="error-text" role="alert">{storageError}</p>}<div className="journal-layout"><aside className="journal-sidebar card"><button className="button button-primary full-width" onClick={newEntry}>＋ New entry</button><h2>Your entries <span>{entries.length}</span></h2>{entries.length ? entries.map((entry) => <div className={`journal-entry-link${entry.id === activeId ? ' active' : ''}`} key={entry.id}><button onClick={() => openEntry(entry)}><b>{entry.title || 'A little note'}</b><small>{new Date(entry.updated || entry.created).toLocaleDateString()}</small><span>{entry.body.slice(0, 72) || 'An empty page'}</span></button><button aria-label={`Delete ${entry.title || 'entry'}`} onClick={() => removeEntry(entry.id)}>×</button></div>) : <p className="muted">A fresh page is waiting whenever you are.</p>}{entries.length > 0 && <button className="button button-danger full-width" onClick={() => setConfirmClear(true)}>Clear all entries</button>}</aside><section className="journal-editor card"><label className="field"><span>Title (optional)</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A little title" /></label><label className="field"><span>Your words</span><textarea rows="14" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write at your own pace…" /></label><div className="button-row"><button className="button button-primary" onClick={saveEntry}>Save entry</button>{activeId && <button className="button button-quiet" onClick={newEntry}>New blank page</button>}</div>{status && <p className="status-line" role="status">{status}</p>}</section></div>{confirmClear && <div className="dialog-backdrop" role="presentation"><section className="confirm-dialog card" role="alertdialog" aria-modal="true" aria-labelledby="clear-title"><h2 id="clear-title">Clear all journal entries?</h2><p>This removes every saved entry from this browser. This cannot be undone.</p><div className="button-row"><button className="button button-danger" onClick={clearAll}>Clear all entries</button><button className="button button-quiet" onClick={() => setConfirmClear(false)}>Keep entries</button></div></section></div>}</>
}

function NotFound() {
  return <div className="not-found card"><span>☁️</span><h1>Oh, this little path stops here.</h1><p>That page couldn't be found. Let's find another soft spot.</p><Link className="button button-primary" to="/">Go home <ArrowRight size={16} /></Link></div>
}

function App() { return <BrowserRouter><Site /></BrowserRouter> }
export default App
