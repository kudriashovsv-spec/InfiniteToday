# Infinite Today — TODO

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
- [x] Gallery restructured: 10 categories, 111 works, 303 WebP runtime files
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
- [x] `npm run check` → 0 errors / 0 warnings
- [x] UX/visual polish pass after two audits (safe-area, motion tokens, reduced-motion, a11y focus states)

### Post-migration fixes

- [x] Lightbox focus — opening focuses the close button; Escape, close and browser Back return
  focus to the source card (the `returnFocus` effect is gated on the open→closed transition,
  so the async shallow `goto` no longer races it)
- [x] Gallery masonry — CSS Grid + shortest-column-first replaces CSS multi-column; the layout
  fills the available width instead of leaving a fully empty trailing column
- [x] `Lightbox` backdrop is a real `<button type="button" tabindex="-1">` (0 a11y warnings)

### Post-migration product waves

- [x] Player UX — explicit loading / failed / retry states, clearer controls, keyboard shortcuts
- [x] Media Session — metadata, artwork, OS media actions
- [x] SEO / Open Graph / sitemap / robots — per-page metadata, canonical URLs, OG/Twitter cards,
  JSON-LD, `sitemap.xml`, `robots.txt`
- [x] Web Share — native share for the home screen and worlds, with Clipboard fallback
- [x] Privacy-friendly analytics — GoatCounter pageviews and custom events (production)
- [x] Three new worlds — Бешеная, Дота виновата, Здравствуй в первый раз
- [x] L2 desktop hotspot calibration tool (dev-only, `?calibrate`)
- [x] Fixed mobile world order, independent of the desktop map order
- [x] L3 title alignment (desktop shift + mobile centered wrapping)
- [x] Author-curated L1 track order (40 tracks, from `WorkingFiles/Порядок песен`)
- [x] Per-track download links in the L1 library
- [x] Media Session — previous/next track controls; single shared Lock Screen artwork

### DNA / L3 visual mode / audio

- [x] Song DNA data layer — 8 axes, manual 0–100 values for the 21 L3 versions
- [x] 6 morphologies (Bloom/Star/Crystal/Pulse/Spiral/Void) with distinct geometry
- [x] DNA as the default L3 visual: desktop right slot, mobile DNA on playback
- [x] `selectedDnaId` (what you watch) independent of `playingId` (what plays)
- [x] Optional Visualizer mode: lazy mount, auto-off on leaving a world / on DNA select,
  disabled on mobile
- [x] New world «Спуск» (+1 work in gallery «Концепты миров» → 110 works)
- [x] New world «Потерять себя» (+1 work in gallery «Концепты миров» → 111 works)
- [x] Audio loads lazily: `TrackPlayer` `preload="none"` + `durationSec` in the data layer

### Release wave — navigation, worlds, DNA catalog (svelte-next)

- [x] L2 mobile scroll position restored on return from L3 / browser Back (fresh opens unaffected)
- [x] Gallery inner scroll resets to top on category change
- [x] Unified morphology metadata (`MORPHOLOGIES` / `MORPHOLOGY_ORDER` / `getMorphology` in `dna.ts`)
- [x] Morphology name above the DNA, coloured from that shared source
      (desktop = selected version, mobile = playing version)
- [x] Desktop-only 1 cm DNA shift on L3 (mobile layout untouched)
- [x] Author morphology for all 40 tracks (`libraryMorphology` + `getMorphologyForTrack`)
- [x] Desktop L1 catalog: one column, internal scroll, aligned columns
      (number | name | genre | DNA | download)
- [x] DNA filter menu (`Все DNA` + six morphologies), keyboard accessible and layered above the player
- [x] Filter drives the play queue (`activeQueue`); the playing track stays visible;
      the first Play under a filter starts the first matching track
- [x] Cautious next-track prefetch (~12 s before the end, one candidate, cancelled on
      track/filter change, disabled under Save-Data and 2G/slow-2G)

## Next

No required tasks remain. The migration and all planned product waves are completed
and published in production.

### Deferred (optional — not bugs, not started)

- [ ] migrating `src/lib/audio/butterchurn.js` and `src/lib/audio/audio-dna.js` to TypeScript
  (runtime visualizer modules; intentionally left as JavaScript)
- [ ] optional visual polish / future improvements

## References

- Repository: https://github.com/kudriashovsv-spec/InfiniteToday
- Live (production): https://kudriashovsv-spec.github.io/InfiniteToday/
- Production branch: `main`
- Development / source branch: `svelte-next`
- Previous static version (v1.1) commit: `09f2a92a733fcad9b86ee424071d83d1f85116c1`
- Release: один финальный commit в `svelte-next` → `git push origin svelte-next` → merge
  `svelte-next` в `main` (merge-commit) → `git push origin main` → production deploy через
  штатный `workflow_dispatch` существующего workflow:
  `gh workflow run deploy-pages.yml --ref main`.
  **Важно:** push в `main` Pages НЕ деплоит (у `deploy-pages.yml` нет `push` trigger).
- Последний релиз: feature-commit `5fcc52c` (`svelte-next`) → merge `1ee74d3` в `main`;
  deploy-run `37840057005` (`build` ✓ / `deploy` ✓); `main == origin/main == 1ee74d3`,
  `svelte-next == 5fcc52c`, рабочее дерево чистое.
