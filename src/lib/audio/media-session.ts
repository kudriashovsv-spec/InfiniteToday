// Media Session API: метаданные и OS-действия для глобального player L1.
//
// Никакой собственной audio-логики: обработчики вызывают те же действия из
// player.svelte.ts, что и кнопки UI. Модуль целиком browser-only: безопасно
// молчит при отсутствии API и никогда не выполняется во время SSR.

import { absoluteAsset } from '#lib/seo.js';
import { getWorld } from '#lib/data/worlds.js';
import { currentTrack, player, play, pause, next, prev } from './player.svelte.js';

/**
 * Действия OS Media Session, которые регистрируем и снимаем в cleanup.
 */
const ACTIONS = ['play', 'pause', 'nexttrack', 'previoustrack'] as const;

/**
 * Действия, которые ЯВНО объявляем неподдерживаемыми.
 *
 * У `seekbackward`/`seekforward` по спецификации Media Session есть встроенный
 * default handler (перемотка примерно на 15 секунд). Поэтому простое отсутствие
 * регистрации НЕ убирает кнопки «±15» на Lock Screen — система считает действие
 * поддерживаемым и рисует свою эвристику. Передача `null` — документированный
 * способ сообщить, что действие не поддерживается, и снять default handler.
 *
 * Внутренний seek (progress bar, клавиатура, TrackPlayer) это не затрагивает.
 */
const UNSUPPORTED_ACTIONS = ['seekbackward', 'seekforward'] as const;

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
 * Осознанно одна и та же для всех L1-треков: у проекта пока одна общая обложка.
 *
 * `src` — АБСОЛЮТНЫЙ HTTPS URL. Это обязательно: iOS не подтягивает artwork по
 * относительному пути и показывает вместо него серый квадрат. Поэтому здесь не
 * `asset()` (он даёт относительный путь), а `absoluteAsset()` из SEO-слоя,
 * который уже знает production origin и base path `/InfiniteToday`.
 *
 * `sizes` совпадает с реальным файлом `static/images/now-playing.jpg` (1024×1024).
 */
const NOW_PLAYING_ARTWORK: MediaImage = {
	src: absoluteAsset('images/now-playing.jpg'),
	type: 'image/jpeg',
	sizes: '1024x1024'
};

/** Артворк для OS Now Playing: пока одна общая обложка для всех треков. */
function artwork(): MediaImage[] {
	return [NOW_PLAYING_ARTWORK];
}

let lastTrackId: string | null = null;

/** Устанавливает metadata для текущего трека (общая для sync и preload). */
function applyMetadata(ms: MediaSession): void {
	const track = currentTrack();
	if (!track) return;
	const world = track.world ? getWorld(track.world) : undefined;
	ms.metadata = new MediaMetadata({
		title: track.title,
		artist: 'Infinite Today',
		album: world?.title ?? 'Music Laboratory',
		artwork: artwork()
	});
}

/**
 * Синхронизирует metadata, playbackState и позицию с текущим треком.
 *
 * Metadata пересоздаётся только при смене трека; позиция обновляется на каждом
 * вызове (в т.ч. seek). `playbackState` читает `player.playing` — это делает
 * `player.playing` зависимостью $effect в GlobalPlayer, поэтому play/pause и
 * окончание трека тоже обновляют Media Session, а не только смена трека/время.
 */
export function syncMediaSession(): void {
	const ms = session();
	const track = currentTrack();
	if (!ms || !track) return;

	if (track.id !== lastTrackId) {
		lastTrackId = track.id;
		applyMetadata(ms);
	}

	ms.playbackState = player.playing ? 'playing' : 'paused';

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
 * Предзагрузка artwork.
 *
 * iOS может показать placeholder (тот самый серый квадрат), если картинка ещё не
 * в кэше в момент установки metadata. Поэтому прогреваем её через Image и после
 * загрузки переприменяем metadata — тогда система подхватывает обложку, даже
 * если первая установка metadata произошла слишком рано.
 */
function preloadArtwork(ms: MediaSession): void {
	if (typeof Image === 'undefined') return;
	const img = new Image();
	img.onload = () => {
		// Сессия могла быть снята (cleanup) — тогда ничего не делаем.
		if (session() !== ms) return;
		if (currentTrack()) applyMetadata(ms);
	};
	img.src = NOW_PLAYING_ARTWORK.src;
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

	// Явно снимаем default seek-действия (Lock Screen «±15 секунд»).
	for (const action of UNSUPPORTED_ACTIONS) setHandler(ms, action, null);

	preloadArtwork(ms);

	return () => {
		for (const action of ACTIONS) setHandler(ms, action, null);
		lastTrackId = null;
	};
}
