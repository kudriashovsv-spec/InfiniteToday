<script lang="ts">
	import { untrack } from 'svelte';
	import { DNA_AXES, MORPHOLOGIES, type DnaMorphology, type DnaValues } from '#lib/data/dna.js';
	import type { MorphologyMeta } from '#lib/data/dna.js';
	import {
		MORPH_GEOMETRY,
		buildAxisLabels,
		buildPetalPaths,
		buildSpokes,
		clamp01to100,
		dnaMorphFallbackPair,
		interpolateRings,
		mixHex,
		petalRings,
		ringToPath,
		ringsFinite,
		type Petal,
		type Point
	} from './dna-geometry.js';
	import DnaFigure from './DnaFigure.svelte';

	/**
	 * Desktop-переход между версиями DNA (L3).
	 *
	 * Основной режим — настоящий морфинг контуров: обе формы нормализуются в
	 * кольца точек и попарно интерполируются ограниченным rAF-таймлайном.
	 * Для явно проблемных пар (ручной список) и при вырожденной геометрии —
	 * мягкий cross-dissolve; при reduced-motion — мгновенная смена. Прерывание
	 * (быстрое переключение) отменяет таймлайн и стартует заново от текущей формы.
	 *
	 * Рендерит общий `DnaFigure`; mobile-путь (`WorldView` + `SongDna`) не задействован.
	 */
	interface DnaMorphProps {
		values: DnaValues;
		morphology: DnaMorphology;
		/**
		 * Только для dev-лаборатории: принудительный режим перехода.
		 * В production не передаётся — работает штатный критерий (`auto`).
		 */
		forceMode?: 'morph' | 'cross';
	}

	let { values, morphology, forceMode }: DnaMorphProps = $props();

	/** Продолжительность перехода формы, ms. */
	const MORPH_MS = 460;
	// Критерий совместимости — единый источник `dnaMorphFallbackPair` в dna-geometry.ts.

	interface FigureState {
		petals: Petal[];
		meta: MorphologyMeta;
		breath: string;
	}

	const uid = $props.id();
	const labels = buildAxisLabels();
	const spokes = buildSpokes();

	function figureFor(v: DnaValues, m: DnaMorphology): FigureState {
		return {
			petals: buildPetalPaths(v, m),
			meta: MORPHOLOGIES[m],
			breath: MORPH_GEOMETRY[m].breath
		};
	}

	const initial = untrack(() => figureFor(values, morphology));
	let mode = $state<'static' | 'morph' | 'cross'>('static');
	let single = $state<FigureState>(initial);
	let fromFig = $state<FigureState>(initial);
	let toFig = $state<FigureState>(initial);
	let crossT = $state(0);

	// Текущая «одна форма» на экране — точка старта для следующего перехода
	// (в т.ч. при прерывании на середине морфа).
	let currentRings: Point[][] = untrack(() => petalRings(values, morphology));
	let currentOpacity: number[] = initial.petals.map((p) => p.opacity);
	let currentColor: string = initial.meta.color;

	// Fallback-решение — по последней паре морфологий.
	let prevMorphology: DnaMorphology = untrack(() => morphology);
	let lastKey = untrack(() => `${morphology}:${values.join(',')}`);

	let rafId: number | null = null;

	function stopRaf(): void {
		if (rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
	}

	function motionAllowed(): boolean {
		if (typeof window === 'undefined') return false;
		return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	function easeOutCubic(t: number): number {
		return 1 - Math.pow(1 - t, 3);
	}

	function settle(fig: FigureState, rings: Point[][], opacity: number[], color: string): void {
		stopRaf();
		mode = 'static';
		single = fig;
		currentRings = rings;
		currentOpacity = opacity;
		currentColor = color;
	}

	function onDnaChanged(): void {
		stopRaf();
		const targetValues = values;
		const targetMorphology = morphology;
		const targetFig = figureFor(targetValues, targetMorphology);
		const targetRings = petalRings(targetValues, targetMorphology);
		const targetOpacity = targetFig.petals.map((p) => p.opacity);
		const targetColor = targetFig.meta.color;
		const targetLabels = targetFig.petals.map((p) => p.label);

		// reduced-motion: мгновенная смена без анимации.
		if (!motionAllowed()) {
			settle(targetFig, targetRings, targetOpacity, targetColor);
			prevMorphology = targetMorphology;
			return;
		}

		const fallback =
			forceMode === 'cross'
				? true
				: forceMode === 'morph'
					? false
					: dnaMorphFallbackPair(prevMorphology, targetMorphology) ||
						!ringsFinite(currentRings) ||
						!ringsFinite(targetRings);
		const fromFigState = single;
		const fromRings = currentRings;
		const fromOpacity = currentOpacity;
		const fromColor = currentColor;

		prevMorphology = targetMorphology;

		if (!fallback) {
			// Морфинг контуров от текущей формы к целевой.
			mode = 'morph';
			const start = performance.now();
			const step = (now: number): void => {
				const raw = Math.min(1, (now - start) / MORPH_MS);
				const t = easeOutCubic(raw);
				const rings = interpolateRings(fromRings, targetRings, t);
				const opacity = fromOpacity.map((o, i) => o + (targetOpacity[i] - o) * t);
				const color = mixHex(fromColor, targetColor, t);
				single = {
					petals: rings.map((ring, i) => ({
						i,
						d: ringToPath(ring),
						opacity: opacity[i],
						label: targetLabels[i]
					})),
					meta: { ...targetFig.meta, color },
					breath: targetFig.breath
				};
				if (raw < 1) {
					rafId = requestAnimationFrame(step);
				} else {
					rafId = null;
					settle(targetFig, targetRings, targetOpacity, targetColor);
				}
			};
			rafId = requestAnimationFrame(step);
		} else {
			// Fallback: cross-dissolve между текущей и целевой формой.
			mode = 'cross';
			fromFig = fromFigState;
			toFig = targetFig;
			crossT = 0;
			const start = performance.now();
			const step = (now: number): void => {
				const raw = Math.min(1, (now - start) / MORPH_MS);
				crossT = easeOutCubic(raw);
				if (raw < 1) {
					rafId = requestAnimationFrame(step);
				} else {
					rafId = null;
					settle(targetFig, targetRings, targetOpacity, targetColor);
				}
			};
			rafId = requestAnimationFrame(step);
		}
	}

	// Первый переход после монтирования: фигура уже отрисована, меняем только при смене пропсов.
	$effect(() => {
		const key = `${morphology}:${values.join(',')}`;
		if (key === lastKey) return;
		lastKey = key;
		onDnaChanged();
	});

	// Уборка: отменяем таймлайн при размонтировании (нет зависших анимаций).
	$effect(() => {
		return () => stopRaf();
	});

	/** Подсказка по оси (как в статичном `SongDna`). */
	function tip(i: number): { title: string; range: string; value: number } {
		return {
			title: DNA_AXES[i]?.title ?? '',
			range: `${DNA_AXES[i]?.low ?? ''} → ${DNA_AXES[i]?.high ?? ''}`,
			value: clamp01to100(values[i])
		};
	}
</script>

<div class="dna-morph">
	{#if mode === 'cross'}
		<div class="dna-morph__layer" style={`opacity:${1 - crossT}`}>
			<DnaFigure
				petals={fromFig.petals}
				{labels}
				{spokes}
				meta={fromFig.meta}
				breath={fromFig.breath}
				gradId={`dna-morph-${uid}-from`}
				ariaLabel={`ДНК песни — ${fromFig.meta.name}`}
			/>
		</div>
		<div class="dna-morph__layer" style={`opacity:${crossT}`}>
			<DnaFigure
				petals={toFig.petals}
				{labels}
				{spokes}
				meta={toFig.meta}
				breath={toFig.breath}
				gradId={`dna-morph-${uid}-to`}
				ariaLabel={`ДНК песни — ${toFig.meta.name}`}
			/>
		</div>
	{:else}
		<DnaFigure
			petals={single.petals}
			{labels}
			{spokes}
			meta={single.meta}
			breath={single.breath}
			gradId={`dna-morph-${uid}`}
			ariaLabel={`ДНК песни — ${single.meta.name}`}
			{tip}
		/>
	{/if}
</div>

<style>
	.dna-morph {
		display: grid;
		width: 100%;
		/* Мягкое появление слота при входе в мир (один раз на монтирование);
		   параметры совпадают с прежним `dna-slot-enter` из страницы мира. */
		animation: dna-morph-enter 480ms var(--ease-out) both;
	}

	.dna-morph__layer {
		grid-area: 1 / 1;
	}

	@keyframes dna-morph-enter {
		from {
			opacity: 0;
			transform: scale(0.9);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.dna-morph {
			animation-duration: 1ms;
		}
	}
</style>
