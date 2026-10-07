// Media Session API: метаданные и OS-действия для глобального player L1.
//
// Никакой собственной audio-логики: обработчики вызывают те же действия из
// player.svelte.ts, что и кнопки UI. Модуль целиком browser-only: безопасно
// молчит при отсутствии API и никогда не выполняется во время SSR.

import { asset } from '$app/paths';
import { getWorld } from '#lib/data/worlds.js';
import { currentTrack, player, play, pause, next, prev } from './player.svelte.js';

/**
 * Действия OS Media Session, которые регистрируем и снимаем в cleanup.
 *
 * `seekbackward`/`seekforward` намеренно НЕ регистрируем: на iOS это уводит
 * Lock Screen в режим «±10 сек» вместо кнопок переключения треков.
 * Внутренний seek (progress bar, клавиатура) это не затрагивает.
 */
const ACTIONS = ['play', 'pause', 'nexttrack', 'previoustrack'] as const;

function session(): MediaSession | null {
	if (typeof navigator === 'undefined') return null;
	// Может отсутствовать или быть недоступным — работаем как обычный HTML5 audio.
	const ms: MediaSession | undefined = navigator.mediaSession;
	return ms ?? null;
}

/** Безопасная регистрация действия: неподдерживаемое молча игнорируем. */
function setHandler(ms: MediaSession, action: MediaSessionAction, handler: (() => void) | null): void {
	try {
		ms.setActionHandler(action, handler);
	} catch {
		/* действие может быть не поддержано браузером */
	}
}

/**
 * Единая обложка системного Now Playing (iPhone Lock Screen и др.).
 *
 * Осознанно одна и та же для всех L1-треков. Позже источник легко заменить на
 * per-track artwork, не меняя остальную архитектуру Media Session: достаточно
 * поменять наполнение `artwork()`.
 */
const NOW_PLAYING_ARTWORK: MediaImage = {
	src: asset('images/now-playing.jpg'),
	type: 'image/jpeg',
	sizes: '1024x1024'
};

/** Артворк для OS Now Playing: пока одна общая обложка для всех треков. */
function artwork(): MediaImage[] {
	return [NOW_PLAYING_ARTWORK];
}

let lastTrackId: string | null = null;

/**
 * Синхронизирует метаданные и позицию с текущим треком. Метаданные создаются
 * только при смене трека; позиция обновляется на каждом вызове (в т.ч. seek).
 */
export function syncMediaSession(): void {
	const ms = session();
	const track = currentTrack();
	if (!ms || !track) return;

	if (track.id !== lastTrackId) {
		lastTrackId = track.id;
		const world = track.world ? getWorld(track.world) : undefined;
		ms.metadata = new MediaMetadata({
			title: track.title,
			artist: 'Infinite Today',
			album: world?.title ?? 'Music Laboratory',
			artwork: artwork()
		});
	}

	try {
		const duration = player.duration;
		if (Number.isFinite(duration) && duration > 0) {
			ms.setPositionState({
				duration,
				playbackRate: 1,
				position: Math.min(Math.max(player.currentTime, 0), duration)
			});
		}
	} catch {
		/* setPositionState бросает при некорректных значениях — безопасно игнорируем */
	}
}

/**
 * Регистрирует обработчики OS-действий через существующие player-actions.
 * Неподдерживаемое действие тихо игнорируется — модуль деградирует безопасно.
 * @returns cleanup, снимающий обработчики
 */
export function initMediaSession(): () => void {
	const ms = session();
	if (!ms) return () => {};

	setHandler(ms, 'play', () => play());
	setHandler(ms, 'pause', () => pause());
	setHandler(ms, 'nexttrack', () => next());
	setHandler(ms, 'previoustrack', () => prev());

	return () => {
		for (const action of ACTIONS) setHandler(ms, action, null);
		lastTrackId = null;
	};
}
