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
- модуль окружения в SvelteKit 3 — **`$app/env`** (в SvelteKit 2 это был `$app/environment`);
  `browser` оттуда — для клиентского кода (localStorage и подобного);
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
- Gallery-данные — `src/lib/data/gallery.json` (10 категорий, 108 works); runtime-файлы —
  `static/gallery/<category-slug>/`; 14 world-mobile работ переиспользуют `static/images/worlds/`
  без физических копий;
- DNA/морфологии — `src/lib/data/dna.ts`: полная 8-осевая DNA для 23 версий (`trackDna`) и
  авторская морфология для 17 библиотечных версий без полных осей (`libraryMorphology`);
  версия мира ВСЕГДА имеет полную DNA (без значений L3 её не рисует) — при добавлении мира
  оси брать из авторского `DNA.txt`;
  резолвер — `getMorphologyForTrack(trackId)`. Ровно 6 морфологий:
  bloom/star/crystal/pulse/spiral/void. Геометрия — `dna-geometry.ts`, каркас —
  `DnaFigure.svelte` (SVG + CSS, без canvas/WebGL/AudioContext), статичный рендер —
  `SongDna.svelte`, desktop-морфинг — `DnaMorph.svelte`; `selectedDnaId` (desktop, чья DNA
  смотрится) независим
  от `playingId` (что реально играет); на mobile DNA показывается поверх artwork по playback;
- L3-атмосфера (desktop) — `src/lib/atmosphere/atmosphere.ts` + `AtmosphereScene.svelte`:
  процедурный фон по морфологии ВЫБРАННОЙ версии; ОДИН Canvas 2D и один управляемый rAF,
  ~30 FPS, DPR ≤ 1.5; desktop-only (на mobile компонент не монтируется, движок сам защищён);
  переход между морфологиями — snapshot-crossfade; при открытом Visualizer атмосфера на паузе
  (фон и состояние сохраняются), при скрытой вкладке цикл останавливается, `prefers-reduced-motion`
  — статичный кадр. Музыкальные метрики — `src/lib/audio/metrics.ts` на ОБЩЕМ `AnalyserNode`
  (`graph.ts`), без второго AudioContext; одновременно работает только один тяжёлый цикл
  (атмосфера ИЛИ визуализатор);
- dev-лаборатории DNA/атмосфер (`/dna-lab`, `/atmosphere-lab`) — ТОЛЬКО для разработки
  (`import.meta.env.DEV` + ленивый динамический import): в production рендерится заглушка,
  код лабораторий вырезан из бандла и не попадает в sitemap/навигацию;
- метаданные морфологий — ЕДИНЫЙ источник `MORPHOLOGIES` / `MORPHOLOGY_ORDER` / `getMorphology()`
  в `dna.ts` (название, подпись фильтра `filterLabel`, цвет, описание). Не дублировать цвета/
  названия в компонентах; подпись над DNA (`.dna__morph` в `DnaFigure.svelte`) берёт имя и цвет
  только оттуда. `name` (Bloom … Void) — подпись DNA на L3, `filterLabel` (русские) —
  ТОЛЬКО пункты DNA-фильтра L1; менять их местами нельзя;
- новые версии/миры: морфологию назначать из авторского `WorkingFiles/ДНК/DNA.txt`, НЕ по жанру
  или названию; числовые оси не выдумывать (у библиотечных версий их может не быть);
- Visualizer — опциональный режим (`src/lib/visualizer-mode.svelte.ts`): lazy-mount только на
  desktop, сбрасывается при уходе со `/world/[slug]` и при выборе DNA; на mobile не монтируется;
- аудио ленивое: `TrackPlayer` использует `preload="none"`, длительность берётся из `durationSec`
  data layer, `src` назначается императивно — до Play mp3-запросов нет;
