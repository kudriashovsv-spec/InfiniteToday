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
import { tracks, getTrack } from '#lib/data/music.js';
import { registerAudio, pauseOthers, setActiveAudio } from '#lib/audio/playback.js';
import { releaseSource } from '#lib/audio/graph.js';

/** Глобальное реактивное состояние библиотеки L1. */
export const player = $state({
	trackId: tracks.length ? tracks[0].id : '',
	playing: false,
	currentTime: 0,
	duration: 0,
	volume: 1,
	muted: false,
	failed: false
});

/** @type {HTMLAudioElement | null} */
let audioEl = null;
/** id, для которого уже назначен src (ленивое назначение, как в v1.1). */
let assignedId = null;

/**
 * @param {number} seconds
 * @returns {string}
 */
export function formatTime(seconds) {
	if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
	const total = Math.floor(seconds);
	return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** @returns {import('#lib/data/music.js').Track | undefined} */
export function currentTrack() {
	return getTrack(player.trackId);
}

function applySrc() {
	if (!audioEl) return;
	const track = currentTrack();
	if (!track) return;
	if (assignedId !== track.id) {
		audioEl.src = asset(track.src);
		assignedId = track.id;
	}
}

function requestPlay() {
	if (!audioEl) return;
	applySrc();
	const request = audioEl.play();
	if (request && typeof request.catch === 'function') request.catch(() => {});
}

function syncProgress() {
	if (!audioEl) return;
	player.currentTime = audioEl.currentTime || 0;
	if (Number.isFinite(audioEl.duration)) player.duration = audioEl.duration;
}

/**
 * Монтирует persistent <audio> (один раз, из layout).
 * @param {HTMLAudioElement} el
 * @returns {() => void}
 */
export function attachGlobalAudio(el) {
	audioEl = el;
	assignedId = null;
	el.volume = player.volume;
	el.muted = player.muted;
	el.preload = 'none';

	const onPlay = () => {
		player.playing = true;
		pauseOthers(el);
		setActiveAudio(el);
	};
	const onPause = () => {
		player.playing = false;
	};
	const onEnded = () => {
		player.playing = false;
		autoAdvance();
	};
	const onTime = syncProgress;
	const onMeta = () => {
		if (Number.isFinite(el.duration)) player.duration = el.duration;
	};
	const onVolume = () => {
		player.volume = el.volume;
		player.muted = el.muted;
	};
	const onError = () => {
		player.failed = true;
	};

	el.addEventListener('play', onPlay);
	el.addEventListener('pause', onPause);
	el.addEventListener('ended', onEnded);
	el.addEventListener('timeupdate', onTime);
	el.addEventListener('loadedmetadata', onMeta);
	el.addEventListener('durationchange', onMeta);
	el.addEventListener('canplay', onMeta);
	el.addEventListener('volumechange', onVolume);
	el.addEventListener('error', onError);

	const unregister = registerAudio(el);

	return () => {
		el.removeEventListener('play', onPlay);
		el.removeEventListener('pause', onPause);
		el.removeEventListener('ended', onEnded);
		el.removeEventListener('timeupdate', onTime);
		el.removeEventListener('loadedmetadata', onMeta);
		el.removeEventListener('durationchange', onMeta);
		el.removeEventListener('canplay', onMeta);
		el.removeEventListener('volumechange', onVolume);
		el.removeEventListener('error', onError);
		unregister();
		releaseSource(el);
		audioEl = null;
		assignedId = null;
	};
}

/**
 * @param {string} id
 * @param {boolean} [autoplay]
 */
export function selectTrack(id, autoplay = true) {
	const track = getTrack(id);
	if (!track) return;
	const changed = player.trackId !== id;
	player.trackId = id;
	player.failed = false;
	if (changed) {
		player.currentTime = 0;
		player.duration = 0;
		assignedId = null;
	}
	if (autoplay) {
		requestPlay();
	} else if (audioEl && !changed) {
		syncProgress();
	}
}

/**
 * @param {number} index
 * @param {boolean} [autoplay]
 */
export function selectIndex(index, autoplay = true) {
	const track = tracks[index];
	if (track) selectTrack(track.id, autoplay);
}

/** Индекс текущего трека в общей библиотеке. */
function currentIndex() {
	return tracks.findIndex((track) => track.id === player.trackId);
}

/** Автопереход только по естественному окончанию; на последнем — стоп (как v1.1). */
function autoAdvance() {
	const index = currentIndex();
	if (index === -1) return;
	const next = index + 1;
	if (next < tracks.length) selectIndex(next, true);
}

export function next() {
	const count = tracks.length;
	if (!count) return;
	const index = currentIndex();
	selectIndex(((index === -1 ? 0 : index + 1) % count + count) % count, true);
}

export function prev() {
	const count = tracks.length;
	if (!count) return;
	const index = currentIndex();
	selectIndex(((index === -1 ? 0 : index - 1) % count + count) % count, true);
}

export function toggle() {
	if (!audioEl) return;
	if (audioEl.paused) requestPlay();
	else audioEl.pause();
}

/** @param {number} seconds */
export function seekTo(seconds) {
	if (!audioEl) return;
	const total = audioEl.duration;
	if (!Number.isFinite(total) || total <= 0) return;
	audioEl.currentTime = Math.min(Math.max(seconds, 0), total);
	syncProgress();
}

/** @param {number} value */
export function setVolume(value) {
	player.volume = Math.min(1, Math.max(0, value));
	if (audioEl) {
		audioEl.volume = player.volume;
		if (player.volume > 0 && audioEl.muted) audioEl.muted = false;
	}
}

export function toggleMute() {
	if (!audioEl) {
		player.muted = !player.muted;
		return;
	}
	audioEl.muted = !audioEl.muted;
}
