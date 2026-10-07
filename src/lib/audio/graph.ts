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

/** Единственный на сеанс AudioContext (создаётся лениво, только в браузере). */
let ctx: AudioContext | null = null;

/** MediaElementSource для каждого заведённого <audio>. */
const sources = new Map<HTMLAudioElement, MediaElementAudioSourceNode>();

// Общий analyser для аудиовизуализаторов (Audio DNA). Graph о нём не знает
// ничего конкретного: просто отдаёт узел и позволяет подключать к нему
// любой source-узел. Никаких if butterchurn / if audioDNA здесь нет.
let analyser: AnalyserNode | null = null;
let silentGain: GainNode | null = null;

let gestureBound = false;

function bindGestureResume() {
	if (gestureBound || typeof window === 'undefined') return;
	gestureBound = true;
	const onGesture = () => resume();
	window.addEventListener('pointerdown', onGesture, true);
	window.addEventListener('touchstart', onGesture, true);
	window.addEventListener('keydown', onGesture, true);
}

/** Legacy-имя того же конструктора в старых Safari (без any-каста). */
interface WebkitAudioWindow extends Window {
	webkitAudioContext?: typeof AudioContext;
}

/**
 * Единственный AudioContext (создаётся лениво, только в браузере).
 */
export function getContext(): AudioContext | null {
	if (ctx) return ctx;
	if (typeof window === 'undefined') return null;
	const legacy = window as WebkitAudioWindow;
	const AC: typeof AudioContext | undefined =
		typeof window.AudioContext === 'function' ? window.AudioContext : legacy.webkitAudioContext;
	if (!AC) return null;
	ctx = new AC();
	bindGestureResume();
	return ctx;
}

export function resume(): void {
	if (!ctx || ctx.state !== 'suspended') return;
	// Спецификация возвращает Promise, но защищаемся от реализаций без него.
	const request: Promise<void> | undefined = ctx.resume();
	if (request && typeof request.catch === 'function') request.catch(() => {});
}

export function getContextState(): AudioContextState | null {
	return ctx ? ctx.state : null;
}

/**
 * MediaElementSource для <audio>: создаётся один раз за сеанс и переиспользуется.
 */
export function getSource(audio: HTMLAudioElement): MediaElementAudioSourceNode | null {
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
 */
export function releaseSource(audio: HTMLAudioElement): void {
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
 */
export function getAnalyser(): AnalyserNode | null {
	const context = getContext();
	if (!context) return null;
	if (!analyser) {
		// Локальные ссылки: модульный `let` без потерь сужения типа.
		const node = context.createAnalyser();
		const gain = context.createGain();
		gain.gain.value = 0;
		node.connect(gain);
		gain.connect(context.destination);
		analyser = node;
		silentGain = gain;
	}
	return analyser;
}

/**
 * Подключает source-узел к общему analyser (без изменения слышимого сигнала).
 */
export function tapAnalyser(node: AudioNode | null): void {
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
 */
export function untapAnalyser(node: AudioNode | null): void {
	if (!analyser || !node) return;
	try {
		node.disconnect(analyser);
	} catch {
		/* ignore */
	}
}
