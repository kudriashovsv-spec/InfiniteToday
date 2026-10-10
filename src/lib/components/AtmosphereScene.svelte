<script lang="ts">
	import { onMount } from 'svelte';
	import { createAtmosphere, type AtmosphereMorphology } from '#lib/atmosphere/atmosphere.js';

	/**
	 * UI-обёртка «живой атмосферы» L3: один canvas + lifecycle.
	 *
	 * Вся отрисовка и вся защита (desktop-only, reduced-motion, скрытая вкладка,
	 * отмена rAF) — в `#lib/atmosphere/atmosphere.js`. Компонент не знает ни о
	 * данных версий, ни об аудио.
	 */
	interface AtmosphereSceneProps {
		morphology: AtmosphereMorphology;
		/** общая интенсивность свечения (1 = базово) */
		intensity?: number;
		/** множитель скорости движения (1 = базово) */
		motion?: number;
		/** false = пауза без удаления фона (например, открыт визуализатор) */
		active?: boolean;
	}

	let { morphology, intensity = 1, motion = 1, active = true }: AtmosphereSceneProps = $props();

	let canvas: HTMLCanvasElement | null = $state(null);
	let engine: ReturnType<typeof createAtmosphere> | null = null;

	onMount(() => {
		if (!canvas) return;
		engine = createAtmosphere(canvas, { morphology, intensity, motion });
		engine.start();
		engine.setActive(active);

		let observer: ResizeObserver | undefined;
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

	// Параметры и морфология применяются без пересоздания движка.
	$effect(() => {
		engine?.setParams({ morphology, intensity, motion });
		engine?.setActive(active);
	});
</script>

<canvas class="atmosphere" bind:this={canvas} aria-hidden="true"></canvas>

<style>
	.atmosphere {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}
</style>
