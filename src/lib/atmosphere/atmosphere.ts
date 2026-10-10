// L3 «живая атмосфера» — процедурный космический фон (Canvas 2D).
//
// Шесть морфологий Song DNA: Star, Bloom, Crystal, Pulse, Spiral, Void.
// Без WebGL, без зависимостей, без аудиореакции. Один canvas, один rAF, 30 FPS, DPR cap.
//
// Переход между морфологиями — snapshot-crossfade: на смену морфологии текущий
// кадр захватывается в offscreen и плавно затухает поверх новой живой сцены.
// Это даёт устойчивость к быстрым повторным переключениям (нет мерцания, нет
// накопления слоёв, нет лишних циклов) и корректное состояние обеих сцен.
//
// Безопасность:
//   • desktop-only: на mobile движок возвращает no-op и НЕ создаёт canvas/цикл;
//   • prefers-reduced-motion: рисуется один статичный кадр, rAF не запускается;
//   • скрытая вкладка / отключённый canvas: кадры пропускаются;
//   • stop() отменяет rAF и снимает dev-хук.
//
// Цвета берутся из единого источника метаданных морфологий (`MORPHOLOGIES`).

import { MORPHOLOGIES } from '#lib/data/dna.js';
import { createAudioMetrics, type AudioMetrics } from '#lib/audio/metrics.js';

export type AtmosphereMorphology = 'star' | 'bloom' | 'crystal' | 'pulse' | 'spiral' | 'void';

export interface AtmosphereParams {
	morphology: AtmosphereMorphology;
	/** общая интенсивность свечения (1 = базово) */
	intensity: number;
	/** множитель скорости движения (1 = базово) */
	motion: number;
}

export interface AtmosphereSnapshot {
	supported: boolean;
	running: boolean;
	mode: AtmosphereMorphology;
	blend: number;
	frames: number;
	fps: number;
	dpr: number;
	width: number;
	height: number;
	reduced: boolean;
	/** сглаженные музыкальные метрики (нули без воспроизведения) */
	metrics: AudioMetrics;
	audioAttached: boolean;
}

type RGB = [number, number, number];

const TARGET_FPS = 30;
const FRAME_MS = 1000 / TARGET_FPS;
const MAX_DPR = 1.5;
const BLEND_MS = 1200;
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ helpers
function clamp(v: number, a: number, b: number): number {
	return v < a ? a : v > b ? b : v;
}

