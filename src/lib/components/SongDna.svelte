<script lang="ts">
	import { DNA_AXES, MORPHOLOGIES, type DnaMorphology, type DnaValues } from '#lib/data/dna.js';
	import {
		MORPH_GEOMETRY,
		buildAxisLabels,
		buildPetalPaths,
		buildSpokes,
		clamp01to100
	} from './dna-geometry.js';
	import DnaFigure from './DnaFigure.svelte';

	/**
	 * «Цветок ДНК» — авторский визуальный отпечаток версии песни.
	 *
	 * 8 значений задают ИНДИВИДУАЛЬНУЮ форму (длину каждого из 8 лучей/лепестков),
	 * morphology — ГЕОМЕТРИЧЕСКИЙ ЯЗЫК, которым эта форма строится. У каждой
	 * morphology свой алгоритм внешнего контура (а не общий генератор с разными
	 * коэффициентами), поэтому Bloom, Star, Crystal, Pulse, Spiral и Void
	 * различаются по самому силуэту, а не только по цвету.
	 *
	 * Геометрия — в `dna-geometry.ts`, оформление каркаса — в `DnaFigure.svelte`.
	 * Здесь только статичная сборка фигуры из данных версии.
	 *
	 * Всё детерминировано (значения + morphology → один и тот же путь), только
	 * SVG + CSS: без canvas/WebGL/AudioContext/rAF/таймеров/Math.random.
	 */
	interface SongDnaProps {
		values: DnaValues;
		morphology: DnaMorphology;
	}

	let { values, morphology }: SongDnaProps = $props();

	const petals = $derived.by(() => buildPetalPaths(values, morphology));
	const labels = buildAxisLabels();
	const spokes = buildSpokes();
	const meta = $derived(MORPHOLOGIES[morphology]);
	const breath = $derived(MORPH_GEOMETRY[morphology].breath);
	// id зависит от morphology и values: градиент использует ТОЛЬКО цвет morphology,
	// поэтому разные цвета всегда получают разные id и не «крадут» градиент.
	const gradId = $derived(`dna-grad-${morphology}-${values.join('-')}`);

	/** Подсказка по оси: заголовок, полюса и значение. */
	function tip(i: number): { title: string; range: string; value: number } {
		return {
			title: DNA_AXES[i]?.title ?? '',
			range: `${DNA_AXES[i]?.low ?? ''} → ${DNA_AXES[i]?.high ?? ''}`,
			value: clamp01to100(values[i])
		};
	}
</script>

<DnaFigure
	{petals}
	{labels}
	{spokes}
	{meta}
	{breath}
	{gradId}
	ariaLabel={`ДНК песни — ${meta.name}`}
	{tip}
/>
