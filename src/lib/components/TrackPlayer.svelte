<script lang="ts">
	import { asset } from '$app/paths';
	import type { AssetPath } from '$app/types';
	import type { Track } from '#lib/data/music.js';
	import { registerAudio, pauseOthers, setActiveAudio } from '#lib/audio/playback.js';
	import { releaseSource } from '#lib/audio/graph.js';
	import { trackPlay } from '#lib/analytics.js';

	/**
	 * Переиспользуемый проигрыватель одной музыкальной версии.
	 * Реальный HTML audio + play/pause, progress (клик, drag, клавиатура)
	 * и duration. Осознанно не тащит объём, mute/popover и плейлисты старого
	 * player — Phase 1 проверяет только музыкальный слой архитектуры.
	 */
	interface TrackPlayerProps {
		track: Track;
	}

	let { track }: TrackPlayerProps = $props();

	let audioEl: HTMLAudioElement | null = $state(null);
	let playing: boolean = $state(false);
	let loading: boolean = $state(false);
	let currentTime: number = $state(0);
	let duration: number = $state(0);
	let failed: boolean = $state(false);
	// Аналитика: один track-play на реальный старт (onplaying), не на клик.
	let playCounted = false;

	// asset() добавляет base (/InfiniteToday) и корректный относительный
	// префикс на вложенных route — жёстких путей к аудио нет.
	// `src` приходит из реестра как runtime string — сужаем к списку реальных ассетов.
	const src = $derived(asset(track.src as AssetPath));
	const progress = $derived(duration > 0 ? currentTime / duration : 0);
	const seekText = $derived(
		duration > 0 ? `${formatTime(currentTime)} из ${formatTime(duration)}` : formatTime(currentTime)
	);

	function syncFromElement(): void {
		if (!audioEl) return;
		currentTime = audioEl.currentTime || 0;
		if (Number.isFinite(audioEl.duration)) duration = audioEl.duration;
	}

	// Метаданные могут загрузиться ДО гидратации (серверный HTML сразу содержит
	// <audio src>). Тогда loadedmetadata уже отгремел и duration остался бы 0:00.
	// Поэтому после привязки элемента подтягиваем уже загруженное состояние,
	// а на время жизни компонента регистрируем audio в общем реестре
	// (запуск одной версии останавливает другие).
	$effect(() => {
		const element = audioEl;
		if (!element) return;
		syncFromElement();
		const unregister = registerAudio(element);
		return () => {
			unregister();
			releaseSource(element);
		};
	});

	function formatTime(seconds: number): string {
		if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
		const total = Math.floor(seconds);
		return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
	}

	function play(): void {
		if (!audioEl) return;
		if (failed) {
			retry();
			return;
		}
		// Спецификация возвращает Promise, но защищаемся от реализаций без него.
		const request: Promise<void> | undefined = audioEl.play();
		if (request && typeof request.catch === 'function') request.catch(() => {});
	}

	function toggle(): void {
		if (!audioEl) return;
		if (audioEl.paused) play();
		else audioEl.pause();
	}

	/** Ответ на ошибку загрузки: перезагружаем элемент и пробуем снова. */
	function retry(): void {
		if (!audioEl) return;
		failed = false;
		loading = true;
		audioEl.load();
		play();
	}

	function seekToTime(time: number): void {
		if (!audioEl) return;
		const total = audioEl.duration;
		if (!Number.isFinite(total) || total <= 0) return;
		audioEl.currentTime = Math.min(Math.max(time, 0), total);
	}

	/** События бара: Svelte отдаёт currentTarget самим элементом бара. */
	type BarPointerEvent = PointerEvent & { currentTarget: HTMLDivElement };
	type BarMouseEvent = MouseEvent & { currentTarget: HTMLDivElement };

	function ratioFromEvent(event: BarPointerEvent | BarMouseEvent): number {
		const rect = event.currentTarget.getBoundingClientRect();
		return Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
	}

	let scrubbing = false;

	function onBarPointerDown(event: BarPointerEvent): void {
		if (duration <= 0) return;
		scrubbing = true;
		try {
			event.currentTarget.setPointerCapture?.(event.pointerId);
		} catch {
			/* ignore */
		}
		seekToTime(ratioFromEvent(event) * duration);
		event.preventDefault();
	}

	function onBarPointerMove(event: BarPointerEvent): void {
		if (!scrubbing) return;
		seekToTime(ratioFromEvent(event) * duration);
	}

	function endScrub(event: BarPointerEvent): void {
		if (!scrubbing) return;
		scrubbing = false;
		try {
			event.currentTarget.releasePointerCapture?.(event.pointerId);
		} catch {
			/* ignore */
		}
	}

	function onBarClick(event: BarMouseEvent): void {
		if (event.detail === 0) return;
		seekToTime(ratioFromEvent(event) * duration);
	}

	function onBarKeydown(event: KeyboardEvent): void {
		if (event.key === 'ArrowRight') {
			seekToTime(currentTime + 5);
		} else if (event.key === 'ArrowLeft') {
			seekToTime(currentTime - 5);
		} else {
			return;
		}
		event.preventDefault();
	}
