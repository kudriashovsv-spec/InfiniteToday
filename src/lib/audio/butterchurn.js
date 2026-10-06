// Butterchurn engine — браузерный singleton.
//
// Ответственность: загрузить runtime, создать/переиспользовать визуализатор,
// подключить активный audio source, крутить render loop, менять пресеты,
// корректно свернуться при уходе с L3.
//
// Никакого доступа к window на уровне модуля: всё browser-only выполняется
// внутри mount(), который вызывает компонент только после монтирования.
// Поэтому SSR/prerender не трогают ни AudioContext, ни WebGL, а runtime
// грузится лениво скриптом из static/.
//
// Singleton подтверждён v1.1: один AudioContext (graph.js), один визуализатор,
// один <canvas>, по одному MediaElementSource на <audio>.

import { asset } from '$app/paths';
import { presets } from '#lib/data/butterchurn.js';
import { getContext, getSource, resume, sourceCount } from './graph.js';
import { getActiveAudio, subscribeActiveAudio } from './playback.js';

const RUNTIME_SRC = 'vendor/butterchurn/butterchurn.min.js';
const PRESET_GLOBAL = '__BC_LIBRARY_PRESETS';
const MAX_DPR = 2;

/**
 * @typedef {'loading' | 'ready' | 'unsupported' | 'error'} VizStatus
 * @typedef {{ onStatus: (status: VizStatus) => void, onPreset?: (index: number) => void }} VizHandlers
 */

/** @type {any} */
let viz = null;
/** @type {HTMLCanvasElement | null} */
let canvas = null;
/** @type {(() => void) | null} */
let unsubscribeActive = null;
/** @type {MediaElementAudioSourceNode[]} */
let connectedNodes = [];
/** @type {HTMLElement | null} */
let hostEl = null;
/** @type {VizHandlers | null} */
let handlersRef = null;

// Generation-токен mount lifecycle: async-операция, начатая старым компонентом,
// не должна писать состояние в новый. 0 — ни один компонент не смонтирован.
let mountToken = 0;
let activeToken = 0;

let rafId = null;
let lastNow = 0;
let renders = 0;
let status = /** @type {VizStatus} */ ('loading');

/** @type {Promise<any> | null} */
let runtimePromise = null;

let presetIndex = -1;
let presetName = '';
let lastError = '';
/** @type {number[]} */
let bagOrder = [];
let bagSize = 0;
let bagLast = -1;

function dpr() {
	return typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, MAX_DPR);
}

function nowMs() {
	return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}

/** Есть ли WebGL2 (Butterchurn без него не работает). */
export function isSupported() {
	if (typeof document === 'undefined') return false;
	try {
		const probe = document.createElement('canvas');
		return Boolean(probe.getContext('webgl2'));
	} catch {
		return false;
	}
}

/**
 * @param {string} src
 * @returns {Promise<void>}
 */
function loadScript(src) {
	return new Promise((resolve, reject) => {
		const el = document.createElement('script');
		el.src = src;
		el.async = true;
		el.onload = () => resolve();
		el.onerror = () => reject(new Error('не загрузился ' + src));
		document.head.appendChild(el);
	});
}

// Доставка состояния в UI только владельцу текущего mount'а (late async delivery
// от уже размонтированного компонента игнорируется).
function notifyStatus(next, token) {
	if (token !== activeToken) return;
	status = next;
	if (handlersRef) handlersRef.onStatus(next);
}

function notifyPreset(index, token) {
	if (token !== activeToken) return;
	if (handlersRef && handlersRef.onPreset) handlersRef.onPreset(index);
}

/** @returns {Promise<any>} */
function ensureRuntime() {
	if (!runtimePromise) {
		runtimePromise = loadScript(asset(RUNTIME_SRC)).then(() => {
			// UMD-сборка кладёт модуль в window.butterchurn; при ESM-интеропе
			// реальный API лежит в .default (в v1.1 за это отвечал resolveMod).
			const raw = /** @type {any} */ (window).butterchurn;
			const BC = raw && raw.default && typeof raw.default.createVisualizer === 'function' ? raw.default : raw;
			if (!BC || typeof BC.createVisualizer !== 'function') throw new Error('Butterchurn API недоступен');
			return BC;
		});
	}
	return runtimePromise;
}

