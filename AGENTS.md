# AGENTS.md — Infinite Today / Бесконечное сегодня

Постоянные правила проекта. Читать перед любой работой в этом репозитории.

## 1. Проект

**Infinite Today / Бесконечное сегодня**

Новая SvelteKit-реализация старого production-сайта.

Проект:

`C:\Projects\EduProject\InfiniteToday-Svelte`

## 2. Golden reference

Production v1.1:

`C:\Projects\EduProject\InfiniteToday-Publish`

Workshop:

`C:\Projects\EduProject\MusicLaboratory`

Оба проекта во время миграции можно **читать** и использовать для сверки. Без отдельного разрешения пользователя их НЕ изменять.

## 3. Цель миграции

Постепенно перенести production-функциональность в SvelteKit 3, сохранив визуальный характер и поведение проекта.

Основной принцип:

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
- shallow-состояние страницы описывать в `src/app.d.ts` (`App.PageState`).

## 5. GitHub Pages

Будущий production URL:

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

## 7. Этапность

Миграция выполняется маленькими отдельными фазами.

После завершения каждой фазы:

- провести проверки;
- подготовить отчёт на русском;
- остановиться;
- следующую фазу самостоятельно не начинать.

Scope expansion запрещён.

## 8. Production safety

Старую v1.1 не ломать и не заменять в процессе миграции.

Новая версия развивается изолированно.

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
