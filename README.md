# Infinite Today — Бесконечное сегодня

An interactive music laboratory where every song becomes a world: a star map of
seven musical worlds, audio-reactive visuals, and a living digital gallery.

**Live:** https://kudriashovsv-spec.github.io/InfiniteToday/

## What is Infinite Today?

Infinite Today turns a catalogue of original music into a navigable universe.
Each song is a world with its own scene, several recorded versions and lyrics.
Moving between worlds happens on a cosmic map; inside a world the music plays and
reacts visually in real time. A separate gallery collects the visual art created
around the music.

The project is both a music release and a creative playground: it experiments
with audio-reactive visuals, playback that survives navigation, and a content
model where songs, versions, lyrics and artwork are data rather than hand-written
pages.

## Features

### Seven musical worlds

**Поиск · Мечтай · Дети Солнц · Оправданная надежда · Время не торопи · Братья · Поворот туда**

All seven are reached from a cosmic map. On narrow screens the map becomes a list
of world cards.

### Music

- 40 canonical track versions across the worlds
- a global player on the entry screen that keeps playing while you navigate
- a per-world player on each world page
- play / pause, seeking, volume and mute
- explicit loading, failed and retry states
- keyboard shortcuts (Space, arrows, `M`, `N`, `P`)
- only one audible source at a time
- Media Session metadata and OS media controls

### Audio visualization

- **Butterchurn** — the main visualizer, with a shared library of presets
- **Audio DNA** — an alternative visualizer used as a fallback when Butterchurn
  (WebGL2) is unavailable
- both share one audio graph, and the visualizer slot shows exactly one
  visualizer at a time (Audio DNA is not an overlay on top of Butterchurn)

### Gallery

- 11 categories, 99 works, 291 WebP runtime variants
- masonry layout with lazy loading
- lightbox with keyboard and touch controls
- history-aware navigation (browser Back closes the lightbox)

### Sharing

- native Web Share API for the home screen and each world
- Clipboard fallback when Web Share is unavailable
- the shared link is always the production `/InfiniteToday` URL

### Discovery

- per-page titles and descriptions, with one canonical URL per page
- Open Graph and Twitter/X cards, using each world's existing artwork
- prerendered `sitemap.xml` and `robots.txt`

### Analytics

- privacy-friendly GoatCounter pageviews and custom events
- no cookies, no persistent identifiers, no fingerprinting
- disabled in development; the site works fully without it

## Architecture

```text
SvelteKit 3
    │
    ├── routes            real URLs: /, /space, /world/[slug], /gallery
    ├── components        reusable UI
    ├── data layer        worlds, music, lyrics, gallery, presets
    ├── audio layer       one AudioContext, active source, playback coordination
    ├── Butterchurn       WebGL music visualizer
    ├── Audio DNA         alternative / fallback visualizer
    └── Gallery           artwork subsystem
```

Highlights:

- **Data-driven worlds.** A single reusable `WorldView` renders all seven worlds
  from the data layer; there is no per-world page copy.
- **Dynamic route.** Worlds are served through `/world/[slug]` and prerendered
  for every existing slug.
- **Shared audio.** One `AudioContext` and one audio graph serve every player;
  the visualizer follows the currently active source.
- **Persistent global playback.** The global player lives in the app layout, so
  it survives navigation between the entry screen, the map, worlds and the
  gallery.
- **Static output.** The whole site is prerendered and deployed as plain static
  files under the `/InfiniteToday` base path.
- **Metadata and analytics are client-safe.** Per-page SEO metadata is rendered at
  build time, and analytics loads client-side only — so the static output keeps
  working even when the analytics provider is blocked or unavailable.

## Technology

- SvelteKit 3 (`@sveltejs/kit`)
- Svelte 5
- Vite
- `@sveltejs/adapter-static`
- TypeScript (strict) — components, routes, data layer and the audio core
- `svelte-check` for type checking
- Web Audio API
- Media Session API
- GoatCounter (privacy-friendly, cookie-less analytics)
- Butterchurn (WebGL visualizer)
- Plain JavaScript deliberately kept in the two visualizer runtime modules
  (`src/lib/audio/butterchurn.js`, `src/lib/audio/audio-dna.js`)
- GitHub Actions + GitHub Pages

## Project structure

```text
src/
  lib/
    components/   reusable UI (world view, players, visualizers, gallery, …)
    data/         worlds, 40-track music registry, lyrics, gallery, presets
    audio/        shared audio graph, playback coordination, visualizers
  routes/         /, /space, /world/[slug], /gallery
static/           runtime assets: images, music, gallery WebP, visualizer vendor
.github/          GitHub Actions deployment workflow
```

## Local development

Install dependencies and start the dev server (with the app under the
`/InfiniteToday` base path):

```bash
npm install
npm run dev
```

Build and preview the production output:

```bash
npm run build
npm run preview
```

Type-check the project (components, routes and TypeScript modules):

```bash
npm run check
```

The site is served from the base path `/InfiniteToday`, in both development and
the production build.

## Deployment

Deployment is done with GitHub Actions and the official GitHub Pages artifact
model — there is no build branch:

```text
source branch
    ↓
GitHub Actions
    ↓
npm ci
    ↓
npm run build
    ↓
adapter-static  →  build/
    ↓
upload Pages artifact
    ↓
GitHub Pages
```

The workflow builds a selected source ref and publishes only the `build/`
directory as the Pages artifact. Node 24 is used for the build.

## Migration

Infinite Today started as a single monolithic HTML/CSS/JS site. It was migrated
step by step into a component-based SvelteKit project with a clear separation of
concerns:

> reusable UI + data-driven content + isolated subsystems

Music, worlds, the visualizers and the gallery were each moved into their own
subsystem instead of being duplicated across pages, while the look and behaviour
of the original were preserved.

The codebase was then migrated to TypeScript under `strict` mode: the data layer,
the audio core, the routes and all Svelte components are typed, and
`svelte-check` runs against them. The two visualizer runtime modules
(`src/lib/audio/butterchurn.js` and `src/lib/audio/audio-dna.js`) intentionally
stay plain JavaScript for now — they were not rewritten just to satisfy the type
checker.

## Status

- SvelteKit migration completed; the SvelteKit site is now production
- TypeScript migration completed (components, routes, data layer, audio core)
- player UX, Media Session, SEO, Web Share and privacy-friendly analytics shipped
- published to GitHub Pages and served from the `/InfiniteToday` base path
- validated on desktop and mobile

There are no required tasks left. Optional future work (for example migrating the
two visualizer runtime modules to TypeScript) is tracked in `TODO.md`.
