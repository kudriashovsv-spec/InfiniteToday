<script lang="ts">
	import { onMount } from 'svelte';
	import { tracks } from '#lib/data/music.js';
	import {
		player,
		formatTime,
		currentTrack,
		selectTrack,
		next,
		prev,
		toggle,
		seekTo,
		setVolume,
		toggleMute
	} from '#lib/audio/player.svelte.js';

	/**
	 * Видимый UI библиотеки L1 (порт v1.1): текущий трек, play/pause, skip,
	 * progress, время, громкость/mute и список 40 версий.
	 *
	 * Это отдельный компонент от GlobalPlayer.svelte: audio-элемент постоянный
	 * и живёт в layout, а этот UI существует только на L1. Оба используют одно
	 * глобальное состояние и один audio-слой.
	 */

	let playerEl: HTMLElement | null = $state(null);
	let volumeOpen: boolean = $state(false);
	let scrubbing = false;

	const track = $derived(currentTrack());

	onMount(() => {
		const onDocClick = (event: MouseEvent): void => {
			if (!volumeOpen) return;
			if (playerEl && event.target instanceof Node && playerEl.contains(event.target)) return;
			volumeOpen = false;
		};
		document.addEventListener('click', onDocClick);
		return () => document.removeEventListener('click', onDocClick);
	});

	/** События бара: Svelte отдаёт currentTarget самим элементом бара. */
	type BarPointerEvent = PointerEvent & { currentTarget: HTMLDivElement };
	type BarMouseEvent = MouseEvent & { currentTarget: HTMLDivElement };

	function ratioFromEvent(event: BarPointerEvent | BarMouseEvent): number {
		const rect = event.currentTarget.getBoundingClientRect();
		return Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
	}

	function onBarPointerDown(event: BarPointerEvent): void {
		scrubbing = true;
		try {
			event.currentTarget.setPointerCapture?.(event.pointerId);
		} catch {
			/* ignore */
		}
		seekTo(ratioFromEvent(event) * player.duration);
		event.preventDefault();
	}

	function onBarPointerMove(event: BarPointerEvent): void {
		if (!scrubbing) return;
		seekTo(ratioFromEvent(event) * player.duration);
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
		seekTo(ratioFromEvent(event) * player.duration);
	}

	function onBarKeydown(event: KeyboardEvent): void {
		if (event.key === 'ArrowRight') {
			seekTo(player.currentTime + 5);
		} else if (event.key === 'ArrowLeft') {
			seekTo(player.currentTime - 5);
		} else {
			return;
		}
		event.preventDefault();
	}

	const progress = $derived(player.duration > 0 ? player.currentTime / player.duration : 0);
</script>