</script>

<div class="player" class:is-playing={playing} class:is-loading={loading && !playing} class:is-failed={failed}>
	<button
		class="player__toggle"
		type="button"
		aria-label={failed
			? 'Повторить загрузку'
			: loading && !playing
				? 'Загрузка'
				: playing
					? 'Пауза'
					: 'Воспроизвести'}
		aria-pressed={playing}
		onclick={toggle}
	>
		<span class="player__spinner" aria-hidden="true"></span>
	</button>

	<div
		class="player__bar"
		class:is-disabled={duration <= 0}
		role="slider"
		tabindex="0"
		aria-label="Позиция трека"
		aria-orientation="horizontal"
		aria-valuemin="0"
		aria-valuemax="100"
		aria-valuenow={Math.round(progress * 100)}
		aria-valuetext={seekText}
		aria-disabled={duration <= 0}
		onpointerdown={onBarPointerDown}
		onpointermove={onBarPointerMove}
		onpointerup={endScrub}
		onpointercancel={endScrub}
		onclick={onBarClick}
		onkeydown={onBarKeydown}
	>
		<span class="player__fill" style="width:{progress * 100}%"></span>
	</div>

	<span class="player__time">{formatTime(currentTime)} / {formatTime(duration)}</span>
</div>

{#if failed}
	<p class="player__error" role="alert">
		<span>Не удалось загрузить аудио.</span>
		<button class="player__retry" type="button" onclick={retry}>Повторить</button>
	</p>
{/if}

<audio
	bind:this={audioEl}
	{src}
	preload="metadata"
	onplay={() => {
		playing = true;
		loading = false;
		if (audioEl) {
			pauseOthers(audioEl);
			setActiveAudio(audioEl);
		}
	}}
	onplaying={() => {
		if (!playCounted) {
			playCounted = true;
			trackPlay({ id: track.id, world: track.world });
		}
	}}
	onpause={() => {
		playing = false;
		playCounted = false;
	}}
	onended={() => {
		playing = false;
		loading = false;
		playCounted = false;
	}}
	ontimeupdate={syncFromElement}
	onloadedmetadata={syncFromElement}
	oncanplay={() => {
		loading = false;
		syncFromElement();
	}}
	ondurationchange={syncFromElement}
	onloadstart={() => {
		failed = false;
		loading = true;
	}}
	onwaiting={() => (loading = true)}
	onerror={() => {
		failed = true;
		loading = false;
		playCounted = false;
	}}
></audio>

<style>
	.player {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.38rem 0.8rem 0.38rem 0.38rem;
		border-radius: 999px;
		border: 1px solid rgba(190, 200, 255, 0.16);
		background: rgba(9, 10, 26, 0.38);
		box-shadow: 0 6px 26px rgba(3, 4, 14, 0.35);
		backdrop-filter: blur(9px) saturate(1.1);
		-webkit-backdrop-filter: blur(9px) saturate(1.1);
	}

	.player__toggle {
		position: relative;
		flex: none;
		display: grid;
		place-items: center;
		width: 1.9rem;
		height: 1.9rem;
		border: 0;
		border-radius: 50%;
		background: rgba(180, 165, 255, 0.18);
		cursor: pointer;
		transition:
			background var(--dur-ui) var(--ease-ui),
			transform var(--dur-fast) var(--ease-out);
		-webkit-tap-highlight-color: transparent;
	}

	.player__toggle:active {
		transform: scale(0.94);
	}

	.player__toggle:focus-visible {
		background: rgba(180, 165, 255, 0.32);
		outline: 1px solid rgba(216, 198, 255, 0.7);
		outline-offset: 3px;
	}

	@media (hover: hover) and (pointer: fine) {
		.player__toggle:hover {
			background: rgba(180, 165, 255, 0.32);
		}
	}

	/* Иконки play/pause: crossfade/scale вместо резкого display:none. */
	.player__toggle::before,
	.player__toggle::after {
		content: '';
		position: absolute;
		inset: 0;
		margin: auto;
		transition:
			opacity var(--dur-fast) var(--ease-ui),
			transform var(--dur-fast) var(--ease-out);
	}

	/* Иконка «play» */
	.player__toggle::before {
		width: 0;
		height: 0;
		border-style: solid;
		border-width: 0.4rem 0 0.4rem 0.66rem;
		border-color: transparent transparent transparent #f4f0ff;
		translate: 1px 0;
		opacity: 1;
		transform: scale(1);
	}

	.player.is-playing .player__toggle::before {
		opacity: 0;
		transform: scale(0.7);
	}

	/* Иконка «pause» */
	.player__toggle::after {
		width: 0.62rem;
		height: 0.78rem;
		background:
			linear-gradient(#f4f0ff, #f4f0ff) left / 0.22rem 100% no-repeat,
			linear-gradient(#f4f0ff, #f4f0ff) right / 0.22rem 100% no-repeat;
		opacity: 0;
		transform: scale(0.7);
	}

	.player.is-playing .player__toggle::after {
		opacity: 1;
		transform: scale(1);
	}

	.player__bar {
		position: relative;
		flex: 1;
		height: 2px;
		border-radius: 2px;
		background: rgba(220, 225, 255, 0.22);
		cursor: pointer;
	}

	.player__bar::before {
		content: '';
		position: absolute;
		inset: -10px 0;
	}

	.player__bar:focus {
		outline: none;
	}

	.player__bar:focus-visible {
		outline: 1px solid rgba(216, 198, 255, 0.6);
		outline-offset: 5px;
		border-radius: 3px;
	}

	@media (prefers-reduced-motion: reduce) {
		.player__toggle:active,
		.player__retry:active {
			transform: none;
		}

		.player__toggle::before,
		.player__toggle::after {
			transition: opacity var(--dur-fast) linear;
		}

		.player__spinner {
			animation: none;
		}
	}

	.player__fill {
		position: absolute;
		inset: 0 auto 0 0;
		width: 0;
		border-radius: 2px;
		background: linear-gradient(90deg, var(--accent-a), var(--accent-b));
	}

	.player__fill::after {
		content: '';
		position: absolute;
		top: 50%;
		right: -4px;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #f4f0ff;
		box-shadow: 0 0 8px rgba(150, 200, 255, 0.55);
		opacity: 0.85;
		transform: translate(0, -50%) scale(0.85);
		transition:
			transform var(--dur-fast) var(--ease-out),
			opacity var(--dur-fast) var(--ease-ui);
	}

	.player__bar:hover .player__fill::after,
	.player__bar:focus-visible .player__fill::after,
	.player__bar:active .player__fill::after {
		opacity: 1;
		transform: translate(0, -50%) scale(1);
	}

	.player__bar.is-disabled {
		cursor: default;
	}

	.player__bar.is-disabled .player__fill::after {
		opacity: 0;
	}

	.player__spinner {
		position: absolute;
		inset: 0;
		margin: auto;
		width: 0.95rem;
		height: 0.95rem;
		border: 2px solid rgba(244, 240, 255, 0.22);
		border-top-color: #f4f0ff;
		border-radius: 50%;
		opacity: 0;
		animation: player-spin 700ms linear infinite;
		transition: opacity var(--dur-fast) var(--ease-ui);
	}

	.player.is-loading .player__spinner {
		opacity: 1;
	}

	.player.is-loading .player__toggle::before,
	.player.is-loading .player__toggle::after {
		opacity: 0;
	}

	@keyframes player-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.player__time {
		flex: none;
		font-size: 0.66rem;
		letter-spacing: 0.03em;
		color: rgba(238, 232, 255, 0.72);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.player__error {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0.35rem 0 0;
		font-size: 0.72rem;
		color: #ffb1a1;
	}

	.player__retry {
		flex: none;
		padding: 0.15rem 0.6rem;
		border: 1px solid rgba(255, 177, 161, 0.5);
		border-radius: 999px;
		background: rgba(255, 177, 161, 0.12);
		color: #ffd9d1;
		font: inherit;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition:
			background var(--dur-ui) var(--ease-ui),
			border-color var(--dur-ui) var(--ease-ui),
			transform var(--dur-fast) var(--ease-out);
	}

	.player__retry:active {
		transform: scale(0.95);
	}

	.player__retry:focus-visible {
		outline: 1px solid rgba(255, 200, 190, 0.8);
		outline-offset: 2px;
	}

	@media (hover: hover) and (pointer: fine) {
		.player__retry:hover {
			background: rgba(255, 177, 161, 0.22);
			border-color: rgba(255, 177, 161, 0.75);
		}
	}

	audio {
		display: none;
	}
</style>
