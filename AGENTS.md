# AGENTS.md — Infinite Today / Бесконечное сегодня

Постоянные правила проекта. Читать перед любой работой в этом репозитории.

## 1. Проект

**Infinite Today / Бесконечное сегодня**

SvelteKit-реализация проекта — текущий production-сайт.

Проект:

`C:\Projects\EduProject\InfiniteToday-Svelte`

Текущий статус:

- production: ветка `main` (опубликовано);
- development / source: ветка `svelte-next`;
- публичный URL: `https://kudriashovsv-spec.github.io/InfiniteToday/`.

## 2. Golden reference

Предыдущая static-версия (v1.1, историческая сверка):

`C:\Projects\EduProject\InfiniteToday-Publish`

Workshop:

`C:\Projects\EduProject\MusicLaboratory`

Оба проекта можно **читать** и использовать для сверки. Без отдельного разрешения пользователя их НЕ изменять.

## 3. Статус и принцип

Миграция завершена: SvelteKit 3-версия перенесена, отполирована и опубликована в production.

Основной принцип сохраняется:

**данные отдельно от UI, повторяющийся UI переиспользуется.**

Не создавать отдельные копии одинаковых страниц для каждого мира.

## 4. Архитектура

Текущее направление:

```text
src/routes         — routes
src/lib/components — reusable UI
src/lib/data       — data
src/lib/audio      — audio logic
static             — public assets
```

Это архитектурный ориентир, а не жёсткая догма.

SvelteKit 3 используется намеренно. Важно:

- конфигурация находится в `vite.config.js` (в плагине `sveltekit()`, не в `svelte.config.js`);
- `$lib` не использовать — в SvelteKit 3 он удалён;
- используется актуальный SvelteKit 3 alias `#lib` (объявлен в `package.json` → `imports`);
- `$app/paths` (`resolve`, `asset`) использовать для корректной работы base path;
- не переносить старые SvelteKit 2 patterns без проверки актуальной документации.

Стек типов:

- TypeScript включён в режиме `strict` (`tsconfig.json` extends `$app/tsconfig`, `checkJs: false`);
- data layer, audio core, routes и все Svelte-компоненты — TypeScript (`<script lang="ts">`);
- `src/lib/audio/butterchurn.js` и `src/lib/audio/audio-dna.js` **намеренно остаются JavaScript**
  (runtime-визуализаторы: WebGL/vendor-глобалы). Не переписывать их на TypeScript
  автоматически — только отдельным решением;
- `vite.config.js` тоже остаётся JavaScript;
- типы из `.js`-модулей получать выводом из JSDoc/сигнатур (`ReturnType<typeof …>`,
  `Parameters<typeof …>`), а не дублированием и не `any`.
- `asset()` принимает `AssetPath`; пути, приходящие из данных как `string`, сужать
  только на границе вызова `asset(...)`, не меняя доменные типы (`Track`, `GalleryFile`);
- `resolve()` для динамических маршрутов — в route-ID-форме:
  `resolve('/world/[slug]', { slug })`;
- `page.url` — readonly URL и не передаётся в `goto()`; использовать `page.url.href`;
- shallow-состояние страницы описывать в `src/app.d.ts` (`App.PageState`);
- Gallery-данные — `src/lib/data/gallery.json` (10 категорий, 110 works); runtime-файлы —
  `static/gallery/<category-slug>/`; 11 world-mobile работ переиспользуют `static/images/worlds/`
  без физических копий;
- DNA версий — `src/lib/data/dna.ts` (8 осей + `morphology` на каждый L3 `track.id`; ровно
  6 морфологий: bloom/star/crystal/pulse/spiral/void). Визуал — `SongDna.svelte` (SVG + CSS,
  без canvas/WebGL/AudioContext/rAF); `selectedDnaId` (desktop, чья DNA смотрится) независим
  от `playingId` (что реально играет); на mobile DNA показывается поверх artwork по playback;
- Visualizer — опциональный режим (`src/lib/visualizer-mode.svelte.ts`): lazy-mount только на
  desktop, сбрасывается при уходе со `/world/[slug]` и при выборе DNA; на mobile не монтируется;
- аудио ленивое: `TrackPlayer` использует `preload="none"`, длительность берётся из `durationSec`
  data layer, `src` назначается императивно — до Play mp3-запросов нет;
- L2-входы калибруются **dev-only** инструментом `/space?calibrate` (`import.meta.env.DEV`,
  `HotspotCalibrator.svelte`); в production он не рендерится — не удалять.

## 5. GitHub Pages

Production URL (опубликован):

`https://kudriashovsv-spec.github.io/InfiniteToday/`

Base path:

`/InfiniteToday`

Приложение должно корректно работать не только из `/`, но и из этого подкаталога.

Не использовать новые hardcoded root-relative paths, которые ломают base path.

## 6. Static architecture

Production — статический сайт.

Используется:

`@sveltejs/adapter-static`

Не добавлять серверную инфраструктуру без отдельного решения.

## 7. Порядок работы

Работа ведётся маленькими отдельными фазами (миграция завершена; правило действует и для будущих изменений).

После завершения каждой фазы:

- провести проверки;
- подготовить отчёт на русском;
- остановиться;
- следующую фазу самостоятельно не начинать.

Scope expansion запрещён.

## 8. Production safety

Опубликованный production (`main`) не ломать без отдельного решения.

Изменения вносить изолированно и маленькими шагами; публикация — через существующий deployment flow.

Перед удалением/изменением важных файлов сначала проверить зависимости.

## 9. Git

Без отдельного разрешения пользователя не выполнять:

- `git add`
- `git commit`
- `git push`
- создание GitHub repository
- GitHub Actions
- deployment

## 10. Проверки

По возможности автоматизировать:

- dev
- build
- preview
- `npm run check` (svelte-check; 0 errors / 0 warnings)
- routes
- direct deep-links
- asset loading
- audio
- prerender
- base path
- browser console
- responsive/layout checks

Не создавать скриншоты без необходимости.

Если нужна настоящая визуальная проверка человеком — прямо сообщить пользователю.

## 11. Отчёты

Все отчёты на русском.

Разделять:

- сделано;
- проверено;
- не сделано;
- проблемы/риски;
- следующий этап.

Не объявлять фазу готовой без проверки её критериев.

## 12. Release / deploy workflow

- Разработка ведётся в `svelte-next`; `main` — production-ветка.
- Перед release: `npm run check`, `npm run build`, `git diff --check`.
- Commit/push изменений — в `svelte-next`; `main` не менять до отдельного release cutover.
- Cutover: checkout `main` → обычный merge `svelte-next` в `main` (создаёт merge-commit) → `git push origin main`.
- **Важно:** у `.github/workflows/deploy-pages.yml` нет активного `push` trigger для `main`;
  production deploy запускается через `workflow_dispatch` с `main`. Логику workflow не менять
  без отдельного решения.
- После запуска workflow убедиться, что deployment успешно опубликован.
- После release: `main` = опубликованный production-commit, `svelte-next` — ветка следующей
  разработки, worktree clean.
