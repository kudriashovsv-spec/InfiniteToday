// Глобальный музыкальный player (L1): состояние + управление.
//
// Живёт в модуле (а не в компоненте), потому что переживать route transitions
// должен не только звук, но и выбранный трек, позиция, громкость и mute.
// Сам <audio> элемент монтируется один раз в layout (GlobalPlayer.svelte) и
// передаётся сюда через attachGlobalAudio(); при переходах L1→L2→L3 он не
// уничтожается, поэтому воспроизведение продолжается.
//
// Audio-слой общий с L3 TrackPlayer:
//   playback.js — один активный источник, pauseOthers, реестр элементов;
//   graph.js    — единый AudioContext и MediaElementSource.
// Отдельного «global» AudioContext нет.

import { asset } from '$app/paths';
import type { AssetPath } from '$app/types';
import { tracks, getTrack, type Track } from '#lib/data/music.js';
import { getMorphologyForTrack } from '#lib/data/dna.js';
import { isFavorite, registerFavoritesListener } from '#lib/favorites.svelte.js';
import { registerAudio, pauseOthers, setActiveAudio } from '#lib/audio/playback.js';
import { releaseSource } from '#lib/audio/graph.js';

/** Реактивное состояние библиотеки L1. */
export interface PlayerState {
	trackId: string;
	playing: boolean;
	/** был ли реальный старт воспроизведения в этой сессии (не просто выбор) */
	started: boolean;
	loading: boolean;
	retrying: boolean;
	failed: boolean;
	currentTime: number;
	duration: number;
	volume: number;
	muted: boolean;
	/** режим случайного порядка воспроизведения активной очереди */
	shuffle: boolean;
}

/** Глобальное реактивное состояние библиотеки L1. */
export const player: PlayerState = $state({
	trackId: tracks.length ? tracks[0].id : '',
	playing: false,
	started: false,
	loading: false,
	retrying: false,
	failed: false,
	currentTime: 0,
	duration: 0,
	volume: 1,
	muted: false,
	shuffle: false
});

/**
 * Активный фильтр каталога L1. ЕДИНЫЙ источник правды: и видимость строк
 * в LibraryPanel, и активная очередь next/prev/autoAdvance читают только его.
 *
 * `morphologies` — МАССИВ выбранных морфологий (несколько значений
 * объединяются по ИЛИ); пустой массив — фильтра по морфологиям нет.
 * `favorites` — режим «Избранное» (только избранные версии). Режимы
 * взаимоисключающие: включение одного снимает другой.
 * Фильтр — desktop-only по UI: на mobile его меню скрыто, но значение всё равно
 * остаётся источником правды для очереди.
 */
export const libraryFilter = $state({ morphologies: [] as string[], favorites: false });

/** Сравнение выбора по содержимому (повторный клик не должен ничего пересобирать). */
function sameSelection(a: string[], b: string[]): boolean {
	return a.length === b.length && a.every((id) => b.includes(id));
}

/** Сигнатура активного фильтра — ключ для порядка перемешивания. */
function filterSignature(): string {
	const morphs = [...libraryFilter.morphologies].sort().join(',');
	return `${libraryFilter.favorites ? 'favorites' : ''}|${morphs}`;
}

/**
 * Активная очередь воспроизведения: весь каталог при пустом фильтре, иначе —
 * треки ВЫБРАННЫХ морфологий (объединение по ИЛИ) в исходном порядке каталога.
 * Исходный `tracks` не мутируется (это производная).
 *
 * Это состав очереди и её КАНОНИЧЕСКИЙ порядок. Режим перемешивания меняет
 * только порядок воспроизведения (см. `playbackQueue()` ниже), не состав.
 */
export function activeQueue(): Track[] {
	// Режим «Избранное» — отдельный состав: только избранные версии.
	if (libraryFilter.favorites) return tracks.filter((track) => isFavorite(track.id));
	const selected = libraryFilter.morphologies;
	if (!selected.length) return tracks;
	return tracks.filter((track) => {
		const morph = getMorphologyForTrack(track.id);
		return !!morph && selected.includes(morph);
	});
}

// ============================================================================
// Случайный порядок воспроизведения (shuffle)
//
// Перемешивается только ПОРЯДОК активной очереди: состав по-прежнему считает
// `activeQueue()` (единственный источник правды для фильтра), а исходный каталог
// `tracks` не мутируется. Порядок строится один раз на включение режима (и заново
// при смене фильтра), поэтому внутри одного цикла треки не повторяются.
// Цикл линейный: дойдя до последнего трека, автопереход останавливается, а не
// начинает очередь заново.
// ============================================================================

