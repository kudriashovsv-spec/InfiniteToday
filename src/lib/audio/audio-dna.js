// Audio DNA — «живой космический энергетический организм» поверх сцены песни.
//
// Порт production v1.1 (audio-dna.js): та же художественная модель и те же
// коэффициенты. Отличие ровно одно и архитектурно важное:
//   v1.1 создавала СВОЙ AudioContext + MediaElementSource + AnalyserNode;
//   здесь используется ЕДИНЫЙ граф проекта (graph.js) и общий AnalyserNode.
// Никакого собственного AudioContext, никакого второго MediaElementSource.
//
// Модель анализа (как в v1.1): fftSize 2048, smoothing 0.80,
// getByteFrequencyData + getByteTimeDomainData, 6 полос (sub/bass/lowMid/mid/
// high/treble), огибающие через экспоненциальное сглаживание, спектральный flux
// для onset-детекции и колец, а также waveform-амплитуда.
//
// Audio DNA не знает про Butterchurn: оба независимо подписаны на активный
// источник через playback.js, а аудио-граф — общий.

import { getAnalyser, getContext, getSource, tapAnalyser, untapAnalyser } from './graph.js';
import { getActiveAudio, subscribeActiveAudio } from './playback.js';

const TAU = Math.PI * 2;

// ------------------------------------------------- художественные настройки
const CONFIG = {
	coreScale: 0.3,
	corePulse: 0.08,
	coreBrightness: 0.68,
	orbitCount: 3,
	orbitOpacity: 0.5,
	cometCount: 1.4,
	cometSize: 1.3,
	cometSpeed: 1.0,
	cometTail: 1.25,
	filamentCount: 0.5,
	filamentOpacity: 0.5,
	filamentSpeed: 1.0,
	bloomStrength: 0.8,
	beatResponse: 0.7
};

const TIERS = [
	{ name: 'low', dust: 16, comets: 8, filaments: 8, orbitMax: 2, bloom: false, trailTau: 0.07, sampleN: 44, dpr: 1.25 },
	{ name: 'medium', dust: 28, comets: 12, filaments: 12, orbitMax: 3, bloom: true, trailTau: 0.1, sampleN: 60, dpr: 1.6 },
	{ name: 'high', dust: 42, comets: 20, filaments: 16, orbitMax: 4, bloom: true, trailTau: 0.13, sampleN: 76, dpr: 2.0 }
];
const MAX_DUST = TIERS[2].dust;
const MAX_COMETS = 36;
const MAX_FILAMENTS = TIERS[2].filaments;
const MAX_RINGS = 6;
const REACH = 1.28;

const PALETTE = {
	core: [170, 130, 245],
	shell: [110, 155, 255],
	accent: [220, 140, 235],
	warm: [255, 150, 95],
	spark: [240, 243, 255]
};

const FFT_SIZE = 2048;
const SMOOTHING = 0.8;

