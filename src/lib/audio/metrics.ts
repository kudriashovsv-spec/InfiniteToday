// Компактные музыкальные метрики для атмосферы L3.
//
// Переиспользует ЕДИНЫЙ аудиограф проекта: общий AnalyserNode (`graph.ts`) и
// активный источник (`playback.ts`). Своего AudioContext/AnalyserNode НЕ создаёт,
// маршрутизацию звука не меняет. FFT считает браузерный AnalyserNode; здесь —
// только чтение бинов, шесть полос, огибающие с атакой/затуханием и мягкий onset.
//
// Почему отдельный модуль, а не данные `audio-dna.js`: Audio DNA считает огибающие
// только когда смонтирован (режим визуализатора), а атмосфера и визуализатор
// взаимно исключены — значит в обычном режиме готовых метрик нет. Полная унификация
// с `audio-dna.js` потребовала бы рефакторинга стабильного визуализатора; здесь
// выбран минимальный общий ридер общего анализатора.
//
// Один потребитель — движок атмосферы (desktop). При неактивности/паузе трека
// значения плавно затухают к нулю — ложной музыкальной активности нет.

import { getAnalyser, getContext, getSource, tapAnalyser, untapAnalyser } from './graph.js';
import { getActiveAudio, subscribeActiveAudio } from './playback.js';

export interface AudioMetrics {
	sub: number;
	bass: number;
	lowMid: number;
	mid: number;
	high: number;
	treble: number;
	energy: number;
	beat: number;
	wave: number;
}

const FFT_SIZE = 1024;
const SMOOTHING = 0.8;

function toward(cur: number, target: number, atkTau: number, relTau: number, dt: number): number {
	const tau = target > cur ? atkTau : relTau;
	return cur + (target - cur) * (1 - Math.exp(-dt / tau));
}

export function createAudioMetrics() {
	let analyser: AnalyserNode | null = null;
	let freq: Uint8Array<ArrayBuffer> | null = null;
	let time: Uint8Array<ArrayBuffer> | null = null;
	let spec: Float32Array | null = null;
	let prevSpec: Float32Array | null = null;
	let tapped: MediaElementAudioSourceNode | null = null;
	let unsubscribe: (() => void) | null = null;
	let attached = false;
	let freshConnect = true;
	let fluxMean = 0.012;

	const m: AudioMetrics = { sub: 0, bass: 0, lowMid: 0, mid: 0, high: 0, treble: 0, energy: 0, beat: 0, wave: 0 };

	function connectActive(): void {
		const audio = getActiveAudio();
		const node = audio ? getSource(audio) : null;
		if (node === tapped) return;
		if (tapped) untapAnalyser(tapped);
		tapped = node;
		if (tapped) tapAnalyser(tapped);
		// после смены источника сбрасываем спектр, чтобы не поймать ложный onset
		freshConnect = true;
	}

	function setup(): void {
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

	function bandAvg(f0: number, f1: number): number {
		if (!analyser || !freq) return 0;
		const ctx = getContext();
		const nyq = (ctx ? ctx.sampleRate : 48000) / 2;
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

	/** Подключение к общему анализатору (идемпотентно). Вызывается при старте/возобновлении. */
	function attach(): void {
		setup();
		if (!unsubscribe) unsubscribe = subscribeActiveAudio(() => connectActive());
		connectActive();
		attached = true;
	}

	/** Полное освобождение (размонтирование). */
	function detach(): void {
		if (unsubscribe) {
			unsubscribe();
			unsubscribe = null;
		}
		if (tapped) untapAnalyser(tapped);
		tapped = null;
		attached = false;
	}

	/** Один шаг чтения метрик; `dt` в секундах. Возвращает те же (сглаженные) значения. */
	function sample(dt: number): AudioMetrics {
		const audio = getActiveAudio();
		if (!analyser || !freq || !time || !spec || !prevSpec || !audio || audio.paused || audio.ended) {
			for (const k of Object.keys(m) as (keyof AudioMetrics)[]) m[k] = toward(m[k], 0, 0.25, 0.6, dt);
			return m;
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
		void s;

		let wave = 0;
		for (i = 0; i < time.length; i += 4) wave += Math.abs(time[i] - 128);
		wave = wave / (time.length / 4) / 128;

		// спектральный flux → мягкий onset (атака быстрая, затухание медленное)
		let flux = 0;
		const k = Math.max(1, Math.floor(n * 0.06));
		for (i = 0; i < n; i++) {
			const d = spec[i] - prevSpec[i];
			if (d > 0) flux += d;
		}
		flux /= n;
		if (freshConnect) {
			prevSpec.set(spec);
			freshConnect = false;
			flux = 0;
			fluxMean = 0.012;
		} else {
			prevSpec.set(spec);
		}
		void k;
		const onset = flux > Math.max(0.006, fluxMean * 1.7);
		fluxMean = toward(fluxMean, flux, 0.15, 0.15, dt);

		m.sub = toward(m.sub, sub, 0.08, 0.26, dt);
		m.bass = toward(m.bass, bass, 0.08, 0.3, dt);
		m.lowMid = toward(m.lowMid, lowMid, 0.1, 0.32, dt);
		m.mid = toward(m.mid, mid, 0.1, 0.32, dt);
		m.high = toward(m.high, high, 0.1, 0.34, dt);
		m.treble = toward(m.treble, treble, 0.12, 0.36, dt);
		m.energy = toward(m.energy, energy, 0.12, 0.36, dt);
		m.beat = toward(m.beat, onset ? 1 : 0, 0.06, 0.4, dt);
		m.wave = toward(m.wave, wave, 0.12, 0.36, dt);
		return m;
	}

	function snapshot(): { attached: boolean; active: string | null; metrics: AudioMetrics } {
		const audio = getActiveAudio();
		return {
			attached,
			active: audio ? audio.currentSrc || audio.src : null,
			metrics: { ...m }
		};
	}

	return { attach, detach, sample, snapshot };
}