<div class="library">
	<p class="library__current">
		<span class="library__current-title">{track?.title ?? ''}</span>
		<span class="library__current-genre">{track?.genre ?? ''}</span>
	</p>

	<div
		class="player"
		class:is-playing={player.playing}
		class:is-muted={player.muted}
		class:is-volume-open={volumeOpen}
		bind:this={playerEl}
	>
		<button class="player__skip player__prev" type="button" aria-label="Предыдущий трек" onclick={() => prev()}>
			<svg class="player__skip-icon" viewBox="0 0 16 16" aria-hidden="true">
				<path d="M9.5 3.5 5.5 8l4 4.5"></path>
			</svg>
		</button>

		<button
			class="player__toggle"
			type="button"
			aria-label={player.playing ? 'Пауза' : 'Воспроизвести'}
			aria-pressed={player.playing}
			onclick={() => toggle()}
		></button>

		<button class="player__skip player__next" type="button" aria-label="Следующий трек" onclick={() => next()}>
			<svg class="player__skip-icon" viewBox="0 0 16 16" aria-hidden="true">
				<path d="M6.5 3.5 10.5 8l-4 4.5"></path>
			</svg>
		</button>

		<div
			class="player__bar"
			role="slider"
			tabindex="0"
			aria-label="Позиция трека"
			aria-valuemin="0"
			aria-valuemax="100"
			aria-valuenow={Math.round(progress * 100)}
			onpointerdown={onBarPointerDown}
			onpointermove={onBarPointerMove}
			onpointerup={endScrub}
			onpointercancel={endScrub}
			onclick={onBarClick}
			onkeydown={onBarKeydown}
		>
			<span class="player__fill" style="width:{progress * 100}%"></span>
		</div>

		<span class="player__time">{formatTime(player.currentTime)} / {formatTime(player.duration)}</span>

		<div class="player__volume">
			<button
				class="player__volume-button"
				type="button"
				aria-label="Громкость"
				aria-haspopup="true"
				aria-expanded={volumeOpen}
				onclick={() => (volumeOpen = !volumeOpen)}
			>
				<svg class="player__volume-icon" viewBox="0 0 16 16" aria-hidden="true">
					<path class="player__speaker" d="M2 6h2.4L7.6 3.1v9.8L4.4 10H2z"></path>
					<path class="player__wave" d="M9.8 6.1a2.7 2.7 0 0 1 0 3.8"></path>
					<path class="player__wave" d="M11.6 4.3a5.2 5.2 0 0 1 0 7.4"></path>
				</svg>
			</button>
			<div class="player__volume-popover" aria-hidden={!volumeOpen}>
				<button
					class="player__mute"
					type="button"
					aria-label={player.muted ? 'Включить звук' : 'Выключить звук'}
					aria-pressed={player.muted}
					onclick={() => toggleMute()}
				>
					<svg class="player__volume-icon" viewBox="0 0 16 16" aria-hidden="true">
						<path class="player__speaker" d="M2 6h2.4L7.6 3.1v9.8L4.4 10H2z"></path>
						<path class="player__wave" d="M9.8 6.1a2.7 2.7 0 0 1 0 3.8"></path>
						<path class="player__wave" d="M11.6 4.3a5.2 5.2 0 0 1 0 7.4"></path>
					</svg>
				</button>
				<input
					class="player__volume-range"
					type="range"
					min="0"
					max="1"
					step="0.01"
					value={player.volume}
					aria-label="Громкость"
					oninput={(event) => setVolume(Number(event.currentTarget.value))}
				/>
			</div>
		</div>
	</div>

	<div class="library__list">
		{#each tracks as item (item.id)}
			<button
				class="lib-track"
				class:is-current={item.id === player.trackId}
				type="button"
				onclick={() => selectTrack(item.id, true)}
			>
				<span class="lib-track__num">{item.num}</span>
				<span class="lib-track__name">{item.title}</span>
				<span class="lib-track__genre">{item.genre}</span>
			</button>
		{/each}
	</div>
</div>

<style>
	/* ==================== ОБЩАЯ БИБЛИОТЕКА ТРЕКОВ (Lvl1, порт v1.1) ==================== */
	.library {
		position: absolute;
		z-index: 2;
		top: clamp(0.8rem, 2.2vh, 1.5rem);
		left: clamp(0.9rem, 2.4vw, 1.8rem);
		width: min(31vw, 520px);
		pointer-events: none;
	}

	.library__current {
		margin: 0 0 0.28rem 0.15rem;
		font-family: 'Nunito Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
		font-size: clamp(0.8rem, 1.35vw, 1rem);
		font-weight: 300;
		letter-spacing: 0.03em;
		color: rgba(248, 245, 255, 0.94);
		text-shadow:
			0 1px 2px rgba(2, 4, 12, 0.95),
			0 0 12px rgba(2, 4, 12, 0.8);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.library__current-genre {
		color: rgba(200, 190, 240, 0.72);
	}

	.library__current-genre::before {
		content: ' · ';
	}

	.library :global(.player) {
		pointer-events: auto;
	}

	.library__list {
		margin-top: 0.5rem;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		grid-template-rows: repeat(20, minmax(0, auto));
		grid-auto-flow: column;
		column-gap: 0.9rem;
		row-gap: 0;
		pointer-events: none;
	}

	.lib-track {
		display: flex;
		align-items: baseline;
		gap: 0.34rem;
		width: 100%;
		padding: 0.11rem 0.28rem;
		border: 0;
		border-radius: 5px;
		background: transparent;
		color: rgba(240, 237, 252, 0.92);
		font-family: 'Nunito Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
		font-size: clamp(0.58rem, 0.72vw, 0.7rem);
		font-weight: 300;
		line-height: 1.25;
		text-align: left;
		cursor: pointer;
		pointer-events: auto;
		text-shadow:
			0 1px 2px rgba(2, 4, 12, 1),
			0 0 5px rgba(2, 4, 12, 0.95),
			0 0 11px rgba(2, 4, 12, 0.85);
		-webkit-tap-highlight-color: transparent;
		transition:
			color var(--dur-ui) var(--ease-ui),
			background var(--dur-ui) var(--ease-ui),
			transform var(--dur-fast) var(--ease-out);
	}

	.lib-track:active {
		transform: scale(0.99);
	}

	.lib-track:focus-visible {
		color: #ffffff;
		background: rgba(180, 165, 255, 0.1);
	}

	@media (hover: hover) and (pointer: fine) {
		.lib-track:hover {
			color: #ffffff;
			background: rgba(180, 165, 255, 0.1);
		}
	}

	.lib-track:focus {
		outline: none;
	}

	.lib-track:focus-visible {
		outline: 1px solid rgba(216, 198, 255, 0.55);
		outline-offset: 1px;
	}

	.lib-track__num {
		flex: none;
		min-width: 1.4em;
		color: rgba(192, 200, 238, 0.72);
		font-variant-numeric: tabular-nums;
		text-align: right;
	}

	.lib-track__name {
		flex: 1 1 auto;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.lib-track__genre {
		flex: none;
		color: rgba(200, 208, 245, 0.72);
		white-space: nowrap;
	}

	.lib-track.is-current {
		color: #ffffff;
		background: rgba(180, 165, 255, 0.13);
	}

	.lib-track.is-current .lib-track__num {
		color: var(--accent-b);
	}

	.lib-track.is-current .lib-track__genre {
		color: rgba(255, 200, 175, 0.85);
	}

	/* ==================== PLAYER (общий вид с TrackPlayer) ==================== */
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

	.player__skip {
		flex: none;
		display: grid;
		place-items: center;
		width: 1.5rem;
		height: 1.5rem;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: transparent;
		color: rgba(244, 240, 255, 0.8);
		cursor: pointer;
		transition:
			background var(--dur-ui) var(--ease-ui),
			color var(--dur-ui) var(--ease-ui),
			transform var(--dur-fast) var(--ease-out);
		-webkit-tap-highlight-color: transparent;
	}

	.player__skip:active {
		transform: scale(0.92);
	}

	.player__skip:focus-visible {
		background: rgba(180, 165, 255, 0.28);
		color: #f4f0ff;
		outline: 1px solid rgba(216, 198, 255, 0.7);
		outline-offset: 2px;
	}

	@media (hover: hover) and (pointer: fine) {
		.player__skip:hover {
			background: rgba(180, 165, 255, 0.28);
			color: #f4f0ff;
		}
	}

	.player__skip-icon {
		width: 0.95rem;
		height: 0.95rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.6;
		stroke-linecap: round;
		stroke-linejoin: round;
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
		inset: -9px 0;
	}

	.player__bar:focus {
		outline: none;
	}

	.player__bar:focus-visible {
		outline: 1px solid rgba(216, 198, 255, 0.6);
		outline-offset: 5px;
		border-radius: 3px;
	}

	.player__fill {
		position: absolute;
		inset: 0 auto 0 0;
		width: 0;
		border-radius: 2px;
		background: linear-gradient(90deg, var(--accent-a), var(--accent-b));
	}

	.player__time {
		flex: none;
		font-size: 0.66rem;
		letter-spacing: 0.03em;
		color: rgba(238, 232, 255, 0.72);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.player__volume {
		position: relative;
		flex: none;
		display: grid;
		place-items: center;
	}

	.player__volume-button,
	.player__mute {
		display: grid;
		place-items: center;
		padding: 0;
		border: 0;
		background: transparent;
		color: rgba(244, 240, 255, 0.85);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition:
			color var(--dur-ui) var(--ease-ui),
			transform var(--dur-fast) var(--ease-out);
	}

	.player__volume-button:active,
	.player__mute:active {
		transform: scale(0.88);
	}

	.player__volume-button {
		width: 1.05rem;
		height: 1.05rem;
	}

	.player__mute {
		flex: none;
		width: 0.95rem;
		height: 0.95rem;
	}

	.player__volume-button:focus-visible,
	.player__mute:focus-visible {
		color: #ffffff;
		outline: 1px solid rgba(216, 198, 255, 0.6);
		outline-offset: 3px;
		border-radius: 3px;
	}

	@media (hover: hover) and (pointer: fine) {
		.player__volume-button:hover,
		.player__mute:hover {
			color: #ffffff;
		}
	}

	.player__volume-popover {
		position: absolute;
		left: calc(100% + 0.55rem);
		top: 50%;
		z-index: 6;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.7rem;
		border: 1px solid rgba(190, 200, 255, 0.16);
		border-radius: 999px;
		background: rgba(9, 10, 26, 0.64);
		box-shadow: 0 8px 26px rgba(3, 4, 14, 0.5);
		backdrop-filter: blur(10px) saturate(1.1);
		-webkit-backdrop-filter: blur(10px) saturate(1.1);
		opacity: 0;
		visibility: hidden;
		pointer-events: none;
		transform: translate(4px, -50%);
		transition:
			opacity var(--dur-ui) var(--ease-ui),
			transform var(--dur-ui) var(--ease-out),
			visibility 0s linear var(--dur-ui);
	}

	.player.is-volume-open .player__volume-popover {
		opacity: 1;
		visibility: visible;
		pointer-events: auto;
		transform: translate(0, -50%);
		transition-delay: 0s;
	}

	.player__volume-icon {
		width: 100%;
		height: 100%;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.3;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.player__speaker {
		fill: currentColor;
		stroke: none;
	}

	.player__wave {
		transition: opacity var(--dur-ui) var(--ease-ui);
	}

	.player.is-muted .player__wave {
		opacity: 0.12;
	}

	.player__volume-range {
		flex: none;
		width: 54px;
		height: 14px;
		margin: 0;
		padding: 0;
		background: transparent;
		-webkit-appearance: none;
		appearance: none;
		cursor: pointer;
	}

	.player__volume-range:focus {
		outline: none;
	}

	.player__volume-range:focus-visible {
		outline: 1px solid rgba(216, 198, 255, 0.6);
		outline-offset: 3px;
		border-radius: 3px;
	}

	.player__volume-range::-webkit-slider-runnable-track {
		height: 2px;
		border-radius: 2px;
		background: rgba(220, 225, 255, 0.22);
	}

	.player__volume-range::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 9px;
		height: 9px;
		margin-top: -3.5px;
		border: 0;
		border-radius: 50%;
		background: #f4f0ff;
		box-shadow: 0 0 6px rgba(150, 200, 255, 0.55);
	}

	.player__volume-range::-moz-range-track {
		height: 2px;
		border-radius: 2px;
		background: rgba(220, 225, 255, 0.22);
	}

	.player__volume-range::-moz-range-thumb {
		width: 9px;
		height: 9px;
		border: 0;
		border-radius: 50%;
		background: #f4f0ff;
		box-shadow: 0 0 6px rgba(150, 200, 255, 0.55);
	}

	/* ==================== МОБИЛЬНАЯ КОМПОЗИЦИЯ (portrait phone) ==================== */
	@media (max-width: 640px) {
		.library {
			top: auto;
			bottom: 0;
			left: 0;
			right: 0;
			width: 100%;
			max-height: min(44dvh, 360px);
			display: flex;
			flex-direction: column;
			padding: 0.7rem 0.8rem calc(0.7rem + env(safe-area-inset-bottom, 0px));
			background: linear-gradient(
				to top,
				rgba(5, 3, 12, 0.94) 0%,
				rgba(5, 3, 12, 0.78) 62%,
				rgba(5, 3, 12, 0) 100%
			);
		}

		.library__current {
			font-size: 0.9rem;
		}

		.library__list {
			flex: 1 1 auto;
			min-height: 0;
			margin-top: 0.5rem;
			display: flex;
			flex-direction: column;
			overflow-y: auto;
			overscroll-behavior: contain;
			pointer-events: auto;
			-webkit-overflow-scrolling: touch;
			scrollbar-width: thin;
			scrollbar-color: rgba(180, 165, 255, 0.4) transparent;
			padding-right: 0.25rem;
		}

		.lib-track {
			flex: none;
			font-size: 0.85rem;
			padding: 0.34rem 0.4rem;
			gap: 0.5rem;
			overflow: hidden;
		}

		.player__volume-popover {
			left: auto;
			right: calc(100% + 0.55rem);
			transform: translate(-4px, -50%);
		}

		.player.is-volume-open .player__volume-popover {
			transform: translate(0, -50%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.lib-track:active,
		.player__skip:active,
		.player__toggle:active,
		.player__volume-button:active,
		.player__mute:active {
			transform: none;
		}

		.player__toggle::before,
		.player__toggle::after {
			transition: opacity var(--dur-fast) linear;
		}
	}
</style>
