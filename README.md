# A Little Place for Arati 💗

A responsive, browser-only little world for kind notes, reminders, three small games, and private writing. Editable website content and personal drafts stay in the current browser; there is no application server, database, analytics, or cloud sync.

## Requirements

- Node.js 20.19+ (or 22.12+)
- npm 10+

## Install and run

```sh
npm install
npm run dev
```

Vite prints the local development URL. The site uses React, Vite, Tailwind CSS, React Router, Motion for React, and Lucide icons.

## Checks

```sh
npm test
npm run lint
npm run build
```

## Deploying to Netlify

Publish the `dist` directory after running `npm run build`. The `public/_redirects` rule is copied into the build output so direct visits and refreshes on app routes (including `/superadmin25`) load the SPA instead of returning a 404.

## Features

- Home, Little World, Happiness Corner, Letters, Memories, Surprise, Games, Reminders, Share Thoughts, Private Journal, and Local Editor pages, plus a friendly not-found route.
- A first-visit animated welcome with a staged, interactive letter reveal, skip control, and a replay option on the home page.
- An empty-by-default scrapbook for adding, viewing, editing, and deleting real photos with captions and dates. Photos are size-checked and stored only in this browser.
- A replayable gift reveal, mood responses, a compliment generator, and small non-clinical happiness prompts.
- Thirteen complete seed letters, search, categories, previous/next navigation, published/draft visibility, and browser-local favorites.
- Temporary feelings selection; it is not saved or transmitted.
- Word search with nine configurable words, validated placement, endpoint selection, hints, progress, and restart.
- Snake with selectable slow, normal, and fast speeds; chess and tic-tac-toe can be played against the computer or offline with a friend.
- Falling-block puzzle with collision checks, rotation, row clearing, keyboard/touch controls, pause/restart, and a local best score.
- Three BFS-verified maze levels with keyboard/touch movement, timer, hints, restart, completion, and local unlocked-level progress.
- Shufflable and filterable reminders, favorites, and copy-to-clipboard feedback.
- Journal entry create/edit/delete/clear controls. Entries stay in browser local storage and are not encrypted or password-protected.
- Share Thoughts drafts are saved locally only on request. WhatsApp opens only after an explicit click; the message is prefilled for review and is never sent by the website.
- A browser-local content editor for home, letters, reminders, puzzle settings, maze levels, theme, site settings, WhatsApp recipient settings, and public-content import/export.
- Mobile navigation and controls, keyboard focus indicators, reduced-motion CSS, and a light/dark display toggle.

## Project layout

```text
src/
  App.jsx                Routes, shared navigation, welcome, home, and interactive pages
  App.css                Responsive design system and component styling
  Gift.css               Gift experience, scrapbook, and happiness corner styles
  Memories.jsx           Local-only scrapbook with validated photo uploads
  Memories.test.jsx      Scrapbook persistence and management tests
  Admin.jsx              Browser-local content editor and public data tools
  Games.jsx              Game pages and interactive game components
  data.js                Seed letters, reminders, maze levels, and defaults
  gameEngines.js         Word-search, BFS maze, and block-grid logic
  storage.js             Versioned local storage and public-export filtering
  whatsapp.js            Recipient validation and Click to Chat URL helpers
  App.test.jsx           UI and interaction tests
  gameEngines.test.js    Content and engine tests
  whatsapp.test.jsx      WhatsApp URL, settings, and interaction tests
```

## Editing content

Personalization lives in `src/data.js` under `defaultContent.personalization` (name, greeting, introduction, compliments, surprise message, and optional songs). Update those values to make the welcome and gift feel like yours. Keep `songs` empty until you have a song and artist you actually want to share. Add memories from **Memories**; there are no pre-filled photographs or invented shared moments.

The scrapbook uses the `bestfriend.memories.v1` browser-local storage key, separate from the public content editor. Large photos are rejected to avoid filling browser storage. If a browser's local storage is cleared, its photos and captions are removed too.

Open **Local editor** in the footer or navigate to `/superadmin25` (the previous `/superadmin` URL also works). It is intentionally not password-protected: anyone with access to the same browser profile can open it. Edits stay in that browser and are not shared with another device or visitor.

- **Letters** creates, edits, publishes, reorders, previews, and deletes letters. Drafts do not appear in the public collection.
- **Reminders** edits, reorders, and restores initial reminders.
- **Word search** changes the nine unique target names and grid size. Validation runs before settings are saved.
- **Maze** edits dimensions and coordinate lists. A level is saved only when its start and finish differ and BFS confirms a route.
- **Home**, **Blocks**, **Theme**, and **Settings** edit their displayed values.
- **Data tools** downloads or previews a compatible version 1 JSON file before an import is confirmed. Exports contain public site content only; journal entries and private thought drafts are excluded.

## Browser storage and privacy

Editable content, favorites, game scores/progress, and explicitly saved thought drafts use `localStorage`. Browser storage can be cleared, may be unavailable or full, and is scoped to the current browser profile. There is no cross-device synchronization. Back up public content with **Local editor → Data tools → Export public content**.

Journal entries are stored only in this browser. They are not encrypted or password-protected, and may be lost if browser data is cleared or the user changes devices. Do not use the journal as the sole copy of important information. Journal entries are separate from the content editor and public-content export.

WhatsApp is optional. Its initial recipient is `7558764877`; a 10-digit number is treated as an Indian number and receives country code `91`. Change the receiver in **Local editor → WhatsApp Message Settings** using a 10-digit Indian number or a full international number (optionally starting with `+`). The editor previews the destination, and the Share Thoughts page shows which number will receive the message. This setting is saved only in that browser; to change the default receiver for every visitor, update `settings.whatsappNumber` in `src/data.js` and redeploy. On phones, the user-activated WhatsApp link opens in the current tab so the WhatsApp app can launch if installed; on desktop it opens in a new tab. The prefilled message opens addressed to the saved number for review; the recipient must press Send in WhatsApp. The website does not send or track delivery, and private journal entries are never included.

## Resetting content

In **Local editor → Data tools**, choose **Restore original seed content** and confirm. This resets editable public website content but does not clear private journal entries, saved thoughts, game scores, or favorites. Clear those local items separately from their pages or game settings. Clearing browser storage may remove all local changes.
