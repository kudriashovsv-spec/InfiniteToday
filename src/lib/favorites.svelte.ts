// Избранные ВЕРСИИ треков (устойчивый `track.id`, не название и не индекс).
//
// Состояние живёт в модуле — как `player.svelte.ts` и `visualizer-mode.svelte.ts`,
// потому что его читают сразу три места: каталог L1 (desktop и mobile), фильтр
// библиотеки и плееры версий на L3. Поэтому добавление/удаление в одном месте
// немедленно видно во всех остальных — второй копии состояния нет.
//
// Хранилище — `localStorage` (переживает перезагрузку и повторное открытие).
// SSR/гидратация: на сервере и в ПЕРВОМ клиентском рендере состояние пустое,
// потому что localStorage там недоступен; загрузка идёт клиентским
// `initFavorites()` из layout. Так SSR-разметка и первый рендер совпадают —
// ошибок гидратации нет, а расхождение «пустые → заполненные» сердечки
// применяется до первой отрисовки кадра. Некорректные данные в хранилище
// молча игнорируются и не ломают приложение.
//
// Примечание: в SvelteKit 3 модуль окружения называется `$app/env`
// (в SvelteKit 2 было `$app/environment`).

import { browser } from '$app/env';
import { tracks } from '#lib/data/music.js';

/** Ключ в localStorage. Версионируем через суффикс, если формат изменится. */
const STORAGE_KEY = 'infinite-today:favorites';

/**
 * `ids` — избранные версии в порядке добавления; `ready` — хранилище прочитано
 * (до этого считается, что избранного нет: SSR и первый рендер совпадают).
 */
export const favorites = $state({ ids: [] as string[], ready: false });

/**
 * Слушатель изменений (регистрирует `player.svelte.ts`): состав очереди зависит
 * от избранного ТОЛЬКО когда включён фильтр «Избранное», поэтому сброс порядка
 * перемешивания и предзагрузки делает сам плеер — без циклического импорта.
 */
let onChange: (() => void) | null = null;

export function registerFavoritesListener(listener: () => void): void {
	onChange = listener;
}

/** Версия в избранном? До загрузки хранилища — false (см. комментарий выше). */
export function isFavorite(trackId: string): boolean {
	return favorites.ids.includes(trackId);
}

export function favoriteCount(): number {
	return favorites.ids.length;
}

function persist(): void {
	if (!browser) return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites.ids));
	} catch {
		/* приватный режим или переполнение квоты — избранное просто не сохранится */
	}
}

/**
 * Валидация прочитанного: массив строк, только реально существующие версии,
 * без дубликатов. Всё остальное (мусор, старый формат, удалённые версии)
 * отбрасывается — приложение остаётся рабочим.
 */
function sanitize(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	const known = new Set(tracks.map((track) => track.id));
	const result: string[] = [];
	for (const item of value) {
		if (typeof item !== 'string' || !known.has(item) || result.includes(item)) continue;
		result.push(item);
	}
	return result;
}

/** Добавить/убрать версию. Единственная точка изменения избранного в UI. */
export function toggleFavorite(trackId: string): void {
	favorites.ids = isFavorite(trackId)
		? favorites.ids.filter((id) => id !== trackId)
		: [...favorites.ids, trackId];
	persist();
	onChange?.();
}

/**
 * Клиентская загрузка из localStorage. Вызывается один раз из layout (`onMount`),
 * повторные вызовы — no-op.
 */
export function initFavorites(): void {
	if (!browser || favorites.ready) return;
	favorites.ready = true;

	let raw: string | null = null;
	try {
		raw = localStorage.getItem(STORAGE_KEY);
	} catch {
		raw = null;
	}
	if (!raw) return;

	try {
		favorites.ids = sanitize(JSON.parse(raw));
	} catch {
		favorites.ids = [];
	}
}
