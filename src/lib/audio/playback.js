// Координация воспроизведения нескольких <audio> на одной странице.
//
// Отвечает ровно за две вещи:
//   1. одновременно звучит только одна версия песни (как в v1.1);
//   2. известно, какой <audio> сейчас активен — на него подписывается
//      аудиовизуализатор (Butterchurn), не зная о TrackPlayer напрямую.
//
// Веб-аудио граф (AudioContext, MediaElementSource) живёт отдельно, в
// src/lib/audio/graph.js — чтобы этот модуль не превращался в монолит.

/** @type {Set<HTMLAudioElement>} */
const registered = new Set();

/** @type {HTMLAudioElement | null} */
let activeAudio = null;

/** @type {Set<(audio: HTMLAudioElement | null) => void>} */
const activeListeners = new Set();

/**
 * Регистрирует audio на время жизни компонента.
 * @param {HTMLAudioElement} audio
 * @returns {() => void} функция очистки
 */
export function registerAudio(audio) {
	registered.add(audio);
	return () => {
		registered.delete(audio);
		if (activeAudio === audio) setActiveAudio(null);
	};
}

/**
 * Ставит на паузу все зарегистрированные аудио, кроме переданного.
 * @param {HTMLAudioElement} except
 */
export function pauseOthers(except) {
	for (const audio of registered) {
		if (audio !== except && !audio.paused) audio.pause();
	}
}

/**
 * Помечает audio как активный источник для визуализатора.
 * @param {HTMLAudioElement | null} audio
 */
export function setActiveAudio(audio) {
	if (activeAudio === audio) return;
	activeAudio = audio;
	for (const listener of activeListeners) listener(activeAudio);
}

/** @returns {HTMLAudioElement | null} */
export function getActiveAudio() {
	return activeAudio;
}

/**
 * @param {(audio: HTMLAudioElement | null) => void} listener
 * @returns {() => void}
 */
export function subscribeActiveAudio(listener) {
	activeListeners.add(listener);
	return () => {
		activeListeners.delete(listener);
	};
}
