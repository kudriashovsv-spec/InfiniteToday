<script lang="ts">
	import { getDna } from '#lib/data/dna.js';

	/**
	 * Desktop-кнопка `DNA` рядом с конкретным TrackPlayer.
	 *
	 * Больше не раскрывает маленькую панель: выбирает версию, чью DNA показывает
	 * главный правый слот (`selectedDnaId`). Playback при этом не меняется.
	 */
	interface TrackDnaProps {
		trackId: string;
		trackTitle: string;
		selected: boolean;
		onselect: () => void;
	}

	let { trackId, trackTitle, selected, onselect }: TrackDnaProps = $props();

	// ДНК берётся из data layer по id версии; UI не хардкодит песни.
	const dna = $derived(getDna(trackId));
</script>

{#if dna}
	<div class="track-dna">
		<button
			class="track-dna__btn"
			class:is-selected={selected}
			type="button"
			aria-pressed={selected}
			aria-label={`ДНК песни «${trackTitle}»`}
			onclick={onselect}
		>
			DNA
		</button>
	</div>
{/if}

<style>
	.track-dna {
		position: relative;
		flex: none;
	}

	/* Desktop-only: на mobile DNA появляется сама при запуске версии. */
	@media (max-width: 640px) {
		.track-dna {
			display: none;
		}
	}

	.track-dna__btn {
		flex: none;
		padding: 0.32rem 0.62rem;
		border: 1px solid rgba(190, 200, 255, 0.16);
		border-radius: 999px;
		background: rgba(9, 10, 26, 0.4);
		color: rgba(238, 232, 255, 0.8);
		font-family: 'Nunito Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
		font-size: 0.62rem;
		font-weight: 300;
		letter-spacing: 0.14em;
		cursor: pointer;
		backdrop-filter: blur(9px) saturate(1.1);
		-webkit-backdrop-filter: blur(9px) saturate(1.1);
		transition:
			color var(--dur-ui) var(--ease-ui),
			background var(--dur-ui) var(--ease-ui),
			border-color var(--dur-ui) var(--ease-ui),
			transform var(--dur-fast) var(--ease-out);
		-webkit-tap-highlight-color: transparent;
	}

	.track-dna__btn:active {
		transform: scale(0.96);
	}

	.track-dna__btn:focus {
		outline: none;
	}

	.track-dna__btn:focus-visible {
		outline: 1px solid rgba(216, 198, 255, 0.6);
		outline-offset: 3px;
	}

	/* Выбранная версия: её DNA сейчас в главном слоте. */
	.track-dna__btn.is-selected {
		color: #f4f0ff;
		background: rgba(180, 165, 255, 0.22);
		border-color: rgba(200, 184, 255, 0.42);
	}

	@media (hover: hover) and (pointer: fine) {
		.track-dna__btn:hover {
			color: #f4f0ff;
			background: rgba(9, 10, 26, 0.58);
			border-color: rgba(190, 200, 255, 0.3);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.track-dna__btn {
			transition: none;
		}

		.track-dna__btn:active {
			transform: none;
		}
	}
</style>