// ------------------------------------------------------------------ utils
/** @param {number} v @param {number} a @param {number} b */
function clamp(v, a, b) {
	return v < a ? a : v > b ? b : v;
}
/** @param {number} seed */
function mulberry32(seed) {
	return function () {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
/** @param {number[]} c @param {number} a */
function rgba(c, a) {
	const aa = a < 0 ? 0 : a > 1 ? 1 : a;
	return `rgba(${c[0]},${c[1]},${c[2]},${aa.toFixed(3)})`;
}
/** @param {number[]} a @param {number[]} b @param {number} t */
function mix(a, b, t) {
	return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
/** @param {number} px @param {number} py @param {{l:number,t:number,r:number,b:number}} r */
function distToRect(px, py, r) {
	const dx = Math.max(r.l - px, 0, px - r.r);
	const dy = Math.max(r.t - py, 0, py - r.b);
	return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Создаёт экземпляр Audio DNA для конкретного canvas.
 * Все browser-only действия выполняются внутри start().
 * @param {HTMLCanvasElement} canvas
 */
export function createAudioDNA(canvas) {
	const ctx = /** @type {CanvasRenderingContext2D | null} */ (canvas.getContext('2d', { alpha: true }));
	if (!ctx) {
		return {
			start() {},
			stop() {},
			resize() {},
			snapshot: () => ({ supported: false })
		};
	}

	const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
	const isMobile =
		(window.matchMedia && window.matchMedia('(max-width: 640px)').matches) ||
		Math.min(window.innerWidth, window.innerHeight) < 520;

	// --- анализ (общий analyser, без своего контекста) ---
	/** @type {AnalyserNode | null} */
	let analyser = null;
	let freq = /** @type {Uint8Array | null} */ (null);
	let time = /** @type {Uint8Array | null} */ (null);
	let spec = /** @type {Float32Array | null} */ (null);
	let prevSpec = /** @type {Float32Array | null} */ (null);

	// --- огибающие (как v1.1) ---
	const env = { sub: 0, bass: 0, lowMid: 0, mid: 0, high: 0, treble: 0, energy: 0, wave: 0 };
	let beat = 0;

	// --- onset ---
	let fluxMean = 0.012;
	let fluxDev = 0.012;
	let lastOnset = -1;
	let onsetCount = 0;
	let kickCount = 0;

	// --- время/фазы ---
	let t = 0;
	let corePhase = 0;
	let orbitPhase = 0;
	let filPhase = 0;
	let cometPhase = 0;
	let lastNow = 0;
	let lastDt = 0.016;

	// --- layout ---
	let cssW = 1;
	let cssH = 1;
	let dpr = 2;
	const layout = { cx: 300, cy: 200, baseR: 120, reach: 150, ok: true };
	let layoutDirty = true;
	let frameCount = 0;

	// --- bloom ---
	const glow = document.createElement('canvas');
	const gctx = /** @type {CanvasRenderingContext2D} */ (glow.getContext('2d'));
	const GLOW_DIV = 4;

	// --- adaptive quality ---
	const maxTier = reduced ? 0 : isMobile ? 1 : 2;
	let tier = reduced ? 0 : isMobile ? 0 : 2;
	const ftSamples = [];
	let ftIdx = 0;
	let lastTierChange = 0;
	let lastFpsCheck = 0;
	let fps = 60;

	// --- пулы (фиксированные, без мусора в кадре) ---
	const rnd = mulberry32(0x51ed270b);
	const dust = new Array(MAX_DUST);
	const comets = new Array(MAX_COMETS);
	const filaments = new Array(MAX_FILAMENTS);
	const rings = new Array(MAX_RINGS);
	let k;

	for (k = 0; k < MAX_DUST; k++) {
		const da = rnd() * TAU;
		const dr = 0.3 + Math.pow(rnd(), 0.9) * 1.0;
		dust[k] = {
			a: da,
			r: dr,
			z: rnd() * 2 - 1,
			va: (0.1 + 0.22 / dr) * (0.6 + 0.8 * rnd()),
			vr: (rnd() - 0.5) * 0.05,
			size: 0.5 + rnd() * 0.9,
			ph: rnd() * TAU,
			tw: 0.4 + rnd() * 1.1
		};
	}
	for (k = 0; k < MAX_COMETS; k++) {
		const ca = rnd() * TAU;
		const cr = 0.45 + Math.pow(rnd(), 0.8) * 0.75;
		comets[k] = {
			a: ca,
			r: cr,
			z: rnd() * 2 - 1,
			va: (0.3 + 0.55 / cr) * (0.75 + 0.5 * rnd()),
			vr: (rnd() - 0.5) * 0.09,
			size: 1.3 + rnd() * 2.0,
			ph: rnd() * TAU,
			sp: 0.7 + rnd() * 0.8
		};
	}
	for (k = 0; k < MAX_FILAMENTS; k++) {
		filaments[k] = {
			scale: 0.55 + rnd() * 0.62,
			tilt: rnd() * Math.PI,
			phase: rnd() * TAU,
			m: 2 + Math.floor(rnd() * 4),
			amp: 0.05 + rnd() * 0.09,
			depth: rnd(),
			speed: 0.6 + rnd() * 0.9,
			flat: 0.35 + rnd() * 0.5
		};
	}
	for (k = 0; k < MAX_RINGS; k++) rings[k] = { alive: false, r: 0, sp: 0, life: 0, max: 1, w: 1, warm: 0 };

	const activeDust = () => TIERS[tier].dust;
	const activeComets = () => (reduced ? 0 : Math.min(MAX_COMETS, Math.round(TIERS[tier].comets * CONFIG.cometCount)));
	const activeFilaments = () => (reduced ? Math.min(6, TIERS[tier].filaments) : Math.round(TIERS[tier].filaments * CONFIG.filamentCount));
	const activeOrbits = () => Math.min(CONFIG.orbitCount, TIERS[tier].orbitMax);

	// ---------------------------------------------------------------- layout
	function buildLayout() {
		const rect = canvas.getBoundingClientRect();
		cssW = Math.max(1, rect.width);
		cssH = Math.max(1, rect.height);
		if (cssW < 2 || cssH < 2) {
			layout.ok = false;
			return;
		}
		const screen = canvas.closest('.screen');
		const ox = rect.left;
		const oy = rect.top;

		let baseCx = cssW / 2;
		let baseCy = cssH / 2;
		const scene = screen && screen.querySelector('.scene');
		if (scene) {
			const sr = scene.getBoundingClientRect();
			if (sr.width > 2 && sr.height > 2) {
				baseCx = sr.left + sr.width / 2 - ox;
				baseCy = sr.top + sr.height / 2 - oy;
			}
		}

		const m = clamp(Math.min(cssW, cssH) * 0.03, 8, 36);
		/** @param {string} sel */
		function rectOf(sel) {
			const el = screen && screen.querySelector(sel);
			if (!el) return null;
			const st = getComputedStyle(el);
			if (st.display === 'none' || st.visibility === 'hidden') return null;
			const r = el.getBoundingClientRect();
			if (r.width < 2 || r.height < 2) return null;
			return { l: r.left - ox, t: r.top - oy, r: r.right - ox, b: r.bottom - oy };
		}
		const title = rectOf('.song-title');
		const others = [rectOf('.song-panel'), rectOf('.back'), rectOf('.lyrics-panel.is-open')].filter(Boolean);
		const allow = Math.min(cssW, cssH) * 0.1;

		const offsets = reduced ? [0, 0.05] : [0, 0.05, -0.05, 0.1, -0.1, 0.16];
		/** @type {{cx:number,cy:number,reach:number,score:number} | null} */
		let best = null;
		for (let oi = 0; oi < offsets.length; oi++) {
			const cy = clamp(baseCy + offsets[oi] * cssH, m, cssH - m);
			const cx = clamp(baseCx, m, cssW - m);
			const vp = Math.min(cx - m, cssW - cx - m, cy - m, cssH - cy - m);
			let ob = Infinity;
			if (title) ob = Math.min(ob, distToRect(cx, cy, title) - m * 0.25);
			for (let j = 0; j < others.length; j++) ob = Math.min(ob, distToRect(cx, cy, others[j]) - m * 0.25 + allow);
			const reach = Math.min(vp * 0.98, ob);
			const score = reach * (1 - 0.3 * Math.abs(offsets[oi]));
			if (!best || score > best.score) best = { cx, cy, reach, score };
		}

		const floorReach = Math.min(cssW, cssH) * 0.28;
		layout.reach = Math.max(best.reach, Math.min(floorReach, Math.min(cssW, cssH) * 0.5));
		layout.baseR = clamp(layout.reach / REACH, 0, Math.min(cssW, cssH) * 0.5);
		layout.cx = best.cx;
		layout.cy = best.cy;
		layout.ok = layout.baseR >= 26;

		dpr = Math.min(window.devicePixelRatio || 1, reduced ? 1 : TIERS[tier].dpr);
		canvas.width = Math.round(cssW * dpr);
		canvas.height = Math.round(cssH * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		glow.width = Math.max(1, Math.round(cssW / GLOW_DIV));
		glow.height = Math.max(1, Math.round(cssH / GLOW_DIV));
		layoutDirty = false;
	}

	// --------------------------------------------------------- audio wiring
	/** @type {MediaElementAudioSourceNode | null} */
	let tapped = null;

	function connectActive() {
		const audio = getActiveAudio();
		const node = audio ? getSource(audio) : null;
		if (node === tapped) return;
		untapAnalyser(tapped);
		tapped = node;
		tapAnalyser(tapped);
	}

	function setupAnalyser() {
		if (analyser) return;
		analyser = getAnalyser();
		if (!analyser) return;
		analyser.fftSize = FFT_SIZE;
		analyser.smoothingTimeConstant = SMOOTHING;
		freq = new Uint8Array(analyser.frequencyBinCount);
		time = new Uint8Array(analyser.fftSize);
		spec = new Float32Array(analyser.frequencyBinCount);
		prevSpec = new Float32Array(analyser.frequencyBinCount);
		connectActive();
	}

	/** @param {number} cur @param {number} target @param {number} atkTau @param {number} relTau @param {number} dt */
	function toward(cur, target, atkTau, relTau, dt) {
		const tau = target > cur ? atkTau : relTau;
		return cur + (target - cur) * (1 - Math.exp(-dt / tau));
	}

	/** @param {number} f0 @param {number} f1 */
	function bandAvg(f0, f1) {
		if (!analyser || !freq) return 0;
		const context = getContext();
		const nyq = (context ? context.sampleRate : 48000) / 2;
		const n = freq.length;
		const b0 = Math.max(0, Math.floor((f0 / nyq) * n));
		const b1 = Math.min(n - 1, Math.ceil((f1 / nyq) * n));
		let s = 0;
		let c = 0;
		for (let i = b0; i <= b1; i++) {
			s += freq[i];
			c++;
		}
		return c ? s / (c * 255) : 0;
	}

	/** @param {number} dt @param {number} now */
	function readAudio(dt, now) {
		const audio = getActiveAudio();
		if (!analyser || !freq || !time || !spec || !prevSpec || !audio || audio.paused || audio.ended) {
			for (const key in env) env[key] = toward(env[key], 0, 0.25, 0.6, dt);
			beat = toward(beat, 0, 0.9, 0.5, dt);
			return;
		}
		analyser.getByteFrequencyData(freq);
		analyser.getByteTimeDomainData(time);
		const sub = bandAvg(20, 60);
		const bass = bandAvg(60, 140);
		const lowMid = bandAvg(140, 400);
		const mid = bandAvg(400, 2000);
		const high = bandAvg(2000, 8000);
		const treble = bandAvg(8000, 16000);
		const energy = sub * 0.1 + bass * 0.28 + lowMid * 0.22 + mid * 0.22 + high * 0.13 + treble * 0.05;

		const n = freq.length;
		let s = 0;
		let i;
		for (i = 0; i < n; i++) {
			spec[i] = freq[i] / 255;
			s += spec[i];
		}
		let wave = 0;
		for (i = 0; i < time.length; i += 4) wave += Math.abs(time[i] - 128);
		wave = wave / (time.length / 4) / 128;

		let flux = 0;
		let lowFlux = 0;
		const lowEnd = Math.max(1, Math.floor(n * 0.06));
		for (i = 0; i < n; i++) {
			const d = spec[i] - prevSpec[i];
			if (d > 0) {
				flux += d;
				if (i < lowEnd) lowFlux += d;
			}
		}
		flux /= n;
		lowFlux /= lowEnd;

		env.sub = toward(env.sub, sub, 0.03, 0.2, dt);
		env.bass = toward(env.bass, bass, 0.04, 0.2, dt);
		env.lowMid = toward(env.lowMid, lowMid, 0.06, 0.24, dt);
		env.mid = toward(env.mid, mid, 0.07, 0.28, dt);
		env.high = toward(env.high, high, 0.07, 0.32, dt);
		env.treble = toward(env.treble, treble, 0.08, 0.36, dt);
		env.energy = toward(env.energy, clamp(energy, 0, 1), 0.08, 0.32, dt);
		env.wave = toward(env.wave, clamp(wave, 0, 1), 0.12, 0.36, dt);

		fluxMean += (flux - fluxMean) * 0.05;
		fluxDev += (Math.abs(flux - fluxMean) - fluxDev) * 0.05;
		const thr = fluxMean + Math.max(0.006, 1.9 * fluxDev);
		if (!reduced && flux > thr && now - lastOnset > 0.18) {
			const strong = lowFlux > Math.max(0.006, 1.4 * fluxMean);
			beat = Math.min(1, beat + (strong ? 0.85 : 0.5) * CONFIG.beatResponse);
			spawnRing(strong);
			lastOnset = now;
			onsetCount++;
			if (strong) kickCount++;
		}
		prevSpec.set(spec);
		void s;
	}

	/** @param {boolean} strong */
	function spawnRing(strong) {
		for (let i = 0; i < MAX_RINGS; i++) {
			if (!rings[i].alive) {
				rings[i].alive = true;
				rings[i].r = 0.42;
				rings[i].sp = strong ? 0.85 : 0.55;
				rings[i].life = 0;
				rings[i].max = strong ? 1.7 : 1.3;
				rings[i].w = strong ? 1.6 : 1.0;
				rings[i].warm = strong ? 0.6 : 0.2;
				return;
			}
		}
	}

	// ---------------------------------------------------------------- update
	/** @param {number} dt @param {number} now */
	function update(dt, now) {
		readAudio(dt, now);
		const audio = getActiveAudio();
		const active = !!audio && !audio.paused && analyser !== null;
		const speed = reduced ? 0.25 : active ? 1 : 0.4;

		beat = toward(beat, 0, 0.9, 0.5, dt);

		corePhase += dt * (0.25 + env.mid * 0.5) * speed;
		orbitPhase += dt * (0.1 + env.mid * 0.25) * speed;
		filPhase += dt * (0.35 + env.mid * 0.8) * speed;
		cometPhase += dt * (0.6 + env.bass * 1.2) * speed;
		t += dt * speed;

		const dn = activeDust();
		let i;
		for (i = 0; i < dn; i++) {
			const p = dust[i];
			p.a += p.va * dt * (0.5 + env.high * 1.2) * speed;
			p.r += p.vr * dt * speed + Math.sin(t * 0.6 + p.ph) * 0.015 * dt;
			if (p.r > 1.35) p.r = 0.35;
			if (p.r < 0.28) p.r = 0.28;
			p.z = Math.sin(t * 0.3 + p.ph + p.a * 0.2);
		}
		const cn = activeComets();
		for (i = 0; i < cn; i++) {
			const c = comets[i];
			c.a += c.va * dt * CONFIG.cometSpeed * (0.7 + env.bass * 0.9 + beat * 0.3) * speed;
			c.r += c.vr * dt * speed + Math.sin(t * 0.4 + c.ph) * 0.02 * dt + beat * 0.02 * dt;
			if (c.r > 1.3) c.r = 0.45 + (c.r - 1.3);
			if (c.r < 0.4) c.r = 0.4;
			c.z = Math.sin(t * 0.25 + c.ph + c.a * 0.3);
		}
		for (i = 0; i < MAX_RINGS; i++) {
			const r = rings[i];
			if (!r.alive) continue;
			r.life += dt;
			r.r += r.sp * dt;
			if (r.life >= r.max || r.r > REACH) r.alive = false;
		}
	}

	// ------------------------------------------------------------------ draw
	/** @param {number} cx @param {number} cy @param {number} baseR */
	function drawOrbits(cx, cy, baseR) {
		const n = activeOrbits();
		for (let i = 0; i < n; i++) {
			const depth = 1 - i * 0.16;
			const incl = 0.3 + i * 0.34 + Math.sin(orbitPhase * 0.6 + i * 1.7) * 0.05;
			const rot = orbitPhase * (0.3 + i * 0.19) + i * 1.7;
			const offX = Math.sin(i * 2.1 + 0.6) * baseR * 0.1;
			const offY = Math.cos(i * 1.7) * baseR * 0.08;
			const rx = baseR * (0.62 + i * 0.16) * (1 + env.bass * 0.07 + beat * 0.02);
			const ry = rx * (0.3 + 0.15 * i) * (1 + env.mid * 0.12);
			const alpha = CONFIG.orbitOpacity * (0.13 - i * 0.02) * depth * (0.7 + env.energy * 0.6);
			ctx.save();
			ctx.translate(cx + offX, cy + offY);
			ctx.rotate(incl * 0.45 + Math.sin(rot * 0.4) * 0.03);
			ctx.strokeStyle = rgba(mix(PALETTE.shell, PALETTE.core, i / n), alpha);
			ctx.lineWidth = 0.7 + env.mid * 0.4;
			ctx.beginPath();
			ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI);
			ctx.stroke();
			ctx.strokeStyle = rgba(PALETTE.shell, alpha * 0.32);
			ctx.beginPath();
			ctx.ellipse(0, 0, rx, ry, 0, Math.PI, TAU);
			ctx.stroke();
			const na = rot;
			const nx = Math.cos(na) * rx;
			const ny = Math.sin(na) * ry;
			ctx.fillStyle = rgba(PALETTE.spark, 0.14 + env.energy * 0.16);
			ctx.beginPath();
			ctx.arc(nx, ny, 0.8 + env.high * 1.0, 0, TAU);
			ctx.fill();
			ctx.restore();
		}
	}

	/** @param {number} cx @param {number} cy @param {number} baseR */
	function drawFilaments(cx, cy, baseR) {
		const n = activeFilaments();
		for (let i = 0; i < n; i++) {
			const f = filaments[i];
			const scale = f.scale * (1 - env.bass * 0.05 * f.depth) + beat * 0.01;
			const rr = baseR * scale;
			ctx.save();
			ctx.translate(cx, cy);
			ctx.rotate(f.tilt + Math.sin(filPhase * 0.3 * f.speed + i) * 0.05);
			ctx.beginPath();
			const steps = 32;
			const span = TAU * 0.6;
			for (let j = 0; j <= steps; j++) {
				const th = (j / steps) * span - span * 0.5;
				const r = rr * (1 + f.amp * Math.sin(f.m * th + f.phase + filPhase * f.speed) + env.mid * 0.05 * Math.sin(2 * th - filPhase * 0.7 + i));
				const x = Math.cos(th) * r;
				const y = Math.sin(th) * r * f.flat;
				if (j === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
			const a = CONFIG.filamentOpacity * (0.06 + 0.11 * f.depth) * (0.6 + env.mid * 0.6) * (0.7 + beat * 0.5);
			ctx.strokeStyle = rgba(mix(PALETTE.shell, PALETTE.core, f.depth), Math.min(0.22, a));
			ctx.lineWidth = 0.6 + f.depth * 0.5 + env.mid * 0.4;
			ctx.stroke();
			ctx.restore();
		}
	}

	/** @param {number} cx @param {number} cy @param {number} baseR */
	function drawCore(cx, cy, baseR) {
		const coreR = baseR * CONFIG.coreScale * (1 + env.bass * CONFIG.corePulse + Math.sin(corePhase) * 0.012 + beat * 0.04);
		const d1 = env.mid * 0.1;
		const d2 = env.bass * 0.06;
		const d3 = env.wave * 0.035;
		ctx.save();
		ctx.translate(cx, cy);

		const halo = ctx.createRadialGradient(0, 0, coreR * 0.2, 0, 0, coreR * 2.4);
		halo.addColorStop(0, rgba(PALETTE.core, (0.11 + env.energy * 0.07) * CONFIG.coreBrightness));
		halo.addColorStop(0.5, rgba(PALETTE.shell, 0.05 + env.bass * 0.04));
		halo.addColorStop(1, 'rgba(0,0,0,0)');
		ctx.fillStyle = halo;
		ctx.beginPath();
		ctx.arc(0, 0, coreR * 2.4, 0, TAU);
		ctx.fill();

		for (let layer = 0; layer < 2; layer++) {
			const lr = coreR * (1 - layer * 0.28);
			const N = TIERS[tier].sampleN;
			ctx.beginPath();
			for (let j = 0; j <= N; j++) {
				const th = (j / N) * TAU;
				const rr =
					lr *
					(1 +
						d1 * Math.sin(2 * th + corePhase + layer) +
						d2 * Math.sin(3 * th - corePhase * 0.7) +
						d3 * Math.sin(5 * th + corePhase * 1.2 + layer));
				const x = Math.cos(th) * rr;
				const y = Math.sin(th) * rr * 0.97;
				if (j === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
			ctx.closePath();
			const g = ctx.createRadialGradient(0, 0, lr * 0.1, 0, 0, lr * 1.5);
			g.addColorStop(0, rgba(mix(PALETTE.core, PALETTE.spark, env.high * 0.25), (0.13 - layer * 0.05) * CONFIG.coreBrightness + env.energy * 0.05));
			g.addColorStop(0.6, rgba(PALETTE.shell, 0.05 - layer * 0.015));
			g.addColorStop(1, 'rgba(0,0,0,0)');
			ctx.fillStyle = g;
			ctx.fill();
			ctx.strokeStyle = rgba(mix(PALETTE.core, PALETTE.spark, env.high * 0.3), 0.08 + env.mid * 0.12 - layer * 0.03);
			ctx.lineWidth = 0.8 + env.mid * 0.5 - layer * 0.2;
			ctx.stroke();
		}

		const ng = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR * 0.75);
		ng.addColorStop(0, rgba(mix(PALETTE.core, PALETTE.spark, 0.22), (0.15 + env.bass * 0.12 + beat * 0.07) * CONFIG.coreBrightness));
		ng.addColorStop(0.5, rgba(PALETTE.core, 0.1 + env.energy * 0.08));
		ng.addColorStop(1, 'rgba(0,0,0,0)');
		ctx.fillStyle = ng;
		ctx.beginPath();
		ctx.arc(0, 0, coreR * 0.75, 0, TAU);
		ctx.fill();
		ctx.restore();
	}

	/** @param {number} cx @param {number} cy @param {number} baseR */
	function drawDust(cx, cy, baseR) {
		const n = activeDust();
		for (let i = 0; i < n; i++) {
			const p = dust[i];
			const rr = baseR * p.r * (1 + env.bass * 0.05);
			const x = cx + Math.cos(p.a) * rr;
			const y = cy + Math.sin(p.a) * rr * 0.9 + p.z * baseR * 0.08;
			const depth = (p.z + 1) * 0.5;
			const tw = 0.5 + 0.5 * Math.sin(t * (0.5 + p.tw) + p.ph);
			const size = p.size * (0.5 + 0.8 * depth) * (1 + env.high * 0.5);
			const alpha = (0.08 + 0.22 * depth) * (0.55 + 0.45 * tw) * (0.6 + env.energy * 0.6);
			ctx.fillStyle = rgba(mix(PALETTE.shell, PALETTE.spark, 0.4 + tw * 0.5), alpha);
			ctx.beginPath();
			ctx.arc(x, y, size, 0, TAU);
			ctx.fill();
		}
	}

	/** @param {number} cx @param {number} cy @param {number} baseR */
	function drawComets(cx, cy, baseR) {
		const n = activeComets();
		for (let i = 0; i < n; i++) {
			const c = comets[i];
			const rr = baseR * c.r * (1 + env.bass * 0.05);
			const ang = c.a;
			const x = cx + Math.cos(ang) * rr;
			const y = cy + Math.sin(ang) * rr * 0.9 + c.z * baseR * 0.1;
			const depth = (c.z + 1) * 0.5;
			const size = c.size * CONFIG.cometSize * (0.6 + 0.8 * depth);
			const tx = -Math.sin(ang);
			const ty = Math.cos(ang) * 0.9;
			const px = -ty;
			const py = tx;
			const tailLen = size * (5.0 + env.high * 8 + beat * 4) * CONFIG.cometTail * c.sp;
			const warm = env.energy > 0.72 && c.size > 2.8 ? 0.35 : 0.0;
			const w0 = size * 0.85;

			const g = ctx.createLinearGradient(x, y, x - tx * tailLen, y - ty * tailLen);
			g.addColorStop(0, rgba(mix(PALETTE.spark, PALETTE.warm, warm), 0.26 * (0.6 + depth * 0.5)));
			g.addColorStop(0.5, rgba(mix(PALETTE.shell, PALETTE.warm, warm * 0.5), 0.1));
			g.addColorStop(1, 'rgba(0,0,0,0)');
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.moveTo(x + px * w0, y + py * w0);
			ctx.lineTo(x - px * w0, y - py * w0);
			ctx.lineTo(x - tx * tailLen, y - ty * tailLen);
			ctx.closePath();
			ctx.fill();

			ctx.fillStyle = rgba(mix(PALETTE.spark, PALETTE.accent, 0.3 + depth * 0.3), 0.4 + 0.4 * depth);
			ctx.beginPath();
			ctx.arc(x, y, size * 0.8, 0, TAU);
			ctx.fill();
		}
	}

	/** @param {number} cx @param {number} cy @param {number} baseR */
	function drawRings(cx, cy, baseR) {
		for (let i = 0; i < MAX_RINGS; i++) {
			const r = rings[i];
			if (!r.alive) continue;
			const ln = r.life / r.max;
			ctx.strokeStyle = rgba(mix(PALETTE.shell, PALETTE.warm, r.warm), (1 - ln) * 0.22 * (0.6 + env.energy * 0.5));
			ctx.lineWidth = r.w * (1 - ln * 0.6);
			ctx.beginPath();
			ctx.ellipse(cx, cy, baseR * r.r, baseR * r.r * 0.92, 0, 0, TAU);
			ctx.stroke();
		}
	}

	/** @param {number} cx @param {number} cy @param {number} baseR */
	function drawGlow(cx, cy, baseR) {
		gctx.setTransform(1, 0, 0, 1, 0, 0);
		gctx.clearRect(0, 0, glow.width, glow.height);
		gctx.save();
		gctx.scale(1 / GLOW_DIV, 1 / GLOW_DIV);
		const coreR = baseR * CONFIG.coreScale * (1 + env.bass * CONFIG.corePulse + beat * 0.04);
		const g = gctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2.6);
		g.addColorStop(0, rgba(PALETTE.core, (0.3 + env.bass * 0.18) * CONFIG.coreBrightness));
		g.addColorStop(0.5, rgba(PALETTE.shell, 0.12));
		g.addColorStop(1, 'rgba(0,0,0,0)');
		gctx.fillStyle = g;
		gctx.beginPath();
		gctx.arc(cx, cy, coreR * 2.6, 0, TAU);
		gctx.fill();
		const n = activeComets();
		for (let i = 0; i < n; i++) {
			const c = comets[i];
			if (c.size < 2.4) continue;
			const rr = baseR * c.r;
			const x = cx + Math.cos(c.a) * rr;
			const y = cy + Math.sin(c.a) * rr * 0.9;
			gctx.fillStyle = rgba(PALETTE.spark, 0.28);
			gctx.beginPath();
			gctx.arc(x, y, c.size * 2.2, 0, TAU);
			gctx.fill();
		}
		gctx.restore();
	}

	/** @param {number} cx @param {number} cy @param {number} baseR */
	function draw(cx, cy, baseR) {
		const fade = 1 - Math.exp(-lastDt / TIERS[tier].trailTau);
		ctx.globalCompositeOperation = 'destination-out';
		ctx.fillStyle = `rgba(0,0,0,${fade.toFixed(3)})`;
		ctx.fillRect(0, 0, cssW, cssH);

		ctx.globalCompositeOperation = 'lighter';
		drawFilaments(cx, cy, baseR);
		drawOrbits(cx, cy, baseR);
		drawDust(cx, cy, baseR);
		ctx.globalCompositeOperation = 'source-over';
		drawCore(cx, cy, baseR);
		ctx.globalCompositeOperation = 'lighter';
		drawComets(cx, cy, baseR);
		drawRings(cx, cy, baseR);

		if (TIERS[tier].bloom && !reduced) {
			drawGlow(cx, cy, baseR);
			ctx.globalAlpha = clamp((0.06 + env.energy * 0.09) * CONFIG.bloomStrength, 0.03, 0.16);
			ctx.drawImage(glow, 0, 0, cssW, cssH);
			ctx.globalAlpha = 1;
		}
		ctx.globalCompositeOperation = 'source-over';
	}

	// ------------------------------------------------------------------ loop
	let rafId = null;
	let running = false;
	let frames = 0;

	/** @param {number} now */
	function loop(now) {
		rafId = requestAnimationFrame(loop);
		if (!canvas.isConnected || document.hidden) {
			lastNow = now;
			return;
		}
		const dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 0.016;
		lastNow = now;
		lastDt = dt || 0.016;
		if (dt <= 0) return;
		if (layoutDirty || frameCount++ % 30 === 0) buildLayout();
		if (!layout.ok) return;
		update(dt, now / 1000);
		draw(layout.cx, layout.cy, layout.baseR);
		frames++;

		ftSamples[ftIdx] = dt;
		ftIdx = (ftIdx + 1) % 45;
		if (now - lastFpsCheck > 1000) {
			lastFpsCheck = now;
			let s = 0;
			let c = 0;
			for (let i = 0; i < ftSamples.length; i++)
				if (ftSamples[i]) {
					s += ftSamples[i];
					c++;
				}
			if (c > 10) {
				fps = c / s;
				if (fps < 40 && tier > 0 && now - lastTierChange > 2000) {
					tier--;
					lastTierChange = now;
					layoutDirty = true;
				} else if (fps > 57 && tier < maxTier && now - lastTierChange > 4000) {
					tier++;
					lastTierChange = now;
					layoutDirty = true;
				}
			}
		}
	}

	/** @type {(() => void) | null} */
	let unsubscribe = null;

	function start() {
		setupAnalyser();
		unsubscribe = subscribeActiveAudio(() => connectActive());
		connectActive();
		buildLayout();
		running = true;
		if (!rafId) {
			lastNow = 0;
			rafId = requestAnimationFrame(loop);
		}
		if (typeof window !== 'undefined') {
			/** @type {any} */ (window).__InfiniteTodayDNA = { snapshot: () => snapshot() };
		}
	}

	function stop() {
		running = false;
		if (rafId != null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
		if (unsubscribe) {
			unsubscribe();
			unsubscribe = null;
		}
		untapAnalyser(tapped);
		tapped = null;
		if (typeof window !== 'undefined' && /** @type {any} */ (window).__InfiniteTodayDNA) {
			delete /** @type {any} */ (window).__InfiniteTodayDNA;
		}
	}

	function resize() {
		layoutDirty = true;
	}

	function snapshot() {
		const audio = getActiveAudio();
		const context = getContext();
		let freqSum = 0;
		if (freq) for (let i = 0; i < freq.length; i++) freqSum += freq[i];
		return {
			supported: true,
			running,
			analyser: !!analyser,
			sharedContext: !!context,
			contextState: context ? context.state : null,
			activeSrc: audio ? audio.currentSrc || audio.src : null,
			playing: audio ? !audio.paused && !audio.ended : false,
			tapped: !!tapped,
			frames,
			tier: TIERS[tier].name,
			fps: Math.round(fps),
			onsets: onsetCount,
			kicks: kickCount,
			freqSum,
			wave: +env.wave.toFixed(3),
			env: {
				sub: +env.sub.toFixed(3),
				bass: +env.bass.toFixed(3),
				mid: +env.mid.toFixed(3),
				high: +env.high.toFixed(3),
				energy: +env.energy.toFixed(3),
				beat: +beat.toFixed(3)
			},
			layout: { cx: Math.round(layout.cx), cy: Math.round(layout.cy), r: Math.round(layout.baseR), ok: layout.ok, w: Math.round(cssW), h: Math.round(cssH) },
			dust: activeDust(),
			comets: activeComets(),
			filaments: activeFilaments(),
			orbits: activeOrbits()
		};
	}

	return { start, stop, resize, snapshot };
}
