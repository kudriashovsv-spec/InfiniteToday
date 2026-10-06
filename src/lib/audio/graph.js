// Общий Web Audio граф. Один AudioContext на всю страницу.
//
// Зачем отдельный модуль: MediaElementAudioSourceNode для одного и того же
// <audio> можно создать ровно один раз (повторный вызов createMediaElementSource
// бросает исключение), а AudioContext нельзя плодить по миру/плееру/переходу.
// Поэтому граф — модульный singleton, а не часть компонента или визуализатора.
//
// Маршрут звука: MediaElementSource → destination (обычное прослушивание).
// Визуализатор отдельно подключает тот же узел к Butterchurn (connectAudio),
// не разрывая слышимый маршрут.

/** @type {AudioContext | null} */
let ctx = null;

/** @type {Map<HTMLAudioElement, MediaElementAudioSourceNode>} */
const sources = new Map();

// Общий analyser для аудиовизуализаторов (Audio DNA). Graph о нём не знает
// ничего конкретного: просто отдаёт узел и позволяет подключать к нему
// любой source-узел. Никаких if butterchurn / if audioDNA здесь нет.
/** @type {AnalyserNode | null} */
let analyser = null;
/** @type {GainNode | null} */
let silentGain = null;

let gestureBound = false;

function bindGestureResume() {
	if (gestureBound || typeof window === 'undefined') return;
	gestureBound = true;
	const onGesture = () => resume();
	window.addEventListener('pointerdown', onGesture, true);
	window.addEventListener('touchstart', onGesture, true);
	window.addEventListener('keydown', onGesture, true);
}

/**
 * Единственный AudioContext (создаётся лениво, только в браузере).
 * @returns {AudioContext | null}
 */
export function getContext() {
	if (ctx) return ctx;
	if (typeof window === 'undefined') return null;
	const AC = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
	if (!AC) return null;
	ctx = new AC();
	bindGestureResume();
	return ctx;
}

export function resume() {
	if (!ctx || ctx.state !== 'suspended') return;
	const request = ctx.resume();
	if (request && typeof request.catch === 'function') request.catch(() => {});
}

/** @returns {AudioContextState | null} */
export function getContextState() {
	return ctx ? ctx.state : null;
}

/**
 * MediaElementSource для <audio>: создаётся один раз за сеанс и переиспользуется.
 * @param {HTMLAudioElement} audio
 * @returns {MediaElementAudioSourceNode | null}
 */
export function getSource(audio) {
	const context = getContext();
	if (!context) return null;
	let node = sources.get(audio);
	if (!node) {
		node = context.createMediaElementSource(audio);
		node.connect(context.destination);
		sources.set(audio, node);
	}
	return node;
}

/**
 * Освобождает граф для удалённого <audio> (компонент размонтирован), чтобы при
 * повторных входах в миры граф не копил мёртвые узлы. Возврат к тому же
 * элементу после release невозможен — но элементы у нас живут в рамках mount.
 * @param {HTMLAudioElement} audio
 */
export function releaseSource(audio) {
	const node = sources.get(audio);
	if (!node) return;
	try {
		node.disconnect();
	} catch {
		/* ignore */
	}
	sources.delete(audio);
}

/** Диагностика: сколько источников заведено (для автотестов). */
export function sourceCount() {
	return sources.size;
}

/**
 * Общий AnalyserNode. Создаётся один раз. Подключён к destination через
 * gain=0, чтобы граф гарантированно обрабатывал его и при этом анализ
 * НЕ дублировал слышимый звук.
 * @returns {AnalyserNode | null}
 */
export function getAnalyser() {
	const context = getContext();
	if (!context) return null;
	if (!analyser) {
		analyser = context.createAnalyser();
		silentGain = context.createGain();
		silentGain.gain.value = 0;
		analyser.connect(silentGain);
		silentGain.connect(context.destination);
	}
	return analyser;
}

/**
 * Подключает source-узел к общему analyser (без изменения слышимого сигнала).
 * @param {AudioNode | null} node
 */
export function tapAnalyser(node) {
	const a = getAnalyser();
	if (!a || !node) return;
	try {
		node.connect(a);
	} catch {
		/* ignore */
	}
}

/**
 * Отключает source-узел от общего analyser.
 * @param {AudioNode | null} node
 */
export function untapAnalyser(node) {
	if (!analyser || !node) return;
	try {
		node.disconnect(analyser);
	} catch {
		/* ignore */
	}
}
