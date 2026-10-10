// Геометрия «цветка ДНК» — чистые функции без DOM и анимации.
//
// Здесь живёт только геометрия силуэта: 6 билдеров лепестков, визуальная
// конфигурация morphology (scale/hw/breath) и детерминированные производные
// (контуры лепестков, подписи осей, спицы). Метаданные morphology (имя, цвет,
// описание) остаются в `data/dna.ts`; рендер и анимации — в компонентах.
//
// Всё детерминировано: значения + morphology → один и тот же путь.
// Без canvas/WebGL/AudioContext/rAF/таймеров/Math.random.

import { DNA_AXES, type DnaMorphology, type DnaValues } from '#lib/data/dna.js';

/** Число лепестков/осей. */
export const DNA_PETAL_COUNT = 8;
/** Радиус вершины лепестка. */
export const DNA_RADIUS = 100;
/** Радиус подписей осей. */
export const DNA_LABEL_RADIUS = 120;

export interface MorphGeometry {
	/** базовый масштаб силуэта */
	scale: number;
	/** базовая полуширина лепестка, градусы */
	hw: number;
	/** период дыхания (CSS) */
	breath: string;
}

// Здесь только геометрия силуэта. Название и цвет — из единого источника
// метаданных (`MORPHOLOGIES` в dna.ts), чтобы подпись и форма не расходились.
export const MORPH_GEOMETRY: Record<DnaMorphology, MorphGeometry> = {
	bloom: { scale: 1.0, hw: 26, breath: '6s' },
	star: { scale: 1.02, hw: 16, breath: '4.8s' },
	crystal: { scale: 0.95, hw: 20, breath: '7s' },
	pulse: { scale: 0.98, hw: 24, breath: '3s' },
	spiral: { scale: 1.03, hw: 24, breath: '6.5s' },
	void: { scale: 1.04, hw: 16, breath: '8s' }
};

export interface Petal {
	i: number;
	d: string;
	opacity: number;
	label: string;
}

export interface AxisLabel {
	i: number;
	x: number;
	y: number;
	title: string;
}

export interface Spoke {
	i: number;
	x: number;
	y: number;
}

function polar(deg: number, r: number): { x: number; y: number } {
	const a = (deg * Math.PI) / 180;
	return { x: Math.cos(a) * r, y: Math.sin(a) * r };
}