// --------------------------------------------------------------- пресеты ---

function randomInt(max) {
	const cryptoObj = /** @type {any} */ (window).crypto;
	if (cryptoObj && cryptoObj.getRandomValues) {
		const limit = Math.floor(4294967296 / max) * max;
		const buf = new Uint32Array(1);
		let v;
		do {
			cryptoObj.getRandomValues(buf);
			v = buf[0];
		} while (v >= limit);
		return v % max;
	}
	return Math.floor(Math.random() * max);
}

/** @param {number} n */
function drawIndex(n) {
	if (n <= 0) return -1;
	if (bagSize !== n || !bagOrder.length) {
		let order;
		do {
			order = Array.from({ length: n }, (_, i) => i);
			for (let i = n - 1; i > 0; i--) {
				const j = randomInt(i + 1);
				[order[i], order[j]] = [order[j], order[i]];
			}
		} while (n > 1 && order[0] === bagLast);
		bagOrder = order;
		bagSize = n;
	}
	const index = bagOrder.shift();
	bagLast = index;
	return index;
}

/** @param {import('#lib/data/butterchurn.js').ButterchurnPreset} entry */
function ensurePreset(entry) {
	const store = /** @type {any} */ (window)[PRESET_GLOBAL];
	if (store && store[entry.id]) return Promise.resolve(store[entry.id]);
	return loadScript(asset(entry.src)).then(() => {
		const loaded = /** @type {any} */ (window)[PRESET_GLOBAL];
		const payload = loaded && loaded[entry.id];
		if (!payload || !payload.preset) throw new Error('пресет не загрузился: ' + entry.id);
		return payload;
	});
}

/**
 * @param {number} index
 * @param {number} token
 * @returns {Promise<number>}
 */
function applyPreset(index, token) {
	if (!viz) return Promise.reject(new Error('визуализатор не готов'));
	const entry = presets[index];
	if (!entry) return Promise.reject(new Error('пресета нет: ' + index));
	return ensurePreset(entry).then((payload) => {
		// Пока грузился пресет, компонент мог размонтироваться/быть заменён.
		// Тогда не трогаем ни визуализатор, ни engine state, ни UI.
		if (token !== activeToken) return presetIndex;
		viz.loadPreset(payload.preset, 2.7);
		presetIndex = index;
		presetName = payload.name || entry.name;
		notifyPreset(index, token);
		return index;
	});
}

/**
 * Ручное переключение пресета (для UI текущего mount'а).
 * @param {number} index
 * @returns {Promise<number>}
 */
export function selectPreset(index) {
	return applyPreset(index, activeToken);
}

export function next() {
	if (!presets.length) return Promise.resolve(-1);
	return selectPreset(((presetIndex + 1) % presets.length + presets.length) % presets.length);
}

export function prev() {
	if (!presets.length) return Promise.resolve(-1);
	return selectPreset(((presetIndex - 1) % presets.length + presets.length) % presets.length);
}

function drawPreset(token) {
	const index = drawIndex(presets.length);
	if (index < 0) return;
	applyPreset(index, token).catch(() => {});
}

// ---------------------------------------------------------------- граф ---

function connectActive() {
	if (!viz) return;
	for (const node of connectedNodes) {
		try {
			viz.disconnectAudio(node);
		} catch {
			/* ignore */
		}
	}
	connectedNodes = [];
	const audio = getActiveAudio();
	if (!audio) return;
	const source = getSource(audio);
	if (!source) return;
	try {
		viz.connectAudio(source);
		connectedNodes.push(source);
		resume();
	} catch {
		/* ignore */
	}
}

// -------------------------------------------------------------- размер ---

export function resize(width, height) {
	if (!canvas) return;
	const w = Math.max(2, Math.round(Math.max(2, width) * dpr()));
	const h = Math.max(2, Math.round(Math.max(2, height) * dpr()));
	if (canvas.width === w && canvas.height === h) return;
	canvas.width = w;
	canvas.height = h;
	if (viz) {
		try {
			viz.setRendererSize(w, h, { pixelRatio: 1 });
		} catch {
			/* ignore */
		}
	}
}

// ------------------------------------------------------------- lifecycle ---

