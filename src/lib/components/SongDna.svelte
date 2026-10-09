<script lang="ts">
	import { DNA_AXES, MORPHOLOGIES, type DnaMorphology, type DnaValues } from '#lib/data/dna.js';

	/**
	 * «Цветок ДНК» — авторский визуальный отпечаток версии песни.
	 *
	 * 8 значений задают ИНДИВИДУАЛЬНУЮ форму (длину каждого из 8 лучей/лепестков),
	 * morphology — ГЕОМЕТРИЧЕСКИЙ ЯЗЫК, которым эта форма строится. У каждой
	 * morphology свой алгоритм внешнего контура (а не общий генератор с разными
	 * коэффициентами), поэтому Bloom, Star, Crystal, Pulse, Spiral и Void
	 * различаются по самому силуэту, а не только по цвету.
	 *
	 * Всё детерминировано (значения + morphology → один и тот же путь), только
	 * SVG + CSS: без canvas/WebGL/AudioContext/rAF/таймеров/Math.random.
	 */
	interface SongDnaProps {
		values: DnaValues;
		morphology: DnaMorphology;
	}

	let { values, morphology }: SongDnaProps = $props();

	const N = DNA_AXES.length;
	const R = 100;
	const LABEL_R = 120;

	interface MorphConfig {
		/** базовый масштаб силуэта */
		scale: number;
		/** базовая полуширина лепестка, градусы */
		hw: number;
		/** период дыхания */
		breath: string;
	}

	// Здесь только геометрия силуэта. Название и цвет — из единого источника
	// метаданных (`MORPHOLOGIES` в dna.ts), чтобы подпись и форма не расходились.
	const MORPH: Record<DnaMorphology, MorphConfig> = {
		bloom: { scale: 1.0, hw: 26, breath: '6s' },
		star: { scale: 1.02, hw: 16, breath: '4.8s' },
		crystal: { scale: 0.95, hw: 20, breath: '7s' },
		pulse: { scale: 0.98, hw: 24, breath: '3s' },
		spiral: { scale: 1.03, hw: 24, breath: '6.5s' },
		void: { scale: 1.04, hw: 16, breath: '8s' }
	};

	const cfg = $derived(MORPH[morphology]);
	const meta = $derived(MORPHOLOGIES[morphology]);

	/** Детерминированный псевдослучайный [0,1) из набора значений и seed. */
	function hash(seed: number): number {
		let h = 2166136261 >>> 0;
		for (let k = 0; k < values.length; k++) {
			h ^= ((values[k] ?? 0) | 0) + seed * 131 + k * 17;
			h = Math.imul(h, 16777619) >>> 0;
		}
		return (h % 1000) / 1000;
	}

	function polar(deg: number, r: number): { x: number; y: number } {
		const a = (deg * Math.PI) / 180;
		return { x: Math.cos(a) * r, y: Math.sin(a) * r };
	}

	function pt(p: { x: number; y: number }): string {
		return `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
	}

	function clamp01to100(v: number | undefined): number {
		return Math.min(100, Math.max(0, v ?? 0));
	}

	function rgba(hex: string, a: number): string {
		const h = hex.replace('#', '');
		const r = parseInt(h.slice(0, 2), 16);
		const g = parseInt(h.slice(2, 4), 16);
		const b = parseInt(h.slice(4, 6), 16);
		return `rgba(${r}, ${g}, ${b}, ${a})`;
	}

	/** Контекст одного лепестка для генераторов геометрии. */
	interface PetalCtx {
		i: number;
		/** направление оси, градусы */
		axis: number;
		/** длина до вершины */
		len: number;
		/** базовая полуширина, градусы */
		hw: number;
	}

	// ------------------------------------------------------------------ BLOOM --
	// Мягкий цветок: плавные cubic-лепестки, округлая вершина, без углов.
	function buildBloom(c: PetalCtx): string {
		const w = c.hw * (1 + (hash(c.i + 50) - 0.5) * 0.26);
		const tip = polar(c.axis, c.len);
		const l1 = polar(c.axis - w, c.len * 0.5);
		const l2 = polar(c.axis - w * 0.5, c.len * 0.92);
		const r2 = polar(c.axis + w * 0.5, c.len * 0.92);
		const r1 = polar(c.axis + w, c.len * 0.5);
		return `M 0 0 C ${pt(l1)} ${pt(l2)} ${pt(tip)} C ${pt(r2)} ${pt(r1)} 0 0 Z`;
	}

	// ------------------------------------------------------------------- STAR --
	// 8-лучевая звезда: прямые боковые стороны, острая вершина.
	function buildStar(c: PetalCtx): string {
		const w = c.hw * (1 + (hash(c.i + 50) - 0.5) * 0.18);
		const tip = polar(c.axis, c.len);
		const b1 = polar(c.axis - w, c.len * 0.44);
		const b2 = polar(c.axis + w, c.len * 0.44);
		return `M 0 0 L ${pt(b1)} L ${pt(tip)} L ${pt(b2)} Z`;
	}

	// ---------------------------------------------------------------- CRYSTAL --
	// Гранёный кристалл: 3 линейные грани с каждой стороны + скошенная вершина.
	function buildCrystal(c: PetalCtx): string {
		const w = c.hw * (1 + (hash(c.i + 50) - 0.5) * 0.14);
		const p = (a: number, r: number): string => pt(polar(a, r));
		const tipW = w * 0.26;
		return [
			'M 0 0',
			`L ${p(c.axis - w, c.len * 0.32)}`,
			`L ${p(c.axis - w * 0.66, c.len * 0.64)}`,
			`L ${p(c.axis - w * 0.36, c.len * 0.86)}`,
			`L ${p(c.axis - tipW, c.len)}`,
			`L ${p(c.axis + tipW, c.len)}`,
			`L ${p(c.axis + w * 0.36, c.len * 0.86)}`,
			`L ${p(c.axis + w * 0.66, c.len * 0.64)}`,
			`L ${p(c.axis + w, c.len * 0.32)}`,
			'Z'
		].join(' ');
	}

	// ------------------------------------------------------------------ PULSE --
	// Рваный импульс: контролируемый зигзаг (чередующиеся выпуклости/впадины),
	// асимметрия и лёгкий угловой разброс. Детерминировано значениями.
	function buildPulse(c: PetalCtx): string {
		const w = c.hw * (1 + (hash(c.i + 50) - 0.5) * 0.55);
		const M = 4;
		const left: string[] = [];
		const right: string[] = [];
		for (let j = 0; j < M; j++) {
			const t = j / M;
			const rBase = c.len * (0.32 + 0.68 * t);
			const magL = c.len * (0.09 + 0.12 * hash(c.i * 17 + j + 2));
			const magR = c.len * (0.09 + 0.12 * hash(c.i * 23 + j + 5));
			const angL = c.axis - w * (1 - t) + (hash(c.i * 7 + j) - 0.5) * 4;
			const angR = c.axis + w * (1 - t) + (hash(c.i * 11 + j) - 0.5) * 4;
			left.push(pt(polar(angL, rBase + (j % 2 === 0 ? magL : -magL))));
			right.push(pt(polar(angR, rBase + ((j + 1) % 2 === 0 ? magR : -magR))));
		}
		const tip = pt(polar(c.axis + (hash(c.i + 300) - 0.5) * 6, c.len));
		return `M 0 0 L ${left.join(' L ')} L ${tip} L ${right.reverse().join(' L ')} Z`;
	}

	// ----------------------------------------------------------------- SPIRAL --
	// Закрученные лепестки: ось плавно отклоняется по касательной, все в одну сторону.
	function buildSpiral(c: PetalCtx): string {
		const STEPS = 16;
		const twist = 26;
		const left: string[] = [];
		const right: string[] = [];
		for (let s = 0; s <= STEPS; s++) {
			const t = s / STEPS;
			const ang = c.axis + twist * Math.pow(t, 1.25);
			const center = polar(ang, c.len * t);
			const t2 = Math.min(1, t + 0.02);
			const ang2 = c.axis + twist * Math.pow(t2, 1.25);
			const ahead = polar(ang2, c.len * t2);
			let dx = ahead.x - center.x;
			let dy = ahead.y - center.y;
			const dl = Math.hypot(dx, dy) || 1;
			dx /= dl;
			dy /= dl;
			const halfW = (c.hw * Math.PI) / 180 * c.len * Math.sin(Math.PI * t) * 0.62;
			left.push(pt({ x: center.x - dy * halfW, y: center.y + dx * halfW }));
			right.push(pt({ x: center.x + dy * halfW, y: center.y - dx * halfW }));
		}
		return `M ${left[0]} L ${left.slice(1).join(' L ')} L ${right.reverse().join(' L ')} Z`;
	}

	// ------------------------------------------------------------------- VOID --
	// Синусоидальные края: плавная волна вдоль края, открытый центр (портал).
	function buildVoid(c: PetalCtx): string {
		const STEPS = 22;
		const hole = c.len * 0.3;
		const waves = 1 + Math.floor(hash(c.i + 90) * 3);
		const phase = hash(c.i + 120) * Math.PI * 2;
		const amp = c.len * 0.075;
		const left: string[] = [];
		const right: string[] = [];
		for (let s = 0; s <= STEPS; s++) {
			const t = s / STEPS;
			const base = hole + (c.len - hole) * t;
			const waveL = amp * Math.sin(2 * Math.PI * waves * t + phase);
			const waveR = amp * Math.sin(2 * Math.PI * waves * t + phase + 0.9);
			left.push(pt(polar(c.axis - c.hw * (1 - t), base + waveL)));
			right.push(pt(polar(c.axis + c.hw * (1 - t), base + waveR)));
		}
		return `M ${left.join(' L ')} L ${right.reverse().join(' L ')} Z`;
	}

	const BUILDERS: Record<DnaMorphology, (c: PetalCtx) => string> = {
		bloom: buildBloom,
		star: buildStar,
		crystal: buildCrystal,
		pulse: buildPulse,
		spiral: buildSpiral,
		void: buildVoid
	};

	interface Petal {
		i: number;
		d: string;
		opacity: number;
		label: string;
	}

	const petals = $derived.by((): Petal[] => {
		const m = cfg;
		const build = BUILDERS[morphology];
		const out: Petal[] = [];
		for (let i = 0; i < N; i++) {
			const v = clamp01to100(values[i]);
			const base = -90 + i * (360 / N);
			// Очень лёгкий угловой разброс: форма живая, но язык morphology сохранён.
			const axis = base + (hash(i) - 0.5) * 4;
			const len = R * (0.12 + 0.88 * (v / 100)) * m.scale;
			out.push({
				i,
				d: build({ i, axis, len, hw: m.hw }),
				opacity: 0.16 + 0.26 * (v / 100),
				label: `${DNA_AXES[i]?.title ?? ''}: ${v}`
			});
		}
		return out;
	});

	interface AxisLabel {
		i: number;
		x: number;
		y: number;
		title: string;
	}

	const labels = $derived.by((): AxisLabel[] => {
		const out: AxisLabel[] = [];
		for (let i = 0; i < N; i++) {
			const base = -90 + i * (360 / N);
			const p = polar(base, LABEL_R);
			out.push({ i, x: p.x, y: p.y, title: DNA_AXES[i]?.title ?? '' });
		}
		return out;
	});

	const spokes = $derived.by(() =>
		Array.from({ length: N }, (_, i) => {
			const base = -90 + i * (360 / N);
			const p = polar(base, R * 1.04);
			return { i, x: p.x, y: p.y };
		})
	);

	let hovered = $state<number | null>(null);
	const gradId = $derived(`dna-grad-${values.join('-')}`);

	function enter(i: number): void {
		hovered = i;
	}
	function leave(i: number): void {
		if (hovered === i) hovered = null;
	}
</script>

<div
	class="dna"
	style={`--dna-color:${meta.color};--dna-glow:${rgba(meta.color, 0.4)};--dna-breath:${cfg.breath};--dna-stroke:${rgba(meta.color, 0.82)};`}
>
	<p class="dna__morph">{meta.name}</p>
	<svg class="dna__svg" viewBox="-152 -152 304 304" role="img" aria-label={`ДНК песни — ${meta.name}`}>
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

	{#if hovered !== null}
		<div class="dna__tip" role="status">
			<span class="dna__tip-title">{DNA_AXES[hovered]?.title ?? ''}</span>
			<span class="dna__tip-range"
				>{DNA_AXES[hovered]?.low ?? ''} → {DNA_AXES[hovered]?.high ?? ''}</span
			>
			<span class="dna__tip-value">{clamp01to100(values[hovered])}</span>
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
