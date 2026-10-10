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

### Hotfix — mobile L1 library rows (svelte-next)

- [x] Mobile L1 catalog no longer collapses: rows keep their content height (~34.875px)
      instead of shrinking to their padding. Cause: the bottom panel is a height-constrained
      Grid whose 40 auto rows see negative free space, and `overflow: hidden` on `.lib-track`
      zeroed the grid item's automatic minimum size, so every row shrank to ~11px and the
      hidden overflow clipped the 24px content — the list looked empty while staying in the DOM.
      Fix: removed `overflow: hidden` from the mobile `.lib-track` rule; name/genre ellipsis is
      handled by their own rules. Subgrid, desktop rules, queue, prefetch and data untouched.
- [x] Verified at 390×844 / 430×932 / 640×900 and desktop 1280×800 in Chrome and WebKit
      (real device not tested); `npm run check`, `npm run build`, `git diff --check` pass.

### Phase — shuffle mode (svelte-next)

- [x] Shuffle for the active queue: `playbackQueue()` permutes only the ORDER (composition still
      comes from `activeQueue()` and the catalog `tracks` is never mutated); the playing track
      stays first and is never restarted, one cycle plays every track exactly once and stops at
      the end, re-enabling builds a new order and disabling returns to the normal order
- [x] Player button between the time readout and the volume control (`player.shuffle`,
      `setShuffle` / `toggleShuffle`) with an explicit active state, `aria-pressed` and a compact
      narrow-desktop band so the panel never overflows
- [x] Prefetch follows the actual next track of the shuffled order (cancelled on a mode/filter
      change and absent at the end of a cycle)

### Phase — DNA multi-filter (svelte-next, desktop)

- [x] `libraryFilter` now holds the array of selected morphology ids (empty = no filter); several
      morphologies combine by OR inside the single `activeQueue()` / `playbackQueue()` source
- [x] Desktop-only DNA filter reworked: the `Фильтр DNA` button shows a selected count, the six
      morphologies are `menuitemcheckbox` toggles (multi-select — the menu stays open), and a
      `menuitem` reset entry «Все DNA» clears the selection and closes the menu with focus back
      on the button
- [x] Russian filter labels added as a separate `filterLabel` field in `MORPHOLOGIES`; the English
      `name`, ids, colours and DNA data are unchanged and L3 keeps the English label
- [x] Changing the selection rebuilds the queue, re-shuffles it when shuffle is on and cancels a
      stale prefetch, without interrupting the playing track
- [x] Mobile L1 library untouched (the filter stays hidden at ≤640px)

### Phase — world «Антисага» (svelte-next)

- [x] 13th world added through the existing data layer only (no parallel architecture):
      `worlds.ts` entry + `mobileWorldOrder`, `music.ts` track promoted from the L1 library
      (`world: 'antisaga'`, `worldOrder: 1`), `lyrics.ts` text added verbatim, portrait artwork
      copied to `static/images/worlds/antisaga.webp` (1086×1448)
- [x] Full 8-axis DNA moved from `libraryMorphology` to `trackDna` (values from the author's
      `DNA.txt`: [32, 28, 83, 31, 22, 86, 17, 71], morphology Void) — every world version has a
      full DNA, so L3 can render it
- [x] Gallery «Концепты миров» got the artwork as its last work (`koncepty-mirov-world-antisaga`),
      reusing `../images/worlds/antisaga.webp` with no physical copies (112 works, 13 world-mobile
      works, gallery files/bytes unchanged)
- [x] L2 desktop entry placed in the «Спуск» column ~2 cm above it at first (40.96% / 62.51%),
      label above; the coordinates were then FINALISED by the author through `/space?calibrate` —
      the released values are `left: '42.42%'`, `top: '58.62%'`, `width: '4%'`, `height: '7.1%'`
      (`worlds.ts`; не перекалибровывать без отдельного решения)
- [x] Mobile world order: «Антисага» sits between «Поворот туда» and «Мечтай»

### Phase — favorites ❤️ (svelte-next)

- [x] Single favorites state per track VERSION id (`src/lib/favorites.svelte.ts`), persisted in
      `localStorage` (`infinite-today:favorites`), shared by the L1 catalog (desktop + mobile) and
      by every L3 version player; invalid/unknown stored ids are dropped
- [x] Client-only init from the layout (`initFavorites()`), so SSR markup and the first client
      render match — no hydration errors