/** Порядок id перемешанной очереди; пусто, пока порядок не построен. */
let shuffleIds: string[] = [];
/** Фильтр, для которого построен текущий порядок; null — порядка нет. */
let shuffleKey: string | null = null;

/**
 * Текущий трек — первым в цикле (он не должен перезапускаться при включении),
 * остальные треки активной очереди — в случайном порядке (Fisher–Yates).
 * Если текущий трек в очередь не входит, он в цикле не участвует.
 */
function buildShuffleOrder(base: Track[]): string[] {
	const ids = base.map((track) => track.id);
	const current = player.trackId;
	const rest = ids.filter((id) => id !== current);
	for (let i = rest.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[rest[i], rest[j]] = [rest[j], rest[i]];
	}
	return ids.includes(current) ? [current, ...rest] : rest;
}

/** Сбросить порядок: следующий `playbackQueue()` пересоберёт его заново. */
function invalidateShuffleOrder(): void {
	shuffleIds = [];
	shuffleKey = null;
}

/**
 * Порядок воспроизведения: активная очередь как есть либо её перемешанная
 * версия. Построенный порядок хранится до смены фильтра или режима, поэтому
 * переходы next/prev/autoAdvance и предзагрузка всегда идут по одному и тому же
 * циклу, а не перемешиваются заново на каждом шаге.
 */
export function playbackQueue(): Track[] {
	const base = activeQueue();
	if (!player.shuffle) return base;
	const key = filterSignature();
	if (shuffleKey !== key || !shuffleIds.length) {
		shuffleKey = key;
		shuffleIds = buildShuffleOrder(base);
	}
	const byId = new Map(base.map((track) => [track.id, track]));
	return shuffleIds.map((id) => byId.get(id)).filter((track): track is Track => !!track);
}

/**
 * Включение/выключение случайного порядка. Текущий трек не трогается: он не
 * перезапускается и не меняется, режим влияет только на порядок будущих
 * переходов. При включении порядок строится заново — случайный.
 */
export function setShuffle(enabled: boolean): void {
	if (player.shuffle === enabled) return;
	player.shuffle = enabled;
	invalidateShuffleOrder();
	// Следующий кандидат мог измениться — старая предзагрузка больше не нужна.
	cancelPrefetch();
}

export function toggleShuffle(): void {
	setShuffle(!player.shuffle);
}

/**
 * Смена DNA-фильтра целиком. Очередь и (при включённом перемешивании) её порядок
 * пересобираются, но текущий трек не прерывается: он доигрывает как есть и
 * только потом уступает место трекам, подходящим под новый набор. Пустой
 * массив — фильтра нет (весь каталог).
 */
export function setLibraryFilter(morphologies: string[]): void {
	const next = [...morphologies];
	// Ничего не меняется, если набор тот же и «Избранное» и так выключено
	// (при непустом наборе оно выключено по определению режимов).
	if (sameSelection(next, libraryFilter.morphologies) && (next.length > 0 || !libraryFilter.favorites))
		return;
	libraryFilter.morphologies = next;
	// Режимы взаимоисключающие: смена DNA-набора снимает «Избранное».
	libraryFilter.favorites = false;
	invalidateShuffleOrder();
	cancelPrefetch();
}

/**
 * Режим «Избранное» в фильтре каталога (desktop-only UI). Включается ВМЕСТО
 * DNA-набора, поэтому при включении выбранные морфологии сбрасываются.
 */
export function setFavoritesFilter(enabled: boolean): void {
	if (libraryFilter.favorites === enabled) return;
	libraryFilter.favorites = enabled;
	if (enabled) libraryFilter.morphologies = [];
	invalidateShuffleOrder();
	cancelPrefetch();
}

// Избранное меняет СОСТАВ очереди только в режиме фильтра «Избранное»: там
// снимаем устаревший порядок перемешивания и предзагрузку — точно так же, как
// при смене фильтра. В обычном режиме избранное на очередь не влияет, поэтому
// порядок не сбрасывается (иначе он перемешивался бы от каждого сердечка).
registerFavoritesListener(() => {
	if (!libraryFilter.favorites) return;
	invalidateShuffleOrder();
	cancelPrefetch();
});

