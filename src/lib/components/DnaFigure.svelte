<script lang="ts">
	import type { MorphologyMeta } from '#lib/data/dna.js';
	import type { AxisLabel, Petal, Spoke } from './dna-geometry.js';

	/**
	 * Презентационный SVG-каркас «цветка ДНК»: подпись morphology, спицы,
	 * контуры лепестков, core, градиент, подписи осей и подсказка по наведению.
	 *
	 * Не знает ни о данных версий, ни об анимации: получает уже готовые
	 * лепестки/подписи/спицы и сам владеет только оформлением и hover-состоянием.
	 * Используется статичным `SongDna` (и далее — десктопным `DnaMorph`),
	 * поэтому геометрия и анимации остаются отдельно от рендера.
	 */
	interface DnaFigureProps {
		petals: Petal[];
		labels: AxisLabel[];
		spokes: Spoke[];
		meta: MorphologyMeta;
		/** период дыхания (CSS) */
		breath: string;
		/** id градиента (уникальный для фигуры) */
		gradId: string;
		ariaLabel: string;
		/** подсказка по наведённому лепестку; без неё подсказка не показывается */
		tip?: (i: number) => { title: string; range: string; value: number } | null;
	}

	let { petals, labels, spokes, meta, breath, gradId, ariaLabel, tip }: DnaFigureProps = $props();

	function rgba(hex: string, a: number): string {
		const h = hex.replace('#', '');
		const r = parseInt(h.slice(0, 2), 16);
		const g = parseInt(h.slice(2, 4), 16);
		const b = parseInt(h.slice(4, 6), 16);
		return `rgba(${r}, ${g}, ${b}, ${a})`;
	}

	let hovered = $state<number | null>(null);
	const activeTip = $derived(hovered !== null && tip ? tip(hovered) : null);

	function enter(i: number): void {
		hovered = i;
	}
	function leave(i: number): void {
		if (hovered === i) hovered = null;
	}
</script>

<div
	class="dna"
	style={`--dna-color:${meta.color};--dna-glow:${rgba(meta.color, 0.4)};--dna-breath:${breath};--dna-stroke:${rgba(meta.color, 0.82)};`}
>
	<p class="dna__morph">{meta.name}</p>
	<svg class="dna__svg" viewBox="-152 -152 304 304" role="img" aria-label={ariaLabel}>
		<defs>
			<radialGradient id={gradId} gradientUnits="userSpaceOnUse" cx="0" cy="0" r="105">
				<stop offset="0%" stop-color={rgba(meta.color, 0.66)} />
				<stop offset="52%" stop-color={rgba(meta.color, 0.34)} />
				<stop offset="100%" stop-color={rgba(meta.color, 0.1)} />
			</radialGradient>
		</defs>

		{#each spokes as s (s.i)}
			<line class="dna__spoke" x1="0" y1="0" x2={s.x} y2={s.y} />
		{/each}

		<g class="dna__shape">
			{#each petals as p (p.i)}
				<path
					class="dna__petal"
					class:is-active={hovered === p.i}
					d={p.d}
					fill={`url(#${gradId})`}
					fill-opacity={p.opacity}
					stroke="var(--dna-stroke)"
					tabindex="0"
					role="button"
					aria-label={p.label}
					onmouseenter={() => enter(p.i)}
					onmouseleave={() => leave(p.i)}
					onfocus={() => enter(p.i)}
					onblur={() => leave(p.i)}
				/>
			{/each}

			<circle class="dna__core" cx="0" cy="0" r="4.2" />
		</g>

		{#each labels as l (l.i)}
			<text class="dna__label" x={l.x} y={l.y} text-anchor="middle" dominant-baseline="middle"
				>{l.title}</text
			>
		{/each}
	</svg>

	{#if activeTip}
		<div class="dna__tip" role="status">
			<span class="dna__tip-title">{activeTip.title}</span>
			<span class="dna__tip-range">{activeTip.range}</span>
			<span class="dna__tip-value">{activeTip.value}</span>
		</div>
	{/if}
</div>

<style>
	.dna {
		position: relative;
		width: 100%;
	}

	/* Название морфологии над DNA. Цвет берётся из --dna-color (единый источник
	   метаданных), поэтому подпись всегда совпадает с цветом силуэта. */
	.dna__morph {
		margin: 0 0 0.2rem;
		text-align: center;
		font-family: 'Nunito Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
		font-size: clamp(0.72rem, 1.05vw, 0.95rem);
		font-weight: 300;
		letter-spacing: 0.28em;
		text-indent: 0.28em;
		text-transform: uppercase;
		color: var(--dna-color);
		text-shadow: 0 1px 6px rgba(3, 4, 14, 0.85);
		pointer-events: none;
		user-select: none;
	}

	.dna__svg {
		display: block;
		width: 100%;
		height: auto;
		overflow: visible;
	}

	/* Дыхание: очень мягкая жизнь формы, только CSS. Геометрия не пересчитывается. */
	.dna__shape {
		transform-box: view-box;
		transform-origin: 50% 50%;
		filter: drop-shadow(0 0 6px var(--dna-glow, transparent));
		animation: dna-breath var(--dna-breath, 6s) var(--ease-soft) infinite;
	}

	@keyframes dna-breath {
		0%,
		100% {
			transform: scale(0.985);
			opacity: 0.86;
		}
		50% {
			transform: scale(1.015);
			opacity: 1;
		}
	}

	.dna__spoke {
		stroke: rgba(196, 184, 255, 0.12);
		stroke-width: 0.7;
	}

	.dna__petal {
		stroke-width: 0.9;
		stroke-linejoin: round;
		cursor: default;
		transition:
			stroke-width var(--dur-ui) var(--ease-ui),
			fill-opacity var(--dur-ui) var(--ease-ui);
	}

	.dna__petal:focus {
		outline: none;
	}

	.dna__petal.is-active {
		stroke-width: 1.8;
		filter: brightness(1.3);
	}

	@media (hover: hover) and (pointer: fine) {
		.dna__petal:hover {
			stroke-width: 1.6;
			filter: brightness(1.22);
		}
	}

	.dna__core {
		fill: var(--dna-stroke, rgba(244, 240, 255, 0.7));
	}

	.dna__label {
		fill: rgba(238, 232, 255, 0.74);
		font-family: 'Nunito Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
		font-size: 11px;
		font-weight: 300;
		letter-spacing: 0.04em;
		pointer-events: none;
		user-select: none;
	}

	.dna__tip {
		position: absolute;
		left: 50%;
		bottom: -0.15rem;
		translate: -50% 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.05rem;
		padding: 0.3rem 0.7rem;
		border: 1px solid rgba(216, 198, 255, 0.2);
		border-radius: 10px;
		background: rgba(9, 10, 26, 0.72);
		backdrop-filter: blur(8px) saturate(1.1);
		-webkit-backdrop-filter: blur(8px) saturate(1.1);
		pointer-events: none;
		white-space: nowrap;
	}

	.dna__tip-title {
		font-size: 0.68rem;
		letter-spacing: 0.06em;
		color: rgba(248, 244, 255, 0.95);
	}

	.dna__tip-range {
		font-size: 0.6rem;
		color: rgba(226, 216, 255, 0.7);
	}

	.dna__tip-value {
		font-size: 0.62rem;
		color: rgba(200, 188, 255, 0.85);
		font-variant-numeric: tabular-nums;
	}

	@media (prefers-reduced-motion: reduce) {
		.dna__shape {
			animation: none;
		}

		.dna__petal {
			transition: none;
		}
	}
</style>
