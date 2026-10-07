# Infinite Today — Migration TODO

## Completed

- [x] Phase 0 — SvelteKit 3 skeleton
- [x] Static adapter
- [x] Base path `/InfiniteToday`
- [x] Prerender
- [x] Local dev verification
- [x] Production preview verification
- [x] Test routes
- [x] First reusable component
- [x] Data separated from UI
- [x] Phase 1 — first real vertical slice
- [x] Real L1
- [x] Real L2
- [x] Real world «Поиск»
- [x] Reusable TrackPlayer
- [x] Lyrics
- [x] SvelteKit route navigation
- [x] Base-path / deep-link verification
- [x] Automated browser verification
- [x] Production v1.1 remains untouched
- [x] Phase 2 — all seven worlds
- [x] unified world data/catalog
- [x] world music data migrated
- [x] Phase 3 — Butterchurn integration
- [x] L2 responsive regression fixed
- [x] Butterchurn lifecycle/teardown
- [x] shared audio integration
- [x] Phase 3.1 — Butterchurn client-side remount state synchronization
- [x] Butterchurn lifecycle regression test
- [x] Phase 4 — global L1 player
- [x] Full 40-track registry
- [x] Global playback survives route transitions
- [x] Global player ↔ Butterchurn integration
- [x] Phase 5 — Audio DNA
- [x] shared analyser/audio integration
- [x] Audio DNA lifecycle
- [x] Audio DNA + Butterchurn integration
- [x] Phase 5.1 — visualizer exclusivity / restore v1.1 visual model
- [x] Phase 6 — Gallery
- [x] Gallery data layer
- [x] 11 categories
- [x] 99 works
- [x] 291 WebP runtime assets
- [x] lazy loading
- [x] lightbox
- [x] Gallery navigation/history
- [x] responsive Gallery
- [x] Phase 6.1 — Gallery entry mobile CSS regression fixed
- [x] Phase 7 — navigation/history/external links
- [x] YouTube
- [x] Telegram
- [x] responsive parity audit
- [x] feature parity audit
- [x] Phase 8A — deployment architecture prepared locally
- [x] GitHub Actions workflow prepared
- [x] source/build separation verified
- [x] Phase 8B — Git lineage prepared for SvelteKit cutover
- [x] GitHub Actions versions updated
- [x] Phase 8C — svelte-next pushed to GitHub
- [x] Phase 8D — Pages workflow registered on default branch
- [x] GitHub Pages source switched to GitHub Actions
- [x] First SvelteKit production deployment
- [x] Live URL validated
- [x] Desktop live validation
- [x] Mobile live validation
- [x] Direct route/deep-link validation

### TypeScript migration

- [x] `jsconfig.json` → `tsconfig.json` (`extends: "$app/tsconfig"`, `strict: true`)
- [x] tooling: `typescript` + `svelte-check`, script `npm run check`
- [x] data layer → TypeScript (`worlds`, `music`, `lyrics`, `butterchurn`, `gallery`)
- [x] audio core → TypeScript (`graph`, `playback`, `player.svelte.ts`)
- [x] all 14 Svelte components → TypeScript (`<script lang="ts">`)
- [x] `src/app.d.ts` for `App.PageState` (gallery lightbox shallow state)
- [x] `npm run check` → 0 errors (2 pre-existing `Lightbox` a11y warnings kept as baseline)
- [x] UX/visual polish pass after two audits (safe-area, motion tokens, reduced-motion, a11y focus states)

## Next

No required migration tasks remain. Deliberately deferred (not bugs, not started):

- [ ] **Lightbox focus bug** — after opening, focus lands on the gallery card instead of
  the close button, and on close it falls to `<body>`; the `returnFocus` effect in
  `GalleryView` races the async `goto`, so `returnFocus` is cleared before the lightbox opens
  (pre-existing; verified unchanged by A/B against the pre-migration build)
- [ ] **Gallery masonry / space filling** — the waterfall grid can leave uneven trailing
  gaps; revisit column balancing / last-row fill
- [ ] **Normal player improvements** — general playback UX work on the global L1 player
  (e.g. visible error surface for `player.failed`, keyboard shortcuts, clearer states)
- [ ] **Media Session** — integrate the Media Session API (metadata, artwork, OS media keys)
- [ ] **SEO / Open Graph / sitemap** — per-page titles/descriptions, OG/Twitter cards, `sitemap.xml`
- [ ] **Web Share** — native share for a world / gallery item where supported
- [ ] **Analytics** — privacy-friendly page/feature analytics

Also postponed:

- [ ] migrating `src/lib/audio/butterchurn.js` and `src/lib/audio/audio-dna.js` to TypeScript
  (runtime visualizer modules; intentionally left as JavaScript)
- [ ] optional visual polish

## References

- Repository: https://github.com/kudriashovsv-spec/InfiniteToday
- Live: https://kudriashovsv-spec.github.io/InfiniteToday/
- Source branch: `svelte-next`
- Previous static version (v1.1) commit: `09f2a92a733fcad9b86ee424071d83d1f85116c1`