- фильтр DNA и очередь — единый источник правды в `player.svelte.ts`: `libraryFilter`
  (`morphologies` — массив выбранных id, ПУСТОЙ массив = без фильтра) и производная
  `activeQueue()` (объединение выбранных морфологий по ИЛИ). UI (`LibraryPanel`) и переходы
  `next`/`prev`/`autoAdvance` (через общий `step()`) читают ТОЛЬКО их; второй фильтр/очередь не
  создавать. Видимость строк каталога — производная, исходный `tracks` не мутируется.
  Фильтр — есть и на desktop, и на mobile (одно состояние и одно меню): на desktop —
  полная подпись «Фильтр DNA» в шапке панели, на mobile — та же кнопка компактнее (те же
  подписи/цвета/маркеры) в той же шапке панели НАД плеером;
  мультивыбор: `role="menu"` + `menuitemcheckbox` (подписи из `filterLabel`), счётчик выбранных
  на кнопке, а «Все DNA» — команда сброса (`menuitem`), а не морфология; выбор меняется
  ТОЛЬКО через `setLibraryFilter`/`toggleMorphology` — они пересобирают порядок очереди и
  снимают предзагрузку. Пункт «Избранное» — последний в меню и доступен на ОБЕИХ платформах;
  попадает в клавиатурную навигацию: `menuItems()` отбрасывает невидимые пункты);
- избранное — `src/lib/favorites.svelte.ts`: ЕДИНОЕ состояние по устойчивым `track.id`
  (не по названию и не по индексу), поэтому одна и та же версия узнаётся везде; хранится в
  `localStorage` (`infinite-today:favorites`), читается клиентским `initFavorites()` из layout —
  SSR и первый рендер пустые, поэтому ошибок гидратации нет; некорректные/устаревшие данные
  отбрасываются; UI — переиспользуемый `FavoriteButton.svelte` в строках каталога L1
  (крайний справа, сразу после скачивания) и в плеере КАЖДОЙ версии на L3. Режим фильтра —
  `libraryFilter.favorites` (взаимоисключающий с набором морфологий: включение одного снимает
  другой), в меню — последним пунктом `menuitemcheckbox` с красным сердечком; на mobile меню
  ограничено по высоте (`max-height` + прокрутка), чтобы последний пункт был достижим;
  очередь/shuffle/prefetch читают `activeQueue()`/`playbackQueue()` — второй фильтр не создавать;
- перемешивание (shuffle) — только ПОРЯДОК активной очереди (`playbackQueue()`): состав считает
  `activeQueue()`, каталог `tracks` не мутируется. Порядок строится один раз на включение (и
  заново при смене фильтра): текущий трек — первым, чтобы он не перезапускался; цикл линейный —
  на последнем треке автопереход останавливается и сам не начинается заново; повторное включение
  даёт новый порядок, выключение возвращает обычный. Состояние — `player.shuffle`,
  переключатель `setShuffle`/`toggleShuffle`, кнопка в панели L1 между временем и громкостью;
- `player.started` ставится только на реальном событии `playing`. До первого запуска текущий
  (по умолчанию) трек НЕ подмешивается в отфильтрованный список; после реального старта текущий
  трек остаётся видимым даже под чужим фильтром (в т.ч. на паузе). Первый Play под фильтром
  запускает первый подходящий трек (`ensurePlayableCurrent`);
- предзагрузка следующего трека — только в `player.svelte.ts`: максимум ОДИН кандидат из
  `playbackQueue()` (активная очередь с учётом перемешивания), окно ~12 с до конца
  (`PREFETCH_LEAD_SECONDS`), через `fetch()` в HTTP-кеш;
  отмена при смене трека/фильтра/режима перемешивания (`AbortController`), отключено при
  `Save-Data`/2G; НЕ создавать второй `<audio>`/AudioContext и НЕ грузить каталог в фоне;
- мобильную L1-библиотеку (нижняя панель) не переделывать: колонку морфологии в строки
  каталога не переносить; DNA-фильтр в нижней панели — только та же компактная кнопка в
  шапке панели (над плеером), без второй панели и без изменения списка/плеера;
- на mobile нижняя панель библиотеки имеет ФИКСИРОВАННУЮ высоту `height: min(44dvh, 360px)`,
  а НЕ `max-height`: панель прижата к низу (`bottom: 0`), поэтому при контентной высоте её верх
  (шапка и плеер) уезжает вниз, когда после фильтра остаётся мало строк. Меняться должна только
  высота списка (сам список — `flex: 1 1 auto; min-height: 0` и прокручивается);
