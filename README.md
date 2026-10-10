# Infinite Today — Бесконечное сегодня

An interactive music laboratory where every song becomes a world: a star map of
musical worlds, audio-reactive visuals, and a living digital gallery.

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

### Musical worlds

**Поиск · Мечтай · Дети Солнц · Оправданная надежда · Время не торопи · Братья · Поворот туда · Бешеная · Дота виновата · Здравствуй в первый раз · Спуск · Потерять себя · Антисага · Теория всего**

All fourteen are reached from a cosmic map. On narrow screens the map becomes a list
of world cards in a fixed mobile order.

### Music

- 40 canonical track versions across the worlds (14 worlds)
- favorites: a heart on every track VERSION — in the desktop and mobile L1 catalog (rightmost
  column, next to the download button) and in the version player on L3 — stored in
  `localStorage` (survives reloads) and shared by every view
- a «Избранное» filter mode in the DNA filter menu (last entry, red heart marker, available on
  desktop and on mobile): it replaces the morphology selection, lists only favorites, drives the
  play queue, shuffle and prefetch, and shows a hint when nothing is favorited yet
- a shuffle mode on the L1 player (button between the time readout and the volume control): it
  permutes the active queue (filter-aware), keeps the playing track first so it never restarts,
  plays every track once and stops at the end of the cycle
- a global player on the entry screen that keeps playing while you navigate
- an author-curated L1 order for the 40-track library (not alphabetical)
- a per-track download link next to each library row
- a per-world player on each world page
- play / pause, seeking, volume and mute
- explicit loading, failed and retry states
- keyboard shortcuts (Space, arrows, `M`, `N`, `P`)
- only one audible source at a time
- Media Session: play/pause and previous/next track controls, with Lock Screen
  metadata and a single shared artwork
- a DNA filter in the L1 library, on desktop and on mobile (one state, one menu): multi-select
  of the six morphologies (union / OR) with a selected count on the `Фильтр DNA` button, plus an
  «Все DNA» reset command; the mobile button is the compact variant of the same control in the
  panel head above the player; the filter labels are Russian and come from the shared morphology
  metadata; the «Избранное» entry is last and available on both platforms
- the filter also drives the play queue: next / previous / auto-advance stay
  inside the selected morphologies
- before any playback the filter shows only matching tracks; the first Play starts
  the first matching track (the selected default track is not silently played)
- a played or paused track stays visible in the list even if it does not match
- a cautious next-track prefetch: about 12 s before the end of the current track
  one candidate is fetched into the HTTP cache (cancelled when the track or the
  filter changes, disabled under Save-Data and 2G/slow-2G)

### Song DNA — the main visual language of a world

- every world version has an author-defined DNA: 8 conceptual axes
  (Свет, Тепло, Глубина, Воздух, Движение, Напряжение, Интимность, Странность)
  with manual values 0–100
- 6 morphologies give the silhouette its character:
  **Bloom · Star · Crystal · Pulse · Spiral · Void**
- morphology metadata (name, colour, description) has a single source in
  `src/lib/data/dna.ts` (`MORPHOLOGIES` · `MORPHOLOGY_ORDER` · `getMorphology()`);
  the Russian `filterLabel` used by the L1 DNA filter lives in that same source
