// Media Session API: метаданные и OS-действия для глобального player L1.
//
// Никакой собственной audio-логики: обработчики вызывают те же действия из
// player.svelte.ts, что и кнопки UI. Модуль целиком browser-only: безопасно
// молчит при отсутствии API и никогда не выполняется во время SSR.

import { asset } from '$app/paths';
import type { AssetPath } from '$app/types';
import { getWorld } from '#lib/data/worlds.js';
import { currentTrack, player, play, pause, next, prev, seekTo } from './player.svelte.js';

/** Шаг перемотки для OS-действий seekbackward / seekforward, секунды. */
const SEEK_STEP = 10;

/** Действия, которые регистрируем в initMediaSession и снимаем в cleanup. */
const ACTIONS = ['play', 'pause', 'nexttrack', 'previoustrack', 'seekbackward', 'seekforward'] as const;

function session(): MediaSession | null {
	if (typeof navigator === 'undefined') return null;
	// Может отсутствовать или быть недоступным — работаем как обычный HTML5 audio.
	const ms: MediaSession | undefined = navigator.mediaSession;
	return ms ?? null;
}

/** Артворк из существующих ресурсов: картинка мира или главный экран. */
function artwork(): MediaImage[] {
	const track = currentTrack();
	const world = track?.world ? getWorld(track.world) : undefined;
	const path = world?.artwork ?? 'images/MainPageLvl1.webp';
	// Путь из данных — runtime string; сужаем на границе к типу известных ассетов.
	return [{ src: asset(path as AssetPath), type: 'image/webp' }];
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
 * @returns cleanup, снимающий обработчики
 */
export function initMediaSession(): () => void {
	const ms = session();
	if (!ms) return () => {};

	ms.setActionHandler('play', () => play());
	ms.setActionHandler('pause', () => pause());
	ms.setActionHandler('nexttrack', () => next());
	ms.setActionHandler('previoustrack', () => prev());
	ms.setActionHandler('seekbackward', () => seekTo(player.currentTime - SEEK_STEP));
	ms.setActionHandler('seekforward', () => seekTo(player.currentTime + SEEK_STEP));

	return () => {
		for (const action of ACTIONS) {
			try {
				ms.setActionHandler(action, null);
			} catch {
				/* ignore */
			}
		}
		lastTrackId = null;
	};
}
