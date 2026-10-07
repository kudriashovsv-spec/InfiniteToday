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
import { registerAudio, pauseOthers, setActiveAudio } from '#lib/audio/playback.js';
import { releaseSource } from '#lib/audio/graph.js';

/** Реактивное состояние библиотеки L1. */
export interface PlayerState {
	trackId: string;
	playing: boolean;
	loading: boolean;
	retrying: boolean;
	failed: boolean;
	currentTime: number;
	duration: number;
	volume: number;
	muted: boolean;
}

/** Глобальное реактивное состояние библиотеки L1. */
export const player: PlayerState = $state({
	trackId: tracks.length ? tracks[0].id : '',
	playing: false,
	loading: false,
	retrying: false,
	failed: false,
	currentTime: 0,
	duration: 0,
	volume: 1,
	muted: false
});

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
	const onTime = syncProgress;
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

/** Индекс текущего трека в общей библиотеке. */
function currentIndex(): number {
	return tracks.findIndex((track) => track.id === player.trackId);
}

/** Автопереход только по естественному окончанию; на последнем — стоп (как v1.1). */
function autoAdvance(): void {
	const index = currentIndex();
	if (index === -1) return;
	const next = index + 1;
	if (next < tracks.length) selectIndex(next, true);
}

export function next(): void {
	const count = tracks.length;
	if (!count) return;
	const index = currentIndex();
	selectIndex(((index === -1 ? 0 : index + 1) % count + count) % count, true);
}

export function prev(): void {
	const count = tracks.length;
	if (!count) return;
	const index = currentIndex();
	selectIndex(((index === -1 ? 0 : index - 1) % count + count) % count, true);
}

export function play(): void {
	if (!audioEl) return;
	if (player.failed) {
		retry();
		return;
	}
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
	if (audioEl.paused) requestPlay();
	else audioEl.pause();
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