function pt(p: { x: number; y: number }): string {
	return `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
}

export function clamp01to100(v: number | undefined): number {
	return Math.min(100, Math.max(0, v ?? 0));
}

/** Детерминированный псевдослучайный [0,1) из набора значений и seed. */
function makeHash(values: DnaValues): (seed: number) => number {
	return function hash(seed: number): number {
		let h = 2166136261 >>> 0;
		for (let k = 0; k < values.length; k++) {
			h ^= ((values[k] ?? 0) | 0) + seed * 131 + k * 17;
			h = Math.imul(h, 16777619) >>> 0;
		}
		return (h % 1000) / 1000;
	};
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
function buildBloom(c: PetalCtx, hash: (seed: number) => number): string {
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
function buildStar(c: PetalCtx, hash: (seed: number) => number): string {
	const w = c.hw * (1 + (hash(c.i + 50) - 0.5) * 0.18);
	const tip = polar(c.axis, c.len);
	const b1 = polar(c.axis - w, c.len * 0.44);
	const b2 = polar(c.axis + w, c.len * 0.44);
	return `M 0 0 L ${pt(b1)} L ${pt(tip)} L ${pt(b2)} Z`;
}

// ---------------------------------------------------------------- CRYSTAL --
// Гранёный кристалл: 3 линейные грани с каждой стороны + скошенная вершина.
function buildCrystal(c: PetalCtx, hash: (seed: number) => number): string {
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
function buildPulse(c: PetalCtx, hash: (seed: number) => number): string {
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
		const halfW = ((c.hw * Math.PI) / 180) * c.len * Math.sin(Math.PI * t) * 0.62;
		left.push(pt({ x: center.x - dy * halfW, y: center.y + dx * halfW }));
		right.push(pt({ x: center.x + dy * halfW, y: center.y - dx * halfW }));
	}
	return `M ${left[0]} L ${left.slice(1).join(' L ')} L ${right.reverse().join(' L ')} Z`;
}

// ------------------------------------------------------------------- VOID --
// Синусоидальные края: плавная волна вдоль края, открытый центр (портал).
function buildVoid(c: PetalCtx, hash: (seed: number) => number): string {
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

const BUILDERS: Record<DnaMorphology, (c: PetalCtx, hash: (seed: number) => number) => string> = {
	bloom: buildBloom,
	star: buildStar,
	crystal: buildCrystal,
	pulse: buildPulse,
	spiral: buildSpiral,
	void: buildVoid
};

/** Контуры лепестков для версии: длина — значения, язык — morphology. */
export function buildPetalPaths(values: DnaValues, morphology: DnaMorphology): Petal[] {
	const m = MORPH_GEOMETRY[morphology];
	const build = BUILDERS[morphology];
	const hash = makeHash(values);
	const out: Petal[] = [];
	for (let i = 0; i < DNA_PETAL_COUNT; i++) {
		const v = clamp01to100(values[i]);
		const base = -90 + i * (360 / DNA_PETAL_COUNT);
		// Очень лёгкий угловой разброс: форма живая, но язык morphology сохранён.
		const axis = base + (hash(i) - 0.5) * 4;
		const len = DNA_RADIUS * (0.12 + 0.88 * (v / 100)) * m.scale;
		out.push({
			i,
			d: build({ i, axis, len, hw: m.hw }, hash),
			opacity: 0.16 + 0.26 * (v / 100),
			label: `${DNA_AXES[i]?.title ?? ''}: ${v}`
		});
	}
	return out;
}

/** Подписи восьми осей по кругу. */
export function buildAxisLabels(): AxisLabel[] {
	const out: AxisLabel[] = [];
	for (let i = 0; i < DNA_PETAL_COUNT; i++) {
		const base = -90 + i * (360 / DNA_PETAL_COUNT);
		const p = polar(base, DNA_LABEL_RADIUS);
		out.push({ i, x: p.x, y: p.y, title: DNA_AXES[i]?.title ?? '' });
	}
	return out;
}

/** Спицы от центра к вершинам осей. */
export function buildSpokes(): Spoke[] {
	return Array.from({ length: DNA_PETAL_COUNT }, (_, i) => {
		const base = -90 + i * (360 / DNA_PETAL_COUNT);
		const p = polar(base, DNA_RADIUS * 1.04);
		return { i, x: p.x, y: p.y };
	});
}

// ---------------------------------------------------------------------------
// Морфинг контуров — используется только desktop-переходом `DnaMorph`.
// Здесь только чистая математика: нормализация контура в кольцо точек,
// попарная интерполяция и грубая оценка дефекта. Никакого DOM/rAF.
// ---------------------------------------------------------------------------

export interface Point {
	x: number;
	y: number;
}

/** Точки контура: M/L/C/Z разворачиваются в полилинию (cubic — шагами). */
function flattenPath(d: string): Point[] {
	const re = /([MLCZ])|(-?\d*\.?\d+)/g;
	const toks: (string | number)[] = [];
	let m: RegExpExecArray | null;
	while ((m = re.exec(d))) toks.push(m[1] ? m[1] : parseFloat(m[2]));
	let i = 0;
	const pts: Point[] = [];
	let cur: Point = { x: 0, y: 0 };
	let start: Point | null = null;
	while (i < toks.length) {
		const t = toks[i++];
		if (t === 'M') {
			cur = { x: toks[i++] as number, y: toks[i++] as number };
			start = { ...cur };
			pts.push({ ...cur });
		} else if (t === 'L') {
			cur = { x: toks[i++] as number, y: toks[i++] as number };
			pts.push({ ...cur });
		} else if (t === 'C') {
			const p1 = { x: toks[i++] as number, y: toks[i++] as number };
			const p2 = { x: toks[i++] as number, y: toks[i++] as number };
			const p3 = { x: toks[i++] as number, y: toks[i++] as number };
			const a = cur;
			for (let s = 1; s <= 12; s++) {
				const u = s / 12;
				const v = 1 - u;
				pts.push({
					x: v * v * v * a.x + 3 * v * v * u * p1.x + 3 * v * u * u * p2.x + u * u * u * p3.x,
					y: v * v * v * a.y + 3 * v * v * u * p1.y + 3 * v * u * u * p2.y + u * u * u * p3.y
				});
			}
			cur = p3;
		} else if (t === 'Z') {
			if (start) pts.push({ ...start });
		}
	}
	return pts;
}

/** Ресемплинг открытого контура к `m` точкам по длине дуги. */
function resampleOpen(pts: Point[], m: number): Point[] {
	const seg: number[] = [];
	const cum: number[] = [0];
	let total = 0;
	for (let i = 0; i < pts.length - 1; i++) {
		const L = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
		seg.push(L);
		total += L;
		cum.push(total);
	}
	const out: Point[] = [];
	for (let k = 0; k < m; k++) {
		const target = total * (k / (m - 1));
		let j = 0;
		while (j < seg.length - 1 && cum[j + 1] < target) j++;
		const local = seg[j] ? (target - cum[j]) / seg[j] : 0;
		out.push({
			x: pts[j].x + (pts[j + 1].x - pts[j].x) * local,
			y: pts[j].y + (pts[j + 1].y - pts[j].y) * local
		});
	}
	return out;
}

/** Знаковая площадь замкнутого кольца (ориентация обхода). */
function signedArea(ring: Point[]): number {
	let a = 0;
	for (let i = 0; i < ring.length; i++) {
		const q = ring[(i + 1) % ring.length];
		a += ring[i].x * q.y - q.x * ring[i].y;
	}
	return a / 2;
}

/**
 * Нормализованное кольцо лепестка: origin→tip→origin, ровно `2*(perSide-1)` точек.
 * Общая параметризация нужна, чтобы точки двух форм лерпились попарно: начало и
 * вершина у обоих колец совпадают (для Void начало — кромка отверстия).
 *
 * Ориентация обхода приводится к единой (положительная площадь): Spiral строится
 * с обратным обходом, и без этого при морфе контур проходил бы через нулевую
 * площадь — лепесток на миг «выворачивался». Нормализация не меняет саму форму
 * (это тот же контур), только порядок точек.
 */
export function petalRings(values: DnaValues, morphology: DnaMorphology, perSide = 48): Point[][] {
	return buildPetalPaths(values, morphology).map((petal) => {
		const pts = flattenPath(petal.d);
		if (pts.length > 1 && pts[0].x === pts[pts.length - 1].x && pts[0].y === pts[pts.length - 1].y) {
			pts.pop();
		}
		let tip = 0;
		let best = -1;
		for (let i = 0; i < pts.length; i++) {
			const r = Math.hypot(pts[i].x, pts[i].y);
			if (r > best) {
				best = r;
				tip = i;
			}
		}
		const sideA = pts.slice(0, tip + 1);
		const sideB = pts.slice(tip).concat([pts[0]]);
		const ring = resampleOpen(sideA, perSide).concat(resampleOpen(sideB, perSide).slice(1, -1));
		return signedArea(ring) < 0 ? [ring[0], ...ring.slice(1).reverse()] : ring;
	});
}

/** Попарная линейная интерполяция двух наборов колец. */
export function interpolateRings(a: Point[][], b: Point[][], t: number): Point[][] {
	return a.map((ring, i) =>
		ring.map((p, j) => ({
			x: p.x + (b[i][j].x - p.x) * t,
			y: p.y + (b[i][j].y - p.y) * t
		}))
	);
}

/** SVG-путь замкнутого кольца. */
export function ringToPath(ring: Point[]): string {
	return `M ${ring.map(pt).join(' L ')} Z`;
}

/** Смешение двух hex-цветов (для плавного цвета во время морфа). */
export function mixHex(a: string, b: string, t: number): string {
	const parse = (h: string): number[] => {
		const s = h.replace('#', '');
		return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
	};
	const ca = parse(a);
	const cb = parse(b);
	const c = ca.map((v, i) => Math.round(v + (cb[i] - v) * t));
	return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Все точки колец конечны (страховка от вырожденной геометрии). */
export function ringsFinite(rings: Point[][]): boolean {
	for (const ring of rings) {
		for (const p of ring) {
			if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return false;
		}
	}
	return true;
}

/**
 * Критерий совместимости морфинга (Stage 3) — единый источник для `DnaMorph`
 * и dev-лаборатории.
 *
 * Морфинг включён по умолчанию; для пар из короткого РУЧНОГО списка он уходит в
 * cross-dissolve. Список сейчас ПУСТ: все пары, включая pulse↔spiral (проверено
 * визуально), морфятся. Механизм оставлен как безопасный fallback для будущих
 * проблемных пар. Автоматическая классификация по самопересечениям НЕ используется:
 * метрика ненадёжна (десятки «заломов» даже на star→star).
 */
export const MORPH_FALLBACK_PAIRS: ReadonlySet<string> = new Set<string>();

/** true, если для пары морфологий включён cross-dissolve-fallback. */
export function dnaMorphFallbackPair(a: DnaMorphology, b: DnaMorphology): boolean {
	return MORPH_FALLBACK_PAIRS.has([a, b].sort().join('|'));
}