function loop(now) {
	if (!canvas || !viz || !canvas.isConnected) {
		rafId = null;
		return;
	}
	rafId = requestAnimationFrame(loop);
	const dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 0.016;
	lastNow = now;
	try {
		viz.render();
		renders += 1;
	} catch {
		/* ignore render errors */
	}
	void dt;
}

function startLoop() {
	if (rafId == null) {
		lastNow = 0;
		rafId = requestAnimationFrame(loop);
	}
}

function stopLoop() {
	if (rafId != null) {
		cancelAnimationFrame(rafId);
		rafId = null;
	}
}

/**
 * Монтирует визуализатор в host. Возвращает cleanup-функцию.
 * Вызывается только из браузера (компонент, onMount).
 *
 * @param {HTMLElement} host
 * @param {VizHandlers} handlers
 * @returns {() => void}
 */
export function mount(host, handlers) {
	const token = ++mountToken;
	activeToken = token;
	handlersRef = handlers;
	hostEl = host;

	if (!isSupported()) {
		notifyStatus('unsupported', token);
		return () => {};
	}

	notifyStatus('loading', token);

	// Один canvas на сеанс: переиспользуется между мирами и входами.
	if (!canvas) {
		canvas = document.createElement('canvas');
		canvas.className = 'butterchurn-canvas';
		canvas.setAttribute('aria-hidden', 'true');
	}
	if (canvas.parentNode !== host) host.appendChild(canvas);

	const context = getContext();
	if (!context) {
		notifyStatus('unsupported', token);
		return () => {};
	}

	resize(host.clientWidth, host.clientHeight);

	ensureRuntime()
		.then((BC) => {
			if (token !== activeToken) return; // компонент уже размонтирован/заменён
			if (!viz) {
				viz = BC.createVisualizer(context, canvas, {
					width: canvas.width,
					height: canvas.height,
					pixelRatio: 1
				});
			}
			resize(host.clientWidth, host.clientHeight);
			connectActive();
			startLoop();
			notifyStatus('ready', token);
			// Первый mount — выбрать пресет. Повторный mount не перезагружает уже
			// живущий в singleton пресет, а сообщает его индекс новому компоненту
			// (иначе UI залипает на «загрузка…»).
			if (presetIndex < 0) drawPreset(token);
			else notifyPreset(presetIndex, token);
		})
		.catch((error) => {
			lastError = error && error.message ? error.message : String(error);
			if (typeof console !== 'undefined' && console.warn) console.warn('[butterchurn]', lastError);
			notifyStatus('error', token);
		});

	unsubscribeActive = subscribeActiveAudio(() => connectActive());

	return () => detach(host);
}

function detach(host) {
	if (hostEl !== host) return;
	hostEl = null;
	handlersRef = null;
	activeToken = 0; // инвалидируем token: незавершённые async-операции не доставляются
	stopLoop();
	if (unsubscribeActive) {
		unsubscribeActive();
		unsubscribeActive = null;
	}
	for (const node of connectedNodes) {
		try {
			viz && viz.disconnectAudio(node);
		} catch {
			/* ignore */
		}
	}
	connectedNodes = [];
	if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
	// canvas, viz и AudioContext намеренно остаются жить и переиспользуются.
}

// ----------------------------------------------------------- диагностика ---
// Лёгкий снимок состояния для автотестов (браузер-only). На поведение не влияет.

export function snapshot() {
	const active = getActiveAudio();
	return {
		status,
		error: lastError || null,
		supported: isSupported(),
		mounted: Boolean(canvas && canvas.isConnected),
		canvases: typeof document === 'undefined' ? 0 : document.querySelectorAll('canvas.butterchurn-canvas').length,
		contexts: getContext() ? 1 : 0,
		contextState: getContext() ? getContext().state : null,
		audioSources: sourceCount(),
		activeSrc: active ? active.currentSrc || active.src : null,
		activePaused: active ? active.paused : null,
		presetIndex,
		preset: presetName,
		presets: presets.length,
		renders,
		connected: connectedNodes.length
	};
}

if (typeof window !== 'undefined') {
	/** @type {any} */ (window).__InfiniteTodayViz = { snapshot, next, prev, selectPreset, isSupported };
}