/** Добавить/убрать одну морфологию — мультивыбор в DNA-фильтре L1. */
export function toggleMorphology(id: string): void {
	const current = libraryFilter.morphologies;
	setLibraryFilter(current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
}

let audioEl: HTMLAudioElement | null = null;
/** id, для которого уже назначен src (ленивое назначение, как в v1.1). */
let assignedId: string | null = null;

export function formatTime(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
	const total = Math.floor(seconds);
	return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function currentTrack(): Track | undefined {
	return getTrack(player.trackId);
}

function applySrc(): void {
	if (!audioEl) return;
	const track = currentTrack();
	if (!track) return;
	if (assignedId !== track.id) {
		// Data-слой отдаёт runtime-строку (`src` — путь относительно static/),
		// а asset() в SvelteKit 3 принимает статический union AssetPath.
		// Это не any-каст, а сужение строки к реальному типу известных ассетов.
		audioEl.src = asset(track.src as AssetPath);
		assignedId = track.id;
	}
}

function requestPlay(): void {
	if (!audioEl) return;
	applySrc();
	// Спецификация возвращает Promise, но защищаемся от реализаций без него.
	const request: Promise<void> | undefined = audioEl.play();
	if (request && typeof request.catch === 'function') request.catch(() => {});
}

function syncProgress(): void {
	if (!audioEl) return;
	player.currentTime = audioEl.currentTime || 0;
	if (Number.isFinite(audioEl.duration)) player.duration = audioEl.duration;
}

/**
 * Монтирует persistent <audio> (один раз, из layout).
 */
export function attachGlobalAudio(el: HTMLAudioElement): () => void {
	audioEl = el;
	assignedId = null;
	el.volume = player.volume;
	el.muted = player.muted;
	el.preload = 'none';

	const onPlay = () => {
		// 'play' — воспроизведение только ЗАПРОШЕНО, данные могут ещё грузиться.
		// Поэтому playing/loading выставляются на 'playing', а не здесь.
		pauseOthers(el);
		setActiveAudio(el);
	};
	const onPlaying = () => {
		player.playing = true;
		// Реальный старт: только с этого момента трек считается активной сессией
		// (и остаётся видимым в каталоге даже под чужим фильтром, в т.ч. на паузе).
		player.started = true;
		player.loading = false;
		player.retrying = false;
	};
	const onPause = () => {
		player.playing = false;
		player.loading = false;
	};
	const onEnded = () => {
		player.playing = false;
		player.loading = false;
		player.retrying = false;
		autoAdvance();
	};
	const onTime = () => {
		syncProgress();
		maybePrefetch();
	};
	const onMeta = () => {
		if (Number.isFinite(el.duration)) player.duration = el.duration;
	};
	const onReady = () => {
		onMeta();
		player.loading = false;
		player.retrying = false;
	};
	const onLoadStart = () => {
		player.failed = false;
		player.loading = true;
	};
	const onWaiting = () => {
		player.loading = true;
	};
	const onVolume = () => {
		player.volume = el.volume;
		player.muted = el.muted;
	};
	const onError = () => {
		player.failed = true;
		player.loading = false;
		player.retrying = false;
	};

	el.addEventListener('play', onPlay);
	el.addEventListener('playing', onPlaying);
	el.addEventListener('pause', onPause);
	el.addEventListener('ended', onEnded);
	el.addEventListener('timeupdate', onTime);
	el.addEventListener('loadedmetadata', onMeta);
	el.addEventListener('durationchange', onMeta);
	el.addEventListener('canplay', onReady);
	el.addEventListener('loadstart', onLoadStart);
	el.addEventListener('waiting', onWaiting);
	el.addEventListener('volumechange', onVolume);
	el.addEventListener('error', onError);

	const unregister = registerAudio(el);

	return () => {
		el.removeEventListener('play', onPlay);
		el.removeEventListener('playing', onPlaying);
		el.removeEventListener('pause', onPause);
		el.removeEventListener('ended', onEnded);
		el.removeEventListener('timeupdate', onTime);
		el.removeEventListener('loadedmetadata', onMeta);
		el.removeEventListener('durationchange', onMeta);
		el.removeEventListener('canplay', onReady);
		el.removeEventListener('loadstart', onLoadStart);
		el.removeEventListener('waiting', onWaiting);
		el.removeEventListener('volumechange', onVolume);
		el.removeEventListener('error', onError);
		unregister();
		releaseSource(el);
		cancelPrefetch();
		audioEl = null;
		assignedId = null;
	};
}

export function selectTrack(id: string, autoplay = true): void {
	const track = getTrack(id);
	if (!track) return;
	const changed = player.trackId !== id;
	player.trackId = id;
	player.failed = false;
	if (changed) {
		player.currentTime = 0;
		player.duration = 0;
		player.loading = false;
		player.retrying = false;
		assignedId = null;
		// Сменился трек — старая предзагрузка больше не нужна (в т.ч. в полёте).
		cancelPrefetch();
	}
	if (autoplay) {
		requestPlay();
	} else if (audioEl && !changed) {
		syncProgress();
	}
}

export function selectIndex(index: number, autoplay = true): void {
	const track = tracks[index];
	if (track) selectTrack(track.id, autoplay);
}

/** Индекс текущего трека в полном каталоге. */
function catalogIndex(): number {
	return tracks.findIndex((track) => track.id === player.trackId);
}

/**
 * Переход по активной очереди (next/prev/autoAdvance) — единая логика.
 *
 * direction +1 — вперёд, −1 — назад. wrap=false (автопереход) останавливается
 * на краю очереди, wrap=true (кнопки) зацикливается — как в исходном плеере.
 *
 * Если текущий трек в очередь не входит (играет «чужую» морфологию), первый
 * переход берёт ближайший подходящий по исходному порядку каталога, а если
 * таких больше нет — крайний трек очереди. В режиме перемешивания «ближайший»
 * не имеет смысла — берётся начало (вперёд) или конец (назад) перемешанного
 * цикла. Дальше переходы идут уже только внутри очереди.
 */
function step(direction: 1 | -1, wrap: boolean): void {
	const queue = playbackQueue();
	if (!queue.length) return; // нет подходящих треков — безопасно ничего не делаем

	const index = queue.findIndex((track) => track.id === player.trackId);
	if (index === -1) {
		// В перемешанном порядке «ближайший по каталогу» смысла не имеет:
		// выходим на начало (или конец) уже перемешанного цикла.
		if (player.shuffle) {
			selectTrack(direction === 1 ? queue[0].id : queue[queue.length - 1].id, true);
			return;
		}
		const from = catalogIndex();
		const candidates = direction === 1 ? queue : [...queue].reverse();
		const near = candidates.find((track) =>
			direction === 1 ? tracks.indexOf(track) > from : tracks.indexOf(track) < from
		);
		const fallback = direction === 1 ? queue[0] : queue[queue.length - 1];
		selectTrack((near ?? fallback).id, true);
		return;
	}

	const target = index + direction;
	if (target < 0 || target >= queue.length) {
		// Конец очереди/цикла — стоп для автоперехода (для кнопок — зацикливание).
		if (!wrap) return;
		selectTrack(queue[(target + queue.length) % queue.length].id, true);
		return;
	}
	selectTrack(queue[target].id, true);
}

/** Автопереход по окончании; внутри фильтра — только его треки, на краю — стоп. */
function autoAdvance(): void {
	step(1, false);
}

// ============================================================================
// Предзагрузка следующего трека (эксперимент Фазы 5)
//
// Идея: незадолго до конца текущего трека скачать ровно одного следующего
// кандидата из ДЕЙСТВУЮЩЕЙ очереди (с учётом фильтра и перемешивания) через
// `fetch()`. Данные попадают в HTTP-кеш,
// а основной <audio> их переиспользует (измерено: ~12 ms против ~1.5 s без
// предзагрузки под троттлингом 1 МБ/с). Никакого второго аудиоэлемента,
// AudioContext или запуска звука тут нет.
//
// Ограничения: только один кандидат; только в окне PREFETCH_LEAD_SECONDS от
// конца; отмена при смене трека/фильтра/кандидата или режима перемешивания;
// пропуск при Save-Data или очень медленном соединении.

/** Окно предзагрузки до конца трека (гипотеза 10–15 с). */
const PREFETCH_LEAD_SECONDS = 12;

let prefetchId: string | null = null;
let prefetchController: AbortController | null = null;

interface NetworkInformationLike {
	saveData?: boolean;
	effectiveType?: string;
}
interface NavigatorWithConnection extends Navigator {
	connection?: NetworkInformationLike;
}

/** Не грузим заранее при экономии трафика или очень медленном соединении. */
function canPrefetch(): boolean {
	if (typeof navigator === 'undefined') return false;
	const conn = (navigator as NavigatorWithConnection).connection;
	if (conn?.saveData) return false;
	const type = conn?.effectiveType;
	return type !== 'slow-2g' && type !== '2g';
}

/**
 * Следующий трек для АВТОПЕРЕХОДА — ровно тот, что выберет autoAdvance()
 * (та же текущая очередь, без зацикливания; на краю — нет кандидата).
 */
function upcomingTrack(): Track | undefined {
	const queue = playbackQueue();
	if (!queue.length) return undefined;
	const index = queue.findIndex((track) => track.id === player.trackId);
	if (index !== -1) return queue[index + 1];
	// Текущего трека в очереди нет: в перемешанном режиме кандидат — начало цикла.
	if (player.shuffle) return queue[0];
	const from = catalogIndex();
	return queue.find((track) => tracks.indexOf(track) > from);
}

function cancelPrefetch(): void {
	if (prefetchController) {
		try {
			prefetchController.abort();
		} catch {
			/* ignore */
		}
		prefetchController = null;
	}
	prefetchId = null;
}

function maybePrefetch(): void {
	if (!audioEl || audioEl.paused) return;
	const total = audioEl.duration;
	if (!Number.isFinite(total) || total <= 0) return;
	if (total - audioEl.currentTime > PREFETCH_LEAD_SECONDS) return;

	const next = upcomingTrack();
	if (!next || next.id === prefetchId) return; // этот кандидат уже готов или грузится
	if (!canPrefetch()) return;

	// Кандидат сменился (трек/фильтр) — отменяем прежнюю подготовку.
	if (prefetchController) {
		try {
			prefetchController.abort();
		} catch {
			/* ignore */
		}
	}
	prefetchId = next.id;
	const controller = new AbortController();
	prefetchController = controller;
	// Тело обязательно вычитываем: только тогда ответ полностью попадает в кеш.
	fetch(asset(next.src as AssetPath), { signal: controller.signal })
		.then((res) => (res.ok ? res.arrayBuffer() : null))
		.catch(() => null)
		.finally(() => {
			if (prefetchController === controller) prefetchController = null;
		});
}

export function next(): void {
	step(1, true);
}

export function prev(): void {
	step(-1, true);
}

/**
 * Перед запуском: если реальной сессии ещё не было, а текущий (по умолчанию)
 * трек не входит в активную очередь, Play запускает первый подходящий трек
 * выбранной морфологии, а не скрытый трек чужой морфологии. Если сессия уже
 * была (играл/пауза) — ничего не меняем: Play просто возобновляет текущий.
 */
function ensurePlayableCurrent(): void {
	if (player.started) return;
	const queue = playbackQueue();
	if (!queue.length) return;
	if (queue.some((track) => track.id === player.trackId)) return;
	selectTrack(queue[0].id, false);
}

export function play(): void {
	if (!audioEl) return;
	if (player.failed) {
		retry();
		return;
	}
	ensurePlayableCurrent();
	if (audioEl.paused) requestPlay();
}

export function pause(): void {
	if (audioEl && !audioEl.paused) audioEl.pause();
}

export function toggle(): void {
	if (!audioEl) return;
	if (player.failed) {
		retry();
		return;
	}
	if (audioEl.paused) {
		ensurePlayableCurrent();
		requestPlay();
	} else {
		audioEl.pause();
	}
}

/**
 * Восстановление после ошибки загрузки. Не отдельная audio-логика: заново
 * переназначаем src через штатный applySrc() (assignedId сбрасывается, иначе
 * повторный src был бы проигнорирован), перезагружаем элемент и пробуем play().
 */
export function retry(): void {
	if (!audioEl) return;
	player.failed = false;
	player.retrying = true;
	player.loading = true;
	assignedId = null;
	applySrc();
	audioEl.load();
	requestPlay();
}

export function seekTo(seconds: number): void {
	if (!audioEl) return;
	const total = audioEl.duration;
	if (!Number.isFinite(total) || total <= 0) return;
	audioEl.currentTime = Math.min(Math.max(seconds, 0), total);
	syncProgress();
}

export function setVolume(value: number): void {
	player.volume = Math.min(1, Math.max(0, value));
	if (audioEl) {
		audioEl.volume = player.volume;
		if (player.volume > 0 && audioEl.muted) audioEl.muted = false;
	}
}

export function toggleMute(): void {
	if (!audioEl) {
		player.muted = !player.muted;
		return;
	}
	audioEl.muted = !audioEl.muted;
}
