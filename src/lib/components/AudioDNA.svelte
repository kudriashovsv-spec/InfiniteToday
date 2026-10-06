<script>
	import { onMount } from 'svelte';
	import { createAudioDNA } from '#lib/audio/audio-dna.js';

	/**
	 * UI-слой Audio DNA: свой прозрачный canvas поверх сцены L3 + lifecycle.
	 * Вся работа с аудио (общий analyser, активный источник) и вся отрисовка —
	 * в src/lib/audio/audio-dna.js. Компонент ничего не знает ни о мирах,
	 * ни о Butterchurn, ни о конкретных треках.
	 */

	/** @type {HTMLCanvasElement | null} */
	let canvas = $state(null);
	/** @type {ReturnType<typeof createAudioDNA> | null} */
	let engine = null;

	onMount(() => {
		if (!canvas) return;
		engine = createAudioDNA(canvas);
		engine.start();

		/** @type {ResizeObserver | undefined} */
		let observer;
		if (typeof ResizeObserver !== 'undefined') {
			observer = new ResizeObserver(() => engine?.resize());
			observer.observe(canvas);
		}

		return () => {
			if (observer) observer.disconnect();
			if (engine) engine.stop();
			engine = null;
		};
	});
</script>

<canvas class="audio-dna" bind:this={canvas} aria-hidden="true"></canvas>

<style>
	.audio-dna {
		position: absolute;
		inset: 0;
		z-index: 1;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}
</style>
