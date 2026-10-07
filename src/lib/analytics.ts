// Privacy-friendly analytics layer (GoatCounter).
//
// Единственная точка знания о провайдере. Компоненты/роуты вызывают только
// проектные операции: pageview / trackPlay / trackShare.
//
// Принципы:
//   • client-only: скрипт провайдера вставляется после mount, SSR его не видит;
//   • disabled-by-default: без build-time site code аналитика полностью молчит;
//   • никаких cookies / localStorage / fingerprint / user id;
//   • сайт и плеер работают без аналитики и при недоступном/заблокированном
//     провайдере (ошибки аналитики никогда не всплывают наружу).
//
// Активация: задать build-time переменную VITE_GOATCOUNTER_CODE (см. .env.example)
// реальным site code GoatCounter. Без неё интеграция остаётся выключенной.

/** Параметры count() GoatCounter (путь = и page path, и event name). */
interface CountVars {
	path: string;
	title?: string;
	event?: boolean;
	no_session?: boolean;
}

/** Минимальная форма объекта, который count.js создаёт в window. */
interface GoatCounter {
	no_onload?: boolean;
	no_events?: boolean;
	count?: (vars?: CountVars) => void;
}

declare global {
	interface Window {
		goatcounter?: GoatCounter;
	}
}

const RAW_CODE = import.meta.env.VITE_GOATCOUNTER_CODE;
// Публичный site code проекта (не секрет, не пароль). Зафиксирован в коде,
// чтобы GitHub Pages build (`npm run build` в Actions, без env/секретов) всегда
// содержал аналитику без ручной настройки на каждом деплое. Переменная
// VITE_GOATCOUNTER_CODE может переопределить значение (например, для тестов).
const DEFAULT_SITE_CODE = 'kudriashovsv';
const SITE_CODE = (typeof RAW_CODE === 'string' && RAW_CODE.trim()) || DEFAULT_SITE_CODE;
const PROVIDER_SCRIPT = 'https://gc.zgo.at/count.js';
const MAX_QUEUE = 50;

let initialized = false;
let ready = false;
let unavailable = false;
let queue: CountVars[] = [];
let lastPageviewPath = '';

// Активация: только в production-сборке (import.meta.env.PROD). В dev аналитика
// выключена, чтобы не отправлять реальные события при локальной работе.
/** Аналитика активна только в production-сборке с заданным site code. */
export function isAnalyticsEnabled(): boolean {
	return import.meta.env.PROD && SITE_CODE.length > 0;
}

function deliver(vars: CountVars): void {
	if (typeof window === 'undefined') return;
	const gc = window.goatcounter;
	if (gc && typeof gc.count === 'function') gc.count(vars);
}

function enqueue(vars: CountVars): void {
	if (unavailable) return;
	if (ready) {
		deliver(vars);
		return;
	}
	queue.push(vars);
	if (queue.length > MAX_QUEUE) queue.shift();
}

/**
 * Загружает провайдера (один раз, async) и отключает его авто-pageview: считаем
 * сами на каждый SPA-переход, чтобы не было дублей и внутренних состояний.
 */
export function initAnalytics(): void {
	if (!isAnalyticsEnabled() || initialized || typeof window === 'undefined') return;
	initialized = true;

	// count.js читает это до загрузки и не делает auto-count/bind.
	window.goatcounter = { ...(window.goatcounter ?? {}), no_onload: true, no_events: true };

	const script = document.createElement('script');
	script.async = true;
	script.src = PROVIDER_SCRIPT;
	script.setAttribute('data-goatcounter', `https://${SITE_CODE}.goatcounter.com/count`);
	script.addEventListener('load', () => {
		ready = true;
		const pending = queue;
		queue = [];
		for (const vars of pending) deliver(vars);
	});
	script.addEventListener('error', () => {
		// Провайдер недоступен (adblock/offline/сеть): молча выключаемся.
		unavailable = true;
		queue = [];
	});
	document.head.appendChild(script);
}

/** Нормализуем путь: без query/hash и без хвостового слэша. */
function normalizePath(path: string): string {
	if (typeof path !== 'string') return '';
	const clean = path.split('?')[0].split('#')[0];
	if (clean.length > 1 && clean.endsWith('/')) return clean.slice(0, -1);
	return clean;
}

/** Pageview публичной страницы; повторный путь в той же сессии не считается. */
export function pageview(path: string): void {
	if (!isAnalyticsEnabled()) return;
	const clean = normalizePath(path);
	if (!clean || clean === lastPageviewPath) return;
	lastPageviewPath = clean;
	enqueue({ path: clean });
}

/** Фактический старт воспроизведения трека. */
export function trackPlay(track: { id: string; world: string | null }): void {
	if (!isAnalyticsEnabled() || !track.id) return;
	enqueue({
		path: `track-play/${track.world ?? 'library'}/${track.id}`,
		event: true,
		no_session: true
	});
}

/** Успешный share (системный или через копирование); контекст — путь страницы. */
export function trackShare(path: string): void {
	if (!isAnalyticsEnabled()) return;
	const clean = normalizePath(path);
	const name = !clean || clean === '/' ? 'share/home' : `share${clean.startsWith('/') ? clean : `/${clean}`}`;
	enqueue({ path: name, event: true, no_session: true });
}