- 23 versions have a full 8-axis DNA; the other 17 library-only versions have an
  author-assigned morphology (from the author's `DNA.txt`) with no invented axes; every
  world version has a full DNA, because L3 renders the DNA from those axes
- the morphology name is shown above the DNA and coloured from that same source:
  on desktop it follows `selectedDnaId`, on mobile the currently playing version
- the values drive the individual shape, the morphology drives the geometric
  language (petal profile, facets, twist, waves) and the signature glow
- the DNA is pure SVG + CSS (no canvas, WebGL or AudioContext); on desktop the slot
  **cross-morphs the contours** between versions (one bounded, cancellable timeline),
  on mobile the gentle CSS breathing animation is unchanged
- on desktop the DNA of the selected version is the main visual (right slot);
  `selectedDnaId` is independent of playback (`playingId`)
- on mobile the DNA appears over the world artwork while a version is playing
- geometry lives in `src/lib/components/dna-geometry.ts`, the shell in `DnaFigure.svelte`,
  the static render in `SongDna.svelte`, the desktop transition in `DnaMorph.svelte`

### Living L3 atmosphere (desktop)

- each world page has a procedural cosmic background that follows the selected version's
  Song DNA morphology (**Star · Bloom · Crystal · Pulse · Spiral · Void**), each with its own
  light, colour, forms and motion
- one Canvas 2D layer and one managed animation loop, ~30 FPS, DPR capped at 1.5; desktop only
- smooth **snapshot-crossfade** between morphologies when the watched version changes
- subtle **music reactivity** reusing the shared audio graph (the same `AnalyserNode`,
  no second `AudioContext`): smoothed envelopes and a soft onset drive small per-morphology
  modulation (core glow, petals, facet glints, rings, streams, void pulses)
- pauses while the Visualizer is open (background and state kept) and resumes on close;
  stops on a hidden tab and on unmount; `prefers-reduced-motion` shows a static frame
- engine: `src/lib/atmosphere/atmosphere.ts`; metrics: `src/lib/audio/metrics.ts`

### Visualizer (optional)

- an additional "trance" mode on desktop, switched on manually
- **Butterchurn** is used when available; **Audio DNA** is the existing fallback
  when Butterchurn (WebGL2) is unavailable
- lazy-mounted: while it is off there is no engine, canvas, WebGL context or
  visualizer AudioContext
- turns itself off when leaving a world page or when a DNA button is pressed
- disabled entirely on mobile (there the world artwork is the background)

### Gallery

- 10 categories, 108 works, 290 WebP runtime files
- world-mobile artwork is reused from `static/images/worlds/` (no gallery duplicates)
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
    ├── data layer        worlds, music, lyrics, gallery, DNA, presets
    ├── audio layer       one AudioContext, active source, playback coordination
    ├── Song DNA          main L3 visual: SVG + CSS, 6 morphologies (desktop morphing)
    ├── Atmosphere        procedural desktop L3 background, 6 morphologies, audio-reactive
    ├── Visualizer        optional trance mode (Butterchurn → Audio DNA fallback)
    └── Gallery           artwork subsystem
```

Highlights:

- **Data-driven worlds.** A single reusable `WorldView` renders all worlds
  from the data layer; there is no per-world page copy.
- **Dynamic route.** Worlds are served through `/world/[slug]` and prerendered
  for every existing slug.
- **Shared audio.** One `AudioContext` and one audio graph serve every player;
  the visualizer follows the currently active source.
- **Persistent global playback.** The global player lives in the app layout, so
  it survives navigation between the entry screen, the map, worlds and the
  gallery.
- **DNA is the default world visual.** 23 versions have an author-defined
  8-axis DNA and the other 17 library-only versions have an author-assigned morphology;
  morphology metadata and per-version DNA live in `src/lib/data/dna.ts` and render
  as SVG + CSS. The optional Butterchurn visualizer is lazy-mounted only when the
  user switches it on.
- **Living L3 atmosphere.** A single Canvas 2D layer per world draws a procedural
  background for the selected morphology and reacts subtly to the music through the
  shared analyser; it pauses while the Visualizer is open and stays desktop-only.
- **Lazy audio.** Audio files are `preload="none"` and durations come from the
  data layer (`durationSec`), so no MP3 is downloaded before the user presses Play.
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
    components/   reusable UI (world view, players, DNA, visualizers, gallery, …)
    data/         worlds, 40-track music registry, lyrics, gallery, DNA, presets
    audio/        shared audio graph, playback coordination, visualizer runtimes
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

### Release workflow

- Development happens on `svelte-next`; `main` is the production branch.
- Within a large phase, changes accumulate without intermediate commits.
- Before a release: preflight — `git status`, `git diff --stat`, `npm run check`,
`npm run build`, `git diff --check`; make sure `main` is untouched.
- Make one final commit in `svelte-next`, then `git push origin svelte-next`.
- Cutover: check out `main`, merge `svelte-next` into `main` with a regular merge
commit, then `git push origin main`. No rebase, no force push; on a conflict, stop
and surface it instead of resolving it blindly.
- **`git push origin main` does NOT deploy GitHub Pages.** The existing
`.github/workflows/deploy-pages.yml` has only a `workflow_dispatch` trigger.
- Start the production deployment with the existing workflow's standard entrypoint:

```bash
gh workflow run deploy-pages.yml --ref main
```

- Do not change the workflow or the Pages configuration, and do not create new
deployment workflows or ad-hoc deploy scripts.
- After the run finishes, confirm the `build` and `deploy` jobs succeeded
(`gh run list --limit 3`, `gh run watch <run-id> --exit-status`).
- After release: `git status` is clean, `main == origin/main`, the production URL
responds, and `svelte-next` remains the next development branch.

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
- Song DNA shipped as the main L3 visual (8 axes, 6 morphologies, SVG + CSS),
  with the optional lazy Visualizer mode
- DNA true morphing: the desktop slot cross-morphs contours between versions
  (`dna-geometry.ts` + `DnaFigure.svelte` + `DnaMorph.svelte`), with a cross-dissolve fallback
- living L3 atmosphere: six procedural desktop backgrounds (one per DNA morphology),
  one Canvas 2D layer, smooth transitions and subtle music reactivity on the shared analyser
- dev-only DNA / atmosphere labs (`/dna-lab`, `/atmosphere-lab`) — stubs in production
- world «Теория всего» added (14 worlds): full Spiral DNA, portrait artwork, gallery concept
- gallery «Концепты миров» curated: the 16:9 duplicates removed from that category only
- audio loads lazily (`preload="none"` + `durationSec` in the data layer)
- L2 mobile scroll restoration and gallery scroll reset on category change
- world «Потерять себя» added (12 worlds, 111 gallery works, 303 WebP files)
- world «Антисага» added (13 worlds, 112 gallery works, 303 WebP files): track promoted from
  the L1 library into a full world, portrait artwork reused by «Концепты миров», and its
  author DNA (8 axes, Void) taken from `DNA.txt`
- DNA morphology metadata unified (name/colour/description) with a label above the DNA
- desktop L1 catalog reworked (one column, internal scroll, aligned columns, DNA
  filter) with the filter driving the playback queue
- cautious next-track prefetch added (one candidate, cancellable)
- favorites: per-version hearts in the L1 catalog (desktop + mobile) and in every L3 version
  player, persisted in `localStorage`; «Избранное» filter mode (last menu entry, both platforms)
  driving the queue
- mobile L1 catalog rows keep their content height: the mobile catalog row must not use
  `overflow: hidden`, because a non-visible overflow lets the height-constrained Grid rows
  shrink below their content and clip the whole list
- published to GitHub Pages and served from the `/InfiniteToday` base path
- validated on desktop and mobile

There are no required tasks left. Optional future work (for example migrating the
two visualizer runtime modules to TypeScript) is tracked in `TODO.md`.