- мобильные строки каталога (`.lib-track`) НЕ получать `overflow: hidden`: список — Grid
  с ограниченной высотой (40 auto-рядов при отрицательном свободном месте), а не-`visible`
  overflow обнуляет automatic minimum size grid-item, и auto-ряды сжимаются до высоты
  padding'а. Именно это дало регрессию «пустого списка»: строки сжимались до ~11px, а
  `overflow: hidden` обрезал их содержимое. Обрезку названия/жанра делают их собственные
  правила (`.lib-track__name` / `.lib-track__genre`), поэтому строка в этом не нуждается;
  перед возвратом любого `overflow` на строку проверять размеры Grid-строк и automatic
  minimum size. Правило действует и для будущей смены раскладки: сжимаемость auto-рядов
  Grid ломает строку, flex-раскладка с `flex: none` такой сжимаемости не даёт;
- мобильную библиотеку проверять на 390×844 / 430×932 / 640×900 и на desktop 1280×800
  как контроль: 40 строк ненулевой высоты (~34.875px), номер/название/жанр/иконка
  скачивания реально видны внутри строки, внутренняя прокрутка списка работает.
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

Полный процесс релиза/деплоя — см. §12.

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

Фактический процесс (проверен на реальном релизе). Следующий агент: НЕ предполагать, что
`git push origin main` деплоит Pages — **это НЕ так**.

1. Разработка ведётся в `svelte-next`; `main` — production-ветка.
2. Внутри крупной фазы изменения накапливаются БЕЗ промежуточных commit/push.
3. Перед релизом — preflight: `git status`, `git diff --stat`, `npm run check`, `npm run build`,
   `git diff --check`; убедиться, что `main` не тронут.
4. Один финальный commit в `svelte-next` (без дробления на мелкие коммиты).
5. `git push origin svelte-next`.
6. Cutover: `git checkout main` → `git merge --ff-only origin/main` → обычный merge `svelte-next`
   в `main` (создаёт merge-commit). Rebase/force push/перезапись истории запрещены. При конфликте —
   остановиться и показать конфликт, не решать вслепую.
7. `git push origin main`.
8. **GitHub Pages НЕ запускается автоматически от push в `main`.**
9. Существующий `.github/workflows/deploy-pages.yml` использует только `workflow_dispatch`
   (активного `push` trigger нет).
10. Production deployment запускается штатным `workflow_dispatch` этого же workflow:
    ```bash
    gh workflow run deploy-pages.yml --ref main
    ```
11. Workflow и Pages configuration для этого НЕ менять; новые deployment workflows НЕ создавать;
    ad-hoc deploy-скрипты НЕ писать.
12. После запуска обязательно проверить успех job'ов `build` и `deploy`:
    ```bash
    gh run list --limit 3
    gh run watch <run-id> --exit-status
    ```
13. После релиза: `git status` чистый, `main == origin/main`, production URL отвечает
    (`/` и ключевые маршруты). `svelte-next` остаётся веткой следующей разработки; не удалять её.

Логику workflow не менять без отдельного решения.

## 13. Текущий production

Это **исторический снимок** состояния на момент последнего релиза, а не источник истины.
Актуальное состояние всегда проверяется командами:
`git rev-parse main origin/main svelte-next origin/svelte-next`, `gh run list --limit 3`,
`git status` (после релиза дерево должно быть чистым).

- URL: `https://kudriashovsv-spec.github.io/InfiniteToday/`
- Ветки: `main` — production (деплой только штатным `workflow_dispatch`, см. §12),
  `svelte-next` — ветка следующей разработки (не удалять).
- Снимок последнего релиза: feature-коммит `fb17c00`, merge-коммит `30bcba4`
  (`main == origin/main == 30bcba4`), успешный production-deploy — run `38043436508`
  (`build` ✓ / `deploy` ✓). Журнал релиза — в `TODO.md` (References).