function mulberry32(seed: number): () => number {
	return function () {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function hexToRgb(hex: string): RGB {
	const s = hex.replace('#', '');
	return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

function rgba(c: RGB, a: number): string {
	return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${clamp(a, 0, 1).toFixed(3)})`;
}

/** Мягкий объёмный спрайт (радиальное свечение). */
function makeGlow(c: RGB, size = 256, core = 1): HTMLCanvasElement {
	const cv = document.createElement('canvas');
	cv.width = size;
	cv.height = size;
	const g = cv.getContext('2d');
	if (g) {
		const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
		grad.addColorStop(0, rgba(c, core));
		grad.addColorStop(0.22, rgba(c, core * 0.5));
		grad.addColorStop(0.52, rgba(c, core * 0.16));
		grad.addColorStop(0.78, rgba(c, core * 0.04));
		grad.addColorStop(1, rgba(c, 0));
		g.fillStyle = grad;
		g.fillRect(0, 0, size, size);
	}
	return cv;
}

/** Компактная светящаяся точка (пыль, нити, потоки). */
function makeDot(c: RGB, size = 48, core = 1): HTMLCanvasElement {
	const cv = document.createElement('canvas');
	cv.width = size;
	cv.height = size;
	const g = cv.getContext('2d');
	if (g) {
		const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
		grad.addColorStop(0, rgba(c, core));
		grad.addColorStop(0.4, rgba(c, core * 0.5));
		grad.addColorStop(1, rgba(c, 0));
		g.fillStyle = grad;
		g.fillRect(0, 0, size, size);
	}
	return cv;
}

/** Мягкое кольцо (аннулус) — для концентрических полей Pulse. */
function makeRing(c: RGB, size = 256): HTMLCanvasElement {
	const cv = document.createElement('canvas');
	cv.width = size;
	cv.height = size;
	const g = cv.getContext('2d');
	if (g) {
		const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
		grad.addColorStop(0, rgba(c, 0));
		grad.addColorStop(0.62, rgba(c, 0));
		grad.addColorStop(0.8, rgba(c, 0.85));
		grad.addColorStop(0.9, rgba(c, 0.22));
		grad.addColorStop(1, rgba(c, 0));
		g.fillStyle = grad;
		g.fillRect(0, 0, size, size);
	}
	return cv;
}

// ------------------------------------------------------------------ scene data
interface Blob {
	ox: number; oy: number; r: number; ax: number; ay: number;
	sx: number; sy: number; bs: number; ph: number; a: number; color: number;
}
interface Filament {
	ang: number; curl: number; reach: number; n: number; a: number; ph: number; color: number;
}
interface Petal {
	ang: number; sway: number; len: number; wide: number; open: number; ph: number; color: number;
}
interface Mote {
	x: number; y: number; z: number; ph: number; tw: number; size: number;
}
interface Facet {
	x: number; y: number; r: number; sides: number; rot: number; rotSpeed: number; a: number; ph: number; color: number;
}
interface Ring {
	r0: number; r1: number; speed: number; width: number; a: number; phase: number; color: number;
}
interface Arm {
	ang0: number; turns: number; r0: number; r1: number; width: number; speed: number; a: number; color: number; dots: number;
}

interface Scene {
	blobs: Blob[];
	filaments: Filament[];
	petals: Petal[];
	motes: Mote[];
	facets: Facet[];
	rings: Ring[];
	arms: Arm[];
	bg: [RGB, RGB, RGB];
	accent: RGB;
}

function buildScene(mode: AtmosphereMorphology): Scene {
	const rnd = mulberry32(
		mode === 'star' ? 0x51a2 : mode === 'bloom' ? 0xb100 : mode === 'crystal' ? 0xc7c1 : mode === 'pulse' ? 0x9015 : mode === 'spiral' ? 0x7373 : 0x8c72
	);
	const accent = hexToRgb(MORPHOLOGIES[mode].color);
	const blobs: Blob[] = [];
	const filaments: Filament[] = [];
	const petals: Petal[] = [];
	const motes: Mote[] = [];
	const facets: Facet[] = [];
	const rings: Ring[] = [];
	const arms: Arm[] = [];

	const addBlobs = (n: number, cols: number, aMin: number, aMax: number, spread: number) => {
		for (let i = 0; i < n; i++) {
			blobs.push({
				ox: (rnd() - 0.5) * spread,
				oy: (rnd() - 0.5) * spread * 0.85,
				r: 0.5 + rnd() * 0.62,
				ax: 0.025 + rnd() * 0.06,
				ay: 0.02 + rnd() * 0.05,
				sx: 0.015 + rnd() * 0.05,
				sy: 0.015 + rnd() * 0.05,
				bs: 0.03 + rnd() * 0.06,
				ph: rnd() * TAU,
				a: aMin + rnd() * (aMax - aMin),
				color: Math.floor(rnd() * cols)
			});
		}
	};
	const addMotes = (n: number, zMin: number, zMax: number, twMin: number, twMax: number) => {
		for (let i = 0; i < n; i++) {
			motes.push({ x: rnd(), y: rnd(), z: zMin + rnd() * (zMax - zMin), ph: rnd() * TAU, tw: twMin + rnd() * (twMax - twMin), size: 0.4 + rnd() * 1.1 });
		}
	};

	if (mode === 'star') {
		addBlobs(5, 5, 0.1, 0.22, 0.5);
		for (let i = 0; i < 7; i++) {
			filaments.push({ ang: (i / 7) * TAU + rnd() * 0.4, curl: (rnd() - 0.5) * 1.1, reach: 0.75 + rnd() * 0.5, n: 30 + Math.floor(rnd() * 14), a: 0.16 + rnd() * 0.14, ph: rnd() * TAU, color: rnd() < 0.5 ? 4 : 0 });
		}
		addMotes(150, 0.15, 1, 0.5, 2.2);
		return { blobs, filaments, petals, motes, facets, rings, arms, bg: [[10, 22, 48], [5, 9, 20], [2, 3, 9]], accent };
	}

	if (mode === 'bloom') {
		addBlobs(6, 5, 0.12, 0.25, 0.5);
		for (let i = 0; i < 8; i++) {
			petals.push({ ang: (i / 8) * TAU + rnd() * 0.2, sway: 0.06 + rnd() * 0.06, len: 0.42 + rnd() * 0.24, wide: 0.16 + rnd() * 0.08, open: 0.18 + rnd() * 0.12, ph: rnd() * TAU, color: Math.floor(rnd() * 5) });
		}
		addMotes(70, 0.2, 1, 0.4, 1.4);
		return { blobs, filaments, petals, motes, facets, rings, arms, bg: [[36, 18, 34], [18, 8, 18], [8, 3, 9]], accent };
	}

	if (mode === 'crystal') {
		// преломляющие объёмы + прозрачные грани
		addBlobs(3, 4, 0.06, 0.12, 0.6);
		for (let i = 0; i < 14; i++) {
			const far = rnd();
			facets.push({
				x: (rnd() - 0.5) * 0.72,
				y: (rnd() - 0.5) * 0.6,
				r: 0.08 + far * 0.26,
				sides: rnd() < 0.5 ? 6 : (rnd() < 0.5 ? 3 : 5),
				rot: rnd() * TAU,
				rotSpeed: (rnd() - 0.5) * 0.05,
				a: 0.05 + (1 - far) * 0.12,
				ph: rnd() * TAU,
				color: Math.floor(rnd() * 5)
			});
		}
		addMotes(60, 0.2, 1, 0.6, 1.8);
		return { blobs, filaments, petals, motes, facets, rings, arms, bg: [[16, 18, 44], [8, 8, 24], [3, 3, 11]], accent };
	}

	if (mode === 'pulse') {
		addBlobs(2, 4, 0.08, 0.14, 0.4);
		for (let i = 0; i < 7; i++) {
			rings.push({ r0: 0.05, r1: 0.62 + rnd() * 0.16, speed: 0.09 + rnd() * 0.05, width: 0.02 + rnd() * 0.02, a: 0.16 + rnd() * 0.16, phase: rnd(), color: Math.floor(rnd() * 5) });
		}
		addMotes(60, 0.15, 1, 0.8, 2.4);
		return { blobs, filaments, petals, motes, facets, rings, arms, bg: [[44, 14, 32], [20, 6, 16], [7, 2, 7]], accent };
	}

	if (mode === 'spiral') {
		addBlobs(2, 4, 0.07, 0.13, 0.45);
		for (let i = 0; i < 3; i++) {
			arms.push({
				ang0: (i / 3) * TAU + rnd() * 0.5,
				turns: 0.85 + rnd() * 0.5,
				r0: 0.06,
				r1: 0.6 + rnd() * 0.16,
				width: 0.02 + rnd() * 0.015,
				speed: 0.05 + rnd() * 0.05,
				a: 0.16 + rnd() * 0.12,
				color: Math.floor(rnd() * 5),
				dots: 60 + Math.floor(rnd() * 30)
			});
		}
		addMotes(55, 0.2, 1, 0.5, 1.6);
		return { blobs, filaments, petals, motes, facets, rings, arms, bg: [[10, 34, 36], [5, 16, 18], [2, 6, 8]], accent };
	}

	// void — глубина и контраст, а не количество свечения
	addBlobs(4, 5, 0.06, 0.11, 1.0);
	addMotes(70, 0.2, 1, 0.15, 0.6);
	return { blobs, filaments, petals, motes, facets, rings, arms, bg: [[14, 10, 32], [6, 4, 16], [2, 1, 6]], accent };
}

const SPRITE_COLORS: Record<AtmosphereMorphology, RGB[]> = {
	star: [hexToRgb(MORPHOLOGIES.star.color), [47, 111, 176], [74, 63, 150], [31, 122, 140], [150, 200, 255]],
	bloom: [hexToRgb(MORPHOLOGIES.bloom.color), [255, 158, 107], [255, 217, 168], [224, 140, 255], [255, 143, 176]],
	crystal: [hexToRgb(MORPHOLOGIES.crystal.color), [200, 216, 255], [140, 170, 255], [120, 230, 240], [232, 236, 255]],
	pulse: [hexToRgb(MORPHOLOGIES.pulse.color), [255, 122, 92], [255, 182, 200], [255, 92, 142], [255, 220, 180]],
	spiral: [hexToRgb(MORPHOLOGIES.spiral.color), [90, 200, 255], [120, 255, 220], [60, 140, 200], [200, 255, 245]],
	void: [hexToRgb(MORPHOLOGIES.void.color), [92, 72, 160], [60, 50, 120], [122, 100, 200], [180, 170, 230]]
};

const CORE_COLORS: Record<AtmosphereMorphology, RGB> = {
	star: [230, 242, 255],
	bloom: [255, 240, 216],
	crystal: [236, 240, 255],
	pulse: [255, 212, 226],
	spiral: [216, 255, 245],
	void: [150, 140, 210]
};

// ------------------------------------------------------------------ engine
export function createAtmosphere(canvas: HTMLCanvasElement, initial: AtmosphereParams) {
	const mobile =
		typeof window !== 'undefined' &&
		((window.matchMedia && window.matchMedia('(max-width: 640px)').matches) ||
			Math.min(window.innerWidth, window.innerHeight) < 520);
	const reduced =
		typeof window !== 'undefined' && !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

	const maybeCtx = mobile ? null : canvas.getContext('2d', { alpha: false });

	if (!maybeCtx) {
		return {
			start() {},
			stop() {},
			resize() {},
			setParams(_p: AtmosphereParams) {},
			setActive(_a: boolean) {},
			snapshot: (): AtmosphereSnapshot => ({
				supported: false, running: false, mode: initial.morphology, blend: 1,
				frames: 0, fps: 0, dpr: 1, width: 0, height: 0, reduced,
				metrics: { sub: 0, bass: 0, lowMid: 0, mid: 0, high: 0, treble: 0, energy: 0, beat: 0, wave: 0 },
				audioAttached: false
			})
		};
	}
	// Явный non-null: сужение TS не сохраняется во вложенных функциях.
	const ctx: CanvasRenderingContext2D = maybeCtx;

	// Общий ридер музыкальных метрик (тот же AnalyserNode, без второго контекста).
	const metrics = createAudioMetrics();
	let flowTime = 0; // накопленная фаза потоков Spiral (без скачков скорости)
	let react: AudioMetrics = { sub: 0, bass: 0, lowMid: 0, mid: 0, high: 0, treble: 0, energy: 0, beat: 0, wave: 0 };

	const params: AtmosphereParams = { ...initial };
	let mode: AtmosphereMorphology = initial.morphology;
	let blend = 1;

	const scenes: Record<AtmosphereMorphology, Scene> = {
		star: buildScene('star'),
		bloom: buildScene('bloom'),
		crystal: buildScene('crystal'),
		pulse: buildScene('pulse'),
		spiral: buildScene('spiral'),
		void: buildScene('void')
	};

	const glow: Record<AtmosphereMorphology, HTMLCanvasElement[]> = { star: [], bloom: [], crystal: [], pulse: [], spiral: [], void: [] };
	const dot: Record<AtmosphereMorphology, HTMLCanvasElement[]> = { star: [], bloom: [], crystal: [], pulse: [], spiral: [], void: [] };
	const ringSprite: Record<AtmosphereMorphology, HTMLCanvasElement[]> = { star: [], bloom: [], crystal: [], pulse: [], spiral: [], void: [] };
	const coreSprite: Record<AtmosphereMorphology, HTMLCanvasElement> = {
		star: makeGlow(CORE_COLORS.star, 256, 1),
		bloom: makeGlow(CORE_COLORS.bloom, 256, 1),
		crystal: makeGlow(CORE_COLORS.crystal, 256, 1),
		pulse: makeGlow(CORE_COLORS.pulse, 256, 1),
		spiral: makeGlow(CORE_COLORS.spiral, 256, 1),
		void: makeGlow(CORE_COLORS.void, 256, 1)
	};
	for (const m of Object.keys(SPRITE_COLORS) as AtmosphereMorphology[]) {
		for (const c of SPRITE_COLORS[m]) {
			glow[m].push(makeGlow(c));
			dot[m].push(makeDot(c));
			ringSprite[m].push(makeRing(c));
		}
	}

	// offscreen-снимок для перехода между морфологиями
	let snap: HTMLCanvasElement | null = null;
	let snapCtx: CanvasRenderingContext2D | null = null;

	let w = 0;
	let h = 0;
	let dpr = 1;
	let rafId: number | null = null;
	let running = false;
	let paused = false; // внешняя пауза (например, открыт визуализатор)
	let hidden = false; // вкладка скрыта
	let visBound = false;
	let lastDraw = 0;
	let lastNow = 0;
	let time = 0;
	let frames = 0;
	let fps = 0;
	let fpsAcc = 0;
	let fpsCount = 0;
	let fpsAt = 0;

	function resize(): void {
		const cssW = Math.max(1, canvas.clientWidth);
		const cssH = Math.max(1, canvas.clientHeight);
		dpr = Math.min(window.devicePixelRatio || 1, reduced ? 1 : MAX_DPR);
		w = cssW;
		h = cssH;
		canvas.width = Math.round(cssW * dpr);
		canvas.height = Math.round(cssH * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		snap = null;
		snapCtx = null;
		// reduced-motion: canvas очищен ресайзом — перерисовываем статичный кадр.
		if (reduced && running) {
			time = 8;
			blend = 1;
			draw(0);
		}
	}

	function captureSnapshot(): void {
		if (!snap) {
			snap = document.createElement('canvas');
			snapCtx = snap.getContext('2d');
		}
		if (!snapCtx) return;
		if (snap.width !== canvas.width || snap.height !== canvas.height) {
			snap.width = canvas.width;
			snap.height = canvas.height;
		}
		snapCtx.clearRect(0, 0, snap.width, snap.height);
		snapCtx.drawImage(canvas, 0, 0);
	}

	function background(): void {
		const bg = scenes[mode].bg;
		const cx = w * 0.5;
		const cy = h * (mode === 'star' ? 0.42 : mode === 'void' ? 0.5 : 0.46);
		const r = Math.max(w, h) * 0.95;
		const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
		g.addColorStop(0, rgba(bg[0], 1));
		g.addColorStop(0.5, rgba(bg[1], 1));
		g.addColorStop(1, rgba(bg[2], 1));
		ctx.globalCompositeOperation = 'source-over';
		ctx.globalAlpha = 1;
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, w, h);
	}

	function drawBlobs(scene: Scene, m: AtmosphereMorphology, weight: number, t: number, cy: number, breathe: number): void {
		const cx = w * 0.5;
		const mm = Math.min(w, h);
		const inten = params.intensity;
		for (const b of scene.blobs) {
			const x = cx + Math.cos(t * b.sx + b.ph) * w * b.ax + b.ox * w;
			const y = cy + Math.sin(t * b.sy + b.ph * 1.3) * h * b.ay + b.oy * h;
			const sc = b.r * mm * (1 + 0.12 * Math.sin(t * b.bs + b.ph)) * breathe;
			ctx.globalAlpha = clamp(b.a * weight * inten * (1 + (breathe - 1) * 1.4), 0, 1);
			ctx.drawImage(glow[m][b.color], x - sc / 2, y - sc / 2, sc, sc);
		}
	}

	// ---------------------------------------------------------- Star
	function drawStar(scene: Scene, weight: number, t: number): void {
		const cx = w * 0.5;
		const cy = h * 0.42;
		const m = Math.min(w, h);
		const inten = params.intensity;
		const mo = params.motion;

		for (const f of scene.filaments) {
			const rot = t * 0.02 * mo + f.ph;
			// мягкое движение нитей: амплитуда волны растёт с энергией музыки
			const bendAmp = 0.04 + 0.06 * react.energy;
			const reachPulse = 1 + 0.05 * react.energy;
			for (let k = 0; k < f.n; k++) {
				const u = k / f.n;
				const r = m * (0.05 + u * 0.6) * f.reach * reachPulse;
				const ang = f.ang + rot + u * f.curl + Math.sin(u * Math.PI * 2 + t * 0.35 * mo + f.ph) * bendAmp;
				const x = cx + Math.cos(ang) * r;
				const y = cy + Math.sin(ang) * r * 0.92;
				const a = (1 - u) * (1 - u) * f.a * weight * inten * (1 + 0.5 * react.energy);
				const s = m * 0.032 * (1 - u * 0.55);
				ctx.globalAlpha = clamp(a, 0, 1);
				ctx.drawImage(dot.star[f.color], x - s / 2, y - s / 2, s, s);
			}
		}

		const pulse = 1 + 0.06 * Math.sin(t * 0.6);
		const core = m * 0.24 * pulse * (1 + 0.15 * react.energy + 0.12 * react.beat);
		ctx.globalAlpha = clamp(0.9 * weight * inten * (1 + 0.3 * react.energy), 0, 1);
		ctx.drawImage(coreSprite.star, cx - core / 2, cy - core / 2, core, core);
		ctx.globalAlpha = clamp(0.5 * weight * inten * (1 + 0.3 * react.energy), 0, 1);
		ctx.drawImage(coreSprite.star, cx - core * 1.7 / 2, cy - core * 1.7 / 2, core * 1.7, core * 1.7);

		ctx.globalCompositeOperation = 'lighter';
		for (const d of scene.motes) {
			let x = (d.x + t * 0.006 * d.z * mo) % 1;
			if (x < 0) x += 1;
			const y = (d.y + Math.sin(t * 0.05 * mo + d.ph) * 0.012 + 1) % 1;
			const px = x * w;
			const py = y * h;
			const s = m * (0.004 + 0.012 * d.z);
			const twinkle = 0.55 + 0.45 * Math.sin(t * d.tw * mo + d.ph);
			ctx.globalAlpha = clamp((0.12 + 0.5 * d.z) * twinkle * weight * inten, 0, 1);
			ctx.drawImage(dot.star[4], px - s / 2, py - s / 2, s, s);
		}
	}

	// ---------------------------------------------------------- Bloom
	function drawBloom(scene: Scene, weight: number, t: number): void {
		const cx = w * 0.5;
		const cy = h * 0.46;
		const m = Math.min(w, h);
		const inten = params.intensity;
		const mo = params.motion;

		for (const p of scene.petals) {
			const open = p.open + 0.5 * (1 + Math.sin(t * 0.22 * mo + p.ph)) * 0.28 + 0.45 * react.energy;
			const ang = p.ang + Math.sin(t * 0.12 * mo + p.ph) * p.sway;
			const len = m * p.len * (0.7 + open);
			const wide = m * p.wide * (0.6 + open * 0.7);
			ctx.save();
			ctx.translate(cx, cy);
			ctx.rotate(ang);
			ctx.globalAlpha = clamp(0.18 * weight * inten * (1 + 0.45 * react.bass + 0.2 * react.energy), 0, 1);
			ctx.drawImage(glow.bloom[p.color], -wide / 2, -len, wide, len);
			ctx.globalAlpha = clamp(0.12 * weight * inten * (1 + 0.45 * react.bass + 0.2 * react.energy), 0, 1);
			ctx.drawImage(glow.bloom[p.color], -wide * 0.4, -len * 0.62, wide * 0.8, len * 0.62);
			ctx.restore();
		}

		const pulse = 1 + 0.1 * Math.sin(t * 0.4);
		const core = m * 0.3 * pulse * (1 + 0.2 * react.energy);
		ctx.globalAlpha = clamp(0.55 * weight * inten * (1 + 0.3 * react.energy), 0, 1);
		ctx.drawImage(coreSprite.bloom, cx - core / 2, cy - core / 2, core, core);

		ctx.globalCompositeOperation = 'lighter';
		for (const d of scene.motes) {
			const y = ((d.y - t * 0.01 * d.z * mo) % 1 + 1) % 1;
			const x = (d.x + Math.sin(t * 0.06 * mo + d.ph) * 0.02 + 1) % 1;
			const px = x * w;
			const py = y * h;
			const s = m * (0.005 + 0.012 * d.z);
			const twinkle = 0.6 + 0.4 * Math.sin(t * d.tw * mo + d.ph);
			ctx.globalAlpha = clamp((0.1 + 0.42 * d.z) * twinkle * weight * inten, 0, 1);
			ctx.drawImage(dot.bloom[3], px - s / 2, py - s / 2, s, s);
		}
	}

	// ---------------------------------------------------------- Crystal
	function drawCrystal(scene: Scene, weight: number, t: number): void {
		const cx = w * 0.5;
		const cy = h * 0.46;
		const m = Math.min(w, h);
		const inten = params.intensity;
		const mo = params.motion;
		const cols = SPRITE_COLORS.crystal;
		const edge: RGB = [224, 236, 255];
		const glow = clamp(0.5 * react.high + 0.5 * react.beat + 0.25 * react.energy, 0, 1);

		for (const f of scene.facets) {
			const ang = f.rot + t * f.rotSpeed * mo;
			const px = cx + f.x * w;
			const py = cy + f.y * h;
			const r = f.r * m * (1 + 0.05 * Math.sin(t * 0.3 * mo + f.ph));
			ctx.beginPath();
			for (let i = 0; i < f.sides; i++) {
				const a = ang + (i / f.sides) * TAU;
				const X = px + Math.cos(a) * r;
				const Y = py + Math.sin(a) * r * 0.96;
				if (i === 0) ctx.moveTo(X, Y);
				else ctx.lineTo(X, Y);
			}
			ctx.closePath();
			const g = ctx.createLinearGradient(px - r, py - r, px + r, py + r);
			g.addColorStop(0, rgba(cols[f.color], f.a * weight * inten));
			g.addColorStop(1, rgba(cols[(f.color + 2) % cols.length], f.a * 0.25 * weight * inten));
			ctx.globalAlpha = 1;
			ctx.fillStyle = g;
			ctx.fill();
			ctx.globalAlpha = clamp(f.a * 2.2 * weight * inten * (1 + 1.5 * glow), 0, 1);
			ctx.strokeStyle = rgba(edge, 0.6 + 0.25 * glow);
			ctx.lineWidth = 1 + 0.9 * glow;
			ctx.stroke();
			// блик на грани
			ctx.globalAlpha = clamp(f.a * 1.6 * weight * inten * (1 + 1.2 * glow), 0, 1);
			const gs = m * (0.02 + 0.012 * glow);
			ctx.drawImage(dot.crystal[(f.color + 4) % cols.length], px - gs / 2, py - gs / 2, gs, gs);
		}

		ctx.globalCompositeOperation = 'lighter';
		for (const d of scene.motes) {
			const y = ((d.y - t * 0.004 * d.z * mo) % 1 + 1) % 1;
			const x = (d.x + Math.sin(t * 0.04 * mo + d.ph) * 0.015 + 1) % 1;
			const px = x * w;
			const py = y * h;
			const s = m * (0.003 + 0.009 * d.z);
			const tw = 0.6 + 0.4 * Math.sin(t * d.tw * mo + d.ph);
			ctx.globalAlpha = clamp((0.1 + 0.4 * d.z) * tw * weight * inten, 0, 1);
			ctx.drawImage(dot.crystal[4], px - s / 2, py - s / 2, s, s);
		}
	}

	// ---------------------------------------------------------- Pulse
	function drawPulse(scene: Scene, weight: number, t: number): void {
		const cx = w * 0.5;
		const cy = h * 0.46;
		const m = Math.min(w, h);
		const inten = params.intensity;
		const mo = params.motion;

		ctx.globalCompositeOperation = 'lighter';
		for (const r of scene.rings) {
			const prog = ((t * r.speed * mo * (1 + 0.4 * react.energy) + r.phase) % 1 + 1) % 1;
			const radius = m * (r.r0 + (r.r1 - r.r0) * prog);
			const alpha = (1 - prog) * (1 - prog) * r.a * weight * inten * (1 + 0.7 * react.energy + 0.5 * react.beat);
			const size = (radius / 0.8) * 2 + m * r.width * 2;
			ctx.globalAlpha = clamp(alpha, 0, 1);
			ctx.drawImage(ringSprite.pulse[r.color], cx - size / 2, cy - size / 2, size, size);
		}

		const pulse = 1 + 0.14 * Math.sin(t * 0.9 * mo);
		const core = m * 0.2 * pulse * (1 + 0.25 * react.energy + 0.2 * react.beat);
		ctx.globalAlpha = clamp(0.5 * weight * inten * (1 + 0.5 * react.beat), 0, 1);
		ctx.drawImage(coreSprite.pulse, cx - core / 2, cy - core / 2, core, core);

		for (const d of scene.motes) {
			const x = (d.x + Math.sin(t * 0.08 * mo + d.ph) * 0.03 + 1) % 1;
			const y = (d.y + Math.cos(t * 0.06 * mo + d.ph) * 0.03 + 1) % 1;
			const px = x * w;
			const py = y * h;
			const s = m * (0.004 + 0.01 * d.z);
			const tw = 0.6 + 0.4 * Math.sin(t * d.tw * mo + d.ph);
			ctx.globalAlpha = clamp((0.1 + 0.4 * d.z) * tw * weight * inten, 0, 1);
			ctx.drawImage(dot.pulse[3], px - s / 2, py - s / 2, s, s);
		}
	}

	// ---------------------------------------------------------- Spiral
	function drawSpiral(scene: Scene, weight: number, t: number): void {
		const cx = w * 0.5;
		const cy = h * 0.46;
		const m = Math.min(w, h);
		const inten = params.intensity;
		const mo = params.motion;

		ctx.globalCompositeOperation = 'lighter';
		for (const arm of scene.arms) {
			const base = arm.ang0 + t * 0.05 * mo;
			for (let k = 0; k < arm.dots; k++) {
				const u = k / arm.dots;
				// Поток идёт по НАКОПЛЕННОЙ фазе (скорость плавно зависит от
				// сглаженной энергии) — нет множителя t×энергия, нет дрожания.
				const flow = flowTime * arm.speed * mo;
				const ang = base + u * arm.turns * TAU + flow;
				const r = m * (arm.r0 + (arm.r1 - arm.r0) * u);
				const x = cx + Math.cos(ang) * r;
				const y = cy + Math.sin(ang) * r * 0.9;
				const a = Math.sin(Math.PI * u) * arm.a * weight * inten * (1 + 0.6 * react.energy + 0.25 * react.mid);
				const s = m * arm.width * (0.6 + 0.9 * (1 - u));
				ctx.globalAlpha = clamp(a, 0, 1);
				ctx.drawImage(dot.spiral[arm.color], x - s / 2, y - s / 2, s, s);
			}
		}

		const pulse = 1 + 0.08 * Math.sin(t * 0.5 * mo);
		const core = m * 0.24 * pulse * (1 + 0.3 * react.energy + 0.2 * react.beat);
		ctx.globalAlpha = clamp(0.45 * weight * inten * (1 + 0.45 * react.energy), 0, 1);
		ctx.drawImage(coreSprite.spiral, cx - core / 2, cy - core / 2, core, core);

		for (const d of scene.motes) {
			const ang = d.ph + t * 0.01 * d.z * mo;
			const r = m * (0.1 + d.z * 0.55);
			const x = cx + Math.cos(ang) * r;
			const y = cy + Math.sin(ang) * r * 0.9;
			const s = m * (0.003 + 0.009 * d.z);
			const tw = 0.6 + 0.4 * Math.sin(t * d.tw * mo + d.ph);
			ctx.globalAlpha = clamp((0.08 + 0.34 * d.z) * tw * weight * inten, 0, 1);
			ctx.drawImage(dot.spiral[3], x - s / 2, y - s / 2, s, s);
		}
	}

	// ---------------------------------------------------------- Void
	function drawVoid(scene: Scene, weight: number, t: number): void {
		const cx = w * 0.5;
		const cy = h * 0.5;
		const m = Math.min(w, h);
		const inten = params.intensity;
		const mo = params.motion;

		// редкие далёкие свечения по краям (blobs рисует drawBlobs)
		// тонкая далёкая орбита
		ctx.globalCompositeOperation = 'lighter';
		const orbitR = m * (0.34 + 0.02 * Math.sin(t * 0.1 * mo));
		const osize = (orbitR / 0.8) * 2;
		ctx.globalAlpha = clamp(0.17 * weight * inten * (1 + 0.3 * react.energy), 0, 1);
		ctx.drawImage(ringSprite.void[4], cx - osize / 2, cy - osize / 2, osize, osize);

		// редкие далёкие звёзды
		for (const d of scene.motes) {
			let x = (d.x + t * 0.002 * d.z * mo) % 1;
			if (x < 0) x += 1;
			const y = (d.y + Math.sin(t * 0.02 * mo + d.ph) * 0.008 + 1) % 1;
			const px = x * w;
			const py = y * h;
			const s = m * (0.002 + 0.006 * d.z);
			const tw = 0.4 + 0.6 * Math.sin(t * d.tw * mo + d.ph);
			ctx.globalAlpha = clamp((0.06 + 0.32 * d.z) * tw * weight * inten * (1 + 0.4 * react.high), 0, 1);
			ctx.drawImage(dot.void[4], px - s / 2, py - s / 2, s, s);
		}

		// тёмный портал в центре — глубина и контраст
		ctx.globalCompositeOperation = 'source-over';
		const hole = m * (0.5 + 0.04 * Math.sin(t * 0.15 * mo));
		const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, hole);
		g.addColorStop(0, 'rgba(2,1,6,0.9)');
		g.addColorStop(0.55, 'rgba(3,2,9,0.5)');
		g.addColorStop(1, 'rgba(4,2,10,0)');
		ctx.globalAlpha = clamp(weight, 0, 1);
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(cx, cy, hole, 0, TAU);
		ctx.fill();

		// центральный импульс: тёмный в покое, заметный на энергии и всплесках
		ctx.globalCompositeOperation = 'lighter';
		const glow = clamp(0.25 * react.energy + 0.95 * react.beat, 0, 1);
		const core = m * 0.16 * (1 + 0.06 * Math.sin(t * 0.4 * mo)) * (1 + 0.6 * glow);
		ctx.globalAlpha = clamp(0.15 * weight * inten * (1 + 1.8 * glow), 0, 1);
		ctx.drawImage(coreSprite.void, cx - core / 2, cy - core / 2, core, core);
		// мягкий ореол только на всплесках — центр не заливается постоянно
		const halo = core * 2.3;
		ctx.globalAlpha = clamp(0.55 * glow * weight * inten, 0, 1);
		ctx.drawImage(coreSprite.void, cx - halo / 2, cy - halo / 2, halo, halo);
	}

	function drawScene(m: AtmosphereMorphology, weight: number, t: number): void {
		const scene = scenes[m];
		const cy = h * (m === 'star' ? 0.42 : m === 'void' ? 0.5 : 0.46);
		ctx.globalCompositeOperation = 'lighter';
		// облака «дышат» на музыку только у Bloom (у остальных — базовый масштаб)
		const breathe = m === 'bloom' ? 1 + 0.18 * react.bass + 0.1 * react.energy : 1;
		drawBlobs(scene, m, weight, t, cy, breathe);
		if (m === 'star') drawStar(scene, weight, t);
		else if (m === 'bloom') drawBloom(scene, weight, t);
		else if (m === 'crystal') drawCrystal(scene, weight, t);
		else if (m === 'pulse') drawPulse(scene, weight, t);
		else if (m === 'spiral') drawSpiral(scene, weight, t);
		else drawVoid(scene, weight, t);
	}

	function draw(dt: number): void {
		time += dt;
		const t = time;
		background();
		drawScene(mode, 1, t);
		if (snap && blend < 1) {
			const e = blend * blend * (3 - 2 * blend); // smoothstep
			ctx.globalCompositeOperation = 'source-over';
			ctx.globalAlpha = clamp(1 - e, 0, 1);
			ctx.drawImage(snap, 0, 0, w, h);
			ctx.globalAlpha = 1;
		}
		ctx.globalCompositeOperation = 'source-over';
		ctx.globalAlpha = 1;
		frames++;
	}

	function shouldRun(): boolean {
		return running && !reduced && !paused && !hidden;
	}

	function ensureLoop(): void {
		if (shouldRun() && rafId == null) {
			lastNow = 0;
			lastDraw = 0;
			rafId = requestAnimationFrame(loop);
		}
	}

	function haltLoop(): void {
		if (rafId != null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
	}

	function onVisibility(): void {
		hidden = document.hidden;
		if (hidden) haltLoop();
		else ensureLoop();
	}

	function loop(now: number): void {
		// Самоостановка: цикл не продолжается на скрытой вкладке / отключённом canvas.
		if (!canvas.isConnected || document.hidden) {
			hidden = document.hidden;
			lastNow = now;
			rafId = null;
			return;
		}
		if (now - lastDraw >= FRAME_MS - 1) {
			const dt = lastNow ? Math.min(0.06, (now - lastNow) / 1000) : 0.016;
			lastNow = now;
			lastDraw = now;
			react = metrics.sample(dt);
			// Накопление фазы потоков Spiral: скорость меняется плавно через
			// сглаженную энергию (без множителя на абсолютное время).
			flowTime += (1 + 0.35 * react.energy) * dt;
			if (blend < 1) blend = Math.min(1, blend + dt * (1000 / BLEND_MS));
			if (blend >= 1 && snap) {
				snap = null;
				snapCtx = null;
			}
			draw(dt);

			fpsAcc += dt;
			fpsCount++;
			if (now - fpsAt > 1000) {
				fps = fpsCount / Math.max(0.001, fpsAcc);
				fpsAcc = 0;
				fpsCount = 0;
				fpsAt = now;
			}
		}
		rafId = requestAnimationFrame(loop);
	}

	/** Внешняя пауза/возобновление без сброса состояния (кадр остаётся на canvas). */
	function setActive(active: boolean): void {
		paused = !active;
		if (paused) haltLoop();
		else {
			if (!reduced) metrics.attach();
			ensureLoop();
		}
	}

	function setParams(p: AtmosphereParams): void {
		params.intensity = p.intensity;
		params.motion = p.motion;
		if (p.morphology !== mode) {
			if (reduced) {
				// без анимации: сразу целевая сцена
				mode = p.morphology;
				blend = 1;
				time = 8;
				if (running) draw(0);
				return;
			}
			captureSnapshot();
			mode = p.morphology;
			blend = 0;
		}
	}

	function start(): void {
		resize();
		running = true;
		if (typeof window !== 'undefined') {
			(window as unknown as { __InfiniteTodayAtmosphere?: unknown }).__InfiniteTodayAtmosphere = {
				snapshot: () => snapshot()
			};
		}
		if (reduced) {
			time = 8;
			blend = 1;
			draw(0);
			return;
		}
		hidden = typeof document !== 'undefined' ? document.hidden : false;
		if (typeof document !== 'undefined' && !visBound) {
			document.addEventListener('visibilitychange', onVisibility);
			visBound = true;
		}
		metrics.attach();
		ensureLoop();
	}

	function stop(): void {
		running = false;
		haltLoop();
		metrics.detach();
		if (visBound && typeof document !== 'undefined') {
			document.removeEventListener('visibilitychange', onVisibility);
			visBound = false;
		}
		snap = null;
		snapCtx = null;
		if (typeof window !== 'undefined') {
			delete (window as unknown as { __InfiniteTodayAtmosphere?: unknown }).__InfiniteTodayAtmosphere;
		}
	}

	function snapshot(): AtmosphereSnapshot {
		return {
			supported: true,
			running,
			mode,
			blend: +blend.toFixed(3),
			frames,
			fps: Math.round(fps),
			dpr: +dpr.toFixed(2),
			width: Math.round(w),
			height: Math.round(h),
			reduced,
			metrics: { ...react },
			audioAttached: metrics.snapshot().attached
		};
	}

	return { start, stop, resize, setParams, setActive, snapshot };
}
