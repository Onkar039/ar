# A Little Place for Arati 💗

A responsive little world for kind notes, reminders, games, and private writing. Public site content can be shared across devices through Supabase; personal drafts and journal entries remain in the current browser.

## Requirements

- Node.js 20.19+ (or 22.12+)
- npm 10+

## Install and run

```sh
npm install
npm run dev
```

To enable shared editing locally, copy `.env.example` to `.env.local` and set the Supabase project URL and publishable (or anon) key. Without these values, the site continues in browser-local mode. Vite prints the local development URL. The site uses React, Vite, Tailwind CSS, React Router, Motion for React, Lucide icons, and Supabase.

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
- Authenticated Superadmin editing with shared Supabase content, so published changes appear on other devices.
- Mobile navigation and controls, keyboard focus indicators, reduced-motion CSS, and a light/dark display toggle.

## Project layout

```text
src/
  App.jsx                Routes, shared navigation, welcome, home, and interactive pages
  App.css                Responsive design system and component styling
  Gift.css               Gift experience, scrapbook, and happiness corner styles
  Memories.jsx           Local-only scrapbook with validated photo uploads
  Memories.test.jsx      Scrapbook persistence and management tests
  Admin.jsx              Authenticated shared/local content editor and public data tools
  Games.jsx              Game pages and interactive game components
  data.js                Seed letters, reminders, maze levels, and defaults
  gameEngines.js         Word-search, BFS maze, and block-grid logic
  storage.js             Versioned local storage and public-export filtering
  sharedContent.js       Supabase shared-content and authentication client
  whatsapp.js            Recipient validation and Click to Chat URL helpers
  App.test.jsx           UI and interaction tests
  gameEngines.test.js    Content and engine tests
  whatsapp.test.jsx      WhatsApp URL, settings, and interaction tests
supabase/
  schema.sql             Shared content tables and row-level security policies
```

## Editing content

Personalization lives in `src/data.js` under `defaultContent.personalization` (name, greeting, introduction, compliments, surprise message, and optional songs). Update those values to make the welcome and gift feel like yours. Keep `songs` empty until you have a song and artist you actually want to share. Add memories from **Memories**; there are no pre-filled photographs or invented shared moments.

The scrapbook uses the `bestfriend.memories.v1` browser-local storage key, separate from the public content editor. Large photos are rejected to avoid filling browser storage. If a browser's local storage is cleared, its photos and captions are removed too.

Open **Local editor** in the footer or navigate to `/superadmin25` (the previous `/superadmin` URL also works). With Supabase configured, sign in with an admin account to publish shared changes. Without Supabase configuration, the editor works in browser-local mode only.

- **Letters** creates, edits, publishes, reorders, previews, and deletes letters. Drafts do not appear in the public collection.
- **Reminders** edits, reorders, and restores initial reminders.
- **Word search** changes the nine unique target names and grid size. Validation runs before settings are saved.
- **Maze** edits dimensions and coordinate lists. A level is saved only when its start and finish differ and BFS confirms a route.
- **Home**, **Blocks**, **Theme**, and **Settings** edit their displayed values.
- **Data tools** downloads or previews a compatible version 1 JSON file before an import is confirmed. Exports contain public site content only; journal entries and private thought drafts are excluded.

## Shared content setup with Supabase

1. Create a Supabase project and run [`supabase/schema.sql`](./supabase/schema.sql) in its SQL Editor.
2. In Supabase Authentication, keep public sign-ups disabled and create an email/password user for the site administrator.
3. Add that user's UUID to the admin allow-list by running the following SQL, replacing the placeholder with the UUID shown for that user in Supabase Authentication:

   ```sql
   insert into public.site_admins (user_id)
   values ('AUTH_USER_UUID');
   ```

4. Copy the Supabase Project URL and publishable (or anon) key into a local `.env.local` file (start from `.env.example`):

   ```text
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
   ```

5. Add those same variables to Netlify's environment variables for the deploy context, then redeploy. These are public client settings; **never put a Supabase service-role/secret key in the frontend or Netlify client build variables**.
6. Open `/superadmin25`, sign in, and select **Publish current content to all devices** to publish the current site's content for the first time. Later edits sync automatically. Other open pages refresh shared content about every 15 seconds and when focused.

The database policies allow everyone to read public website content, but only UUIDs listed in `site_admins` can change it. Add or remove administrator access by adding or deleting rows from that table. The dashboard must keep public user sign-ups disabled.

## Browser storage and privacy

Published site content, including the configured WhatsApp receiver, is stored in Supabase and is visible to site visitors on all devices. Admin sign-in credentials and session tokens are handled by Supabase Auth. Favorites, game scores/progress, and explicitly saved thought drafts remain in browser `localStorage`. Back up public content with **Superadmin → Data tools → Export public content**.

Journal entries and scrapbook photos stay only in the current browser. They are not encrypted or password-protected, and may be lost if browser data is cleared or the user changes devices. Do not use them as the sole copy of anything important. Private journal entries and thoughts are excluded from shared content and public-content exports.

If Supabase is not configured, content edits remain local to the current browser and will not sync to another device. WhatsApp is optional. Its initial receiver is `7558764877`; a 10-digit number is treated as an Indian number and receives country code `91`. Change it in **Superadmin → WhatsApp Message Settings**; this setting is shared with every visitor when Supabase is configured. On phones, the user-activated WhatsApp link opens in the current tab so the WhatsApp app can launch if installed; on desktop it opens in a new tab. WhatsApp pre-fills the message for review; the sender must tap Send. The website does not send or track delivery.

## Resetting content

In **Local editor → Data tools**, choose **Restore original seed content** and confirm. This resets editable public website content but does not clear private journal entries, saved thoughts, game scores, or favorites. Clear those local items separately from their pages or game settings. Clearing browser storage may remove all local changes.
