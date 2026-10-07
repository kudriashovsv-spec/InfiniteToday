// Координация воспроизведения нескольких <audio> на одной странице.
//
// Отвечает ровно за две вещи:
//   1. одновременно звучит только одна версия песни (как в v1.1);
//   2. известно, какой <audio> сейчас активен — на него подписывается
//      аудиовизуализатор (Butterchurn), не зная о TrackPlayer напрямую.
//
// Веб-аудио граф (AudioContext, MediaElementSource) живёт отдельно, в
// src/lib/audio/graph.js — чтобы этот модуль не превращался в монолит.

/** Подписчик на смену активного источника (для визуализатора). */
export type ActiveAudioListener = (audio: HTMLAudioElement | null) => void;

const registered = new Set<HTMLAudioElement>();

let activeAudio: HTMLAudioElement | null = null;

const activeListeners = new Set<ActiveAudioListener>();

/**
 * Регистрирует audio на время жизни компонента.
 * @returns функция очистки
 */
export function registerAudio(audio: HTMLAudioElement): () => void {
	registered.add(audio);
	return () => {
		registered.delete(audio);
		if (activeAudio === audio) setActiveAudio(null);
	};
}

/**
 * Ставит на паузу все зарегистрированные аудио, кроме переданного.
 */
export function pauseOthers(except: HTMLAudioElement): void {
	for (const audio of registered) {
		if (audio !== except && !audio.paused) audio.pause();
	}
}

/**
 * Помечает audio как активный источник для визуализатора.
 */
export function setActiveAudio(audio: HTMLAudioElement | null): void {
	if (activeAudio === audio) return;
	activeAudio = audio;
	for (const listener of activeListeners) listener(activeAudio);
}

export function getActiveAudio(): HTMLAudioElement | null {
	return activeAudio;
}

export function subscribeActiveAudio(listener: ActiveAudioListener): () => void {
	activeListeners.add(listener);
	return () => {
		activeListeners.delete(listener);
	};
}