- [x] Reusable `FavoriteButton.svelte`: rightmost cell of each catalog row (download stays
      immediately to its left), same 24px size as the download on mobile (taken from the NAME
      column, genre untouched), last control of each version player on L3; clicking never starts
      or switches playback, ARIA names include the concrete version (title + genre)
- [x] Desktop-only «Избранное» filter mode: last item of the DNA filter menu
      (`menuitemcheckbox`, red heart marker), mutually exclusive with the morphology selection and
      with «Все DNA»; it feeds the same `activeQueue()`/`playbackQueue()` (queue, shuffle,
      prefetch), and shows «Пока нет избранных версий, Нажми ❤️ напротив трека» when empty
- [x] Mobile keeps hearts but hides the filter entirely (`display: none`, out of the tab order)

### Phase — mobile DNA filter (svelte-next)

- [x] The existing DNA filter (same `libraryFilter`, same menu, same handlers) is now available on
      mobile as a compact button in the panel head — directly above the player, right side, roughly
      above the volume control; it never overlaps the player, volume, controls or the track list
- [x] Same labels, colours and checkbox markers; multi-select and «Все DNA» reset behave exactly
      as on desktop, and the count is shown on the button; the menu stays inside the viewport
      (320/390/430 px) and closing commands return focus to the button
- [x] At that moment «Избранное» stayed desktop-only (`display: none` on mobile and
      `menuItems()` dropping non-rendered entries so arrows never landed on a hidden item) —
      superseded by the next phase: the entry is now part of the mobile menu too
      (see «mobile favorites filter + stable player position»)
- [x] Per-row morphology column stays desktop-only; queue, shuffle, prefetch, favorites and
      playback logic untouched

### Phase — mobile favorites filter + stable player position (svelte-next)

- [x] The «Избранное» menu entry is now available on mobile too (last item, red heart, divider
      before it, `aria-checked`, arrow/Home/End navigation, Escape returns focus); the mobile menu
      is height-limited with its own scroll so the last item stays reachable and unclipped
- [x] Mobile favorites mode behaves exactly like the desktop one: enabling it clears the DNA
      selection, choosing a DNA morphology or «Все DNA» turns it off, the button reads
      «Фильтр · Избранное» (no false morphology count), and the empty state hint appears when
      nothing is favorited; a heart click updates the list immediately through the shared state
- [x] Player position fix: the mobile library panel used `max-height`, so with a bottom-anchored
      panel (`bottom: 0`) its content height moved the head and the player down when filtering left
      few rows (measured: player top 520.7px at 40 rows vs 710.5px at 2 vs 734.8px when empty).
      The panel now has a definite `height: min(44dvh, 360px)`, so only the scrolling list area
      changes — player top is 520.7px for 40 / 2 / 1 / 0 rows at 320, 390 and 430 px

### Phase — DNA shape transitions (svelte-next, desktop)

- [x] Desktop DNA slot cross-dissolves between versions instead of swapping instantly:
      `{#key selectedDnaId}` keeps both silhouettes mounted briefly, and overlapping
      `in:`/`out:` CSS transitions (`css`-form, no JS-rAF loop) fade + gently scale one
      into the other. The six morphology builders in `SongDna.svelte` stay untouched, so
      every morphology keeps its own character and colour
- [x] Desktop only: `.main-dna` stays `display: none` at ≤640px and the transitions are
      duration 0 on mobile; the mobile DNA path (`WorldView` `.mobile-dna` +
      `mobile-dna-reveal`) is unchanged
- [x] `prefers-reduced-motion: reduce` → instant swap (duration 0)
- [x] `gradId` in `SongDna.svelte` is derived from `morphology` + `values`, so two
      silhouettes that coexist during a transition can never share a gradient id
- [x] Verified: same and different morphologies, rapid repeated switching, switching while
      audio plays, return from the Visualizer

### Phase — DNA true morphing (svelte-next, desktop)

- [x] Stage 0 — extract the pure geometry (builders, petal paths, labels, spokes) into
      `dna-geometry.ts`; `SongDna` consumes it; parity of all 22 versions' `d` verified
- [x] Stage 1 — shared presentational `DnaFigure.svelte`; `SongDna` becomes a static render
- [x] Stage 2 — desktop `DnaMorph.svelte`: bounded morph timeline, reduced-motion, cancel on
      interrupt; the current cross-dissolve is kept as the fallback mode
- [x] Stage 3 — compatibility criteria FINALISED: manual fallback list (pulse↔spiral →
      cross-dissolve) plus a finite-geometry safety fallback; no automatic self-intersection
      classifier (the metric proved unreliable); final suitability confirmed visually
