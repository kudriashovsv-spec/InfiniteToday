<script>
	import { onMount } from 'svelte';
	import { presets } from '#lib/data/butterchurn.js';
	import * as engine from '#lib/audio/butterchurn.js';

	/**
	 * UI-слой визуализатора: host для canvas, resize, lifecycle компонента,
	 * пресетные контролы и нейтральный fallback. Вся интеграция с Butterchurn —
	 * в src/lib/audio/butterchurn.js, вся работа со звуком — в audio/graph.js
	 * и audio/playback.js. Компонент ничего не знает ни о мирах, ни о треках.
	 */

	/** @type {HTMLElement | null} */
	let host = $state(null);
	/** @type {'loading' | 'ready' | 'unsupported' | 'error'} */
	let status = $state('loading');
	let presetIndex = $state(-1);

	onMount(() => {
		const cleanup = engine.mount(host, {
			onStatus: (value) => (status = value),
			onPreset: (value) => (presetIndex = value)
		});

		/** @type {ResizeObserver | undefined} */
		let observer;
		if (host && typeof ResizeObserver !== 'undefined') {
			observer = new ResizeObserver(() => engine.resize(host.clientWidth, host.clientHeight));
			observer.observe(host);
		}

		return () => {
			if (observer) observer.disconnect();
			cleanup();
		};
	});
</script>

<div class="visualizer" bind:this={host}></div>

{#if status === 'unsupported' || status === 'error'}
	<div class="visualizer__fallback" role="status">
		<p>Визуализация недоступна на этом устройстве</p>
	</div>
{/if}

{#if status === 'ready'}
	<div class="dna-controls" role="group" aria-label="Пресет визуализации">
		<button
			type="button"
			class="dna-controls__step"
			aria-label="Предыдущий пресет"
			onclick={() => engine.prev()}
		>
			&lsaquo;
		</button>
		<span class="dna-controls__label">
			{presetIndex >= 0
				? `${presetIndex + 1} / ${presets.length} · ${presets[presetIndex].short}`
				: 'загрузка…'}
		</span>
		<button
			type="button"
			class="dna-controls__step"
			aria-label="Следующий пресет"
			onclick={() => engine.next()}
		>
			&rsaquo;
		</button>
	</div>
{/if}

<style>
	.visualizer {
		position: absolute;
		inset: 0;
		z-index: 1;
		overflow: hidden;
	}

	.visualizer :global(canvas.butterchurn-canvas) {
		display: block;
		width: 100%;
		height: 100%;
	}

	.visualizer__fallback {
		position: absolute;
		inset: 0;
		z-index: 1;
		display: grid;
		place-items: center;
		padding: 2rem;
		text-align: center;
		background:
			radial-gradient(90% 70% at 50% 38%, rgba(96, 64, 168, 0.28), rgba(5, 3, 12, 0) 66%),
			radial-gradient(100% 60% at 50% 118%, rgba(255, 138, 92, 0.12), rgba(5, 3, 12, 0) 60%);
		color: rgba(238, 232, 255, 0.62);
		font-size: 0.85rem;
		letter-spacing: 0.08em;
		pointer-events: none;
	}

	.visualizer__fallback p {
		margin: 0;
	}

	/* Пресетные контролы — из v1.1: нижний центр, спокойное стекло. */
	.dna-controls {
		position: absolute;
		z-index: 3;
		left: 50%;
		bottom: clamp(0.9rem, 3vh, 1.8rem);
		translate: -50% 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.3rem 0.55rem;
		border: 1px solid rgba(190, 200, 255, 0.14);
		border-radius: 999px;
		background: rgba(9, 10, 26, 0.34);
		color: rgba(238, 232, 255, 0.82);
		font-family: 'Nunito Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
		font-size: 0.72rem;
		font-weight: 300;
		letter-spacing: 0.06em;
		backdrop-filter: blur(9px) saturate(1.1);
		-webkit-backdrop-filter: blur(9px) saturate(1.1);
	}

	.dna-controls__step {
		flex: none;
		display: grid;
		place-items: center;
		width: 2.25rem;
		height: 2.25rem;
		border: 0;
		border-radius: 50%;
		background: rgba(180, 165, 255, 0.14);
		color: inherit;
		font-family: inherit;
		font-size: 1.15rem;
		line-height: 1;
		cursor: pointer;
		transition: background 300ms var(--ease-soft), color 300ms var(--ease-soft);
		-webkit-tap-highlight-color: transparent;
	}

	.dna-controls__step:hover,
	.dna-controls__step:focus-visible {
		color: #f4f0ff;
		background: rgba(180, 165, 255, 0.28);
	}

	.dna-controls__step:focus-visible {
		outline: 1px solid rgba(216, 198, 255, 0.6);
		outline-offset: 3px;
	}

	.dna-controls__label {
		min-width: 9rem;
		padding: 0 0.15rem;
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		text-shadow: 0 1px 5px rgba(3, 4, 14, 0.9);
	}

	@media (max-width: 640px) {
		.dna-controls {
			bottom: calc(0.9rem + env(safe-area-inset-bottom, 0px));
			gap: 0.4rem;
			font-size: 0.68rem;
		}

		.dna-controls__step {
			width: 2.75rem;
			height: 2.75rem;
			font-size: 1.3rem;
		}

		.dna-controls__label {
			min-width: 0;
			max-width: 42vw;
		}
	}
</style>