- [x] Stage 4 — verification: Star→Bloom, Star→Void, Bloom→Void; Spiral→Pulse as the fallback
      case; mobile path byte-identical

### Phase — DNA Morph Lab + Spiral winding fix (svelte-next, dev-only)

- [x] Dev-only `/dna-lab` (`DnaMorphLab.svelte`): all 30 directed transitions + 6 self-checks,
      source/target previews, mode indicator (morph / cross-dissolve), re-run, direction swap,
      auto-run; reuses `SongDna` + `DnaMorph`; gated by `import.meta.env.DEV` (production build
      ships only a non-interactive stub, no lab code, no sitemap/nav entry)
- [x] Compatibility criterion moved to `dna-geometry.ts` (`dnaMorphFallbackPair`) — single source
      for `DnaMorph` and the lab; `DnaMorph` gained a dev-only `forceMode` override
- [x] Audit of all 30 transitions: every Spiral-involving pair collapsed the contour (opposite
      winding → area crossed zero). Fixed by normalising ring orientation in `petalRings`
      (morph-only; static geometry untouched). After the fix all 30 show no flips / no collapse;
      Star→Bloom and Star→Void unchanged
- [x] Spiral↔Pulse: the winding fix made the candidate real morph measure as clean as
      Star→Bloom; the pair was visually confirmed (both directions, force morph in the lab) and
      then REMOVED from the fallback list (`MORPH_FALLBACK_PAIRS` is now empty) — both directions
      use real morph in the normal UI; the mechanism stays as a safety net for future pairs

### Phase — L3 living atmosphere + music reactivity (svelte-next, desktop)

- [x] Procedural L3 background (`src/lib/atmosphere/atmosphere.ts` + `AtmosphereScene.svelte`):
      six morphologies (Star/Bloom/Crystal/Pulse/Spiral/Void), one Canvas 2D layer, one managed
      rAF, ~30 FPS, DPR ≤ 1.5; snapshot-crossfade between morphologies
- [x] Desktop-only integration on `/world/[slug]` behind the UI (z-index 0), driven by
      `selectedDna.morphology`; on mobile the component is never mounted (no canvas/loop)
- [x] Coordination with the Visualizer: the atmosphere pauses while it is open (background and
      state kept) and resumes on close; hidden tab halts the loop; unmount releases resources
- [x] Subtle music reactivity (`src/lib/audio/metrics.ts`) on the shared `AnalyserNode`
      (no second AudioContext): smoothed envelopes + soft onset, small per-morphology modulation
- [x] Dev-only `/atmosphere-lab` for visual review (stub in production, code tree-shaken)

### Phase — world «Теория всего» + gallery cleanup (svelte-next)

- [x] 14th world added through the existing data layer only: `worlds.ts` entry (artwork
      `static/images/worlds/teoriya-vsego.webp`, 1086×1448) + `mobileWorldOrder` slot between
      «Дети Солнц» and «Оправданная надежда»; `music.ts` track promoted from the L1 library
      (`world: 'teoriya-vsego'`, `worldOrder: 1`); `lyrics.ts` text added verbatim
- [x] Full 8-axis DNA moved from `libraryMorphology` to `trackDna` (author values
      [77, 89, 82, 93, 43, 12, 68, 88], morphology Spiral) — the world version has a full DNA
- [x] Desktop L2 entry placed PRELIMINARILY 2 cm up / 2 cm right of «Дота виновата»
      (`left: '39.33%'`, `top: '29.34%'`); awaits manual calibration via `/space?calibrate`
- [x] Gallery «Концепты миров»: added `koncepty-mirov-world-teoriya-vsego` (reuses
      `../images/worlds/teoriya-vsego.webp`, no physical copy); removed all five 16:9 works
      (`deti-solnc-07`, `mechtay-03`, `opravdannaya-nadezhda-01`, `poisk-10`,
      `vremya-ne-toropi-01`) from this category only — the files stay on disk, other categories
      untouched; manifest count/stats recomputed (14 works, 108 images, 290 files)

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
- Последний релиз: feature-commit `fb17c009ddefa4ea5e8b42fc509f15428e1d762e` (`svelte-next`,
  shuffle + DNA-фильтры + избранное + мир «Антисага») → merge-коммит
  `30bcba4601e1f065a667d97d9a077fd6578cb319` в `main`; deploy-run `38043436508`
  (`build` ✓ / `deploy` ✓). Актуальные SHA и run проверять командами: `git log main -1`,
  `gh run list --limit 3` (журнал релиза, обновляется при следующем релизе).
