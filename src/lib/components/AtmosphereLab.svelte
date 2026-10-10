<script lang="ts">
	import { MORPHOLOGIES, MORPHOLOGY_ORDER, trackDna, type DnaMorphology } from '#lib/data/dna.js';
	import type { AtmosphereMorphology } from '#lib/atmosphere/atmosphere.js';
	import AtmosphereScene from './AtmosphereScene.svelte';
	import SongDna from './SongDna.svelte';

	/**
	 * Atmosphere Lab — внутренняя страница разработки (только dev).
	 *
	 * Оценивает прототип «живой атмосферы» L3 для всех шести морфологий Song DNA:
	 * переключение морфологии, слайдеры интенсивности/движения, мок-оверлей L3
	 * (заголовок, панель, фигура DNA) — чтобы судить о глубине и читаемости.
	 *
	 * Тяжёлый слой (canvas) монтируется ТОЛЬКО когда подтверждён desktop; на mobile
	 * — статичная заглушка без canvas и цикла.
	 */
	const MOCK: Record<AtmosphereMorphology, { title: string; genre: string }> = {
		star: { title: 'Поворот туда', genre: 'DnB' },
		bloom: { title: 'Дети Солнц', genre: 'Psychill' },
		crystal: { title: 'Здравствуй в первый раз', genre: 'Downtempo' },
		pulse: { title: 'Оправданная надежда', genre: 'Neurofunk' },
		spiral: { title: 'Оправданная надежда', genre: 'Downtempo' },
		void: { title: 'Антисага', genre: 'Electronic' }
	};

	const REP = (() => {
		const out: Partial<Record<DnaMorphology, number[]>> = {};
		for (const dna of Object.values(trackDna)) {
			if (!out[dna.morphology]) out[dna.morphology] = [...dna.values];
		}
		const fallback: Record<DnaMorphology, number[]> = {
			star: [87, 68, 79, 57, 88, 70, 63, 49],
			bloom: [98, 97, 86, 94, 5, 8, 87, 67],
			crystal: [84, 64, 84, 63, 34, 11, 68, 71],
			pulse: [74, 31, 74, 21, 88, 91, 93, 84],
			spiral: [84, 85, 74, 49, 33, 25, 93, 77],
			void: [32, 28, 83, 31, 22, 86, 17, 71]
		};
		for (const m of MORPHOLOGY_ORDER) out[m] ||= fallback[m];
		return out as Record<DnaMorphology, number[]>;
	})();

	let mode = $state<AtmosphereMorphology>('star');
	let intensity = $state(1.4);
	let motion = $state(1);
	let resetId = $state(0);
	let isDesktop = $state(false);
	let readout = $state('—');

	$effect(() => {
		const mq = window.matchMedia('(max-width: 640px)');
		const apply = (): void => {
			isDesktop = !mq.matches && Math.min(window.innerWidth, window.innerHeight) >= 520;
		};
		apply();
		mq.addEventListener('change', apply);
		return () => mq.removeEventListener('change', apply);
	});

	// Лёгкий readout (dev-хук движка), без своего цикла отрисовки.
	$effect(() => {
		const id = setInterval(() => {
			const hook = (window as unknown as { __InfiniteTodayAtmosphere?: { snapshot: () => { mode: string; fps: number; frames: number; blend: number; dpr: number } } })
				.__InfiniteTodayAtmosphere;
			if (!hook) {
				readout = 'движок не запущен';
				return;
			}
			const s = hook.snapshot();
			readout = `${s.mode} · ${s.fps} fps · кадров ${s.frames} · blend ${s.blend} · dpr ${s.dpr}`;
		}, 600);
		return () => clearInterval(id);
	});
</script>

<div class="lab">
	<h1>Atmosphere Lab <span class="tag">dev only</span></h1>
	<p class="hint">
		Прототип «живой атмосферы» L3: CSS-база + Canvas 2D, шесть морфологий Song DNA. Без
		аудиореакции. Тяжёлый слой монтируется только на desktop; на mobile — без canvas и цикла.
	</p>

	<div class="controls">
		<span class="modes">
			{#each MORPHOLOGY_ORDER as m}
				<button class:active={mode === m} onclick={() => (mode = m)}>{MORPHOLOGIES[m].name}</button>
			{/each}
			<span class="swatch" style={`background:${MORPHOLOGIES[mode].color}`}></span>
		</span>
		<label>Интенсивность <input type="range" min="0.5" max="1.6" step="0.05" bind:value={intensity} /> {intensity.toFixed(2)}</label>
		<label>Движение <input type="range" min="0.3" max="2" step="0.05" bind:value={motion} /> {motion.toFixed(2)}</label>
		<button onclick={() => (resetId += 1)}>↺ Перезапустить</button>
	</div>
	<p class="readout">{readout}</p>

	<div class="stage">
		{#if isDesktop}
			{#key resetId}
				<AtmosphereScene morphology={mode} {intensity} {motion} />
			{/key}
		{:else}
			<p class="notice">Атмосфера — только desktop. На mobile тяжёлый слой не запускается.</p>
		{/if}

		<!-- Мок-оверлей L3: проверить читаемость поверх фона -->
		<h2 class="mock-title">{MOCK[mode].title}</h2>
		<div class="mock-panel">
			<p class="mock-genre">{MOCK[mode].genre}</p>
			<div class="mock-row"><span class="mock-btn">▶</span><span class="mock-bar"></span></div>
			<p class="mock-meta">0:00 / 4:05</p>
		</div>
		<div class="mock-dna"><SongDna values={REP[mode]} morphology={mode} /></div>
	</div>
</div>

<style>
	.lab {
		max-width: 1100px;
		margin: 0 auto;
		padding: 1rem 0 4rem;
		color: var(--text);
		font-family: 'Nunito Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
	}
	h1 {
		margin: 0 0 0.3rem;
		font-size: 1.4rem;
		font-weight: 300;
		letter-spacing: 0.06em;
	}
	.tag {
		font-size: 0.62rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--accent-b);
		border: 1px solid rgba(255, 138, 92, 0.4);
		border-radius: 999px;
		padding: 0.1rem 0.5rem;
		vertical-align: middle;
	}
	.hint {
		margin: 0 0 0.9rem;
		font-size: 0.78rem;
		color: var(--text-dim);
		line-height: 1.5;
	}
	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem 1.1rem;
		align-items: center;
		margin-bottom: 0.5rem;
		font-size: 0.82rem;
	}
	.modes {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		flex-wrap: wrap;
	}
	.swatch {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		box-shadow: 0 0 10px currentColor;
	}
	label {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		color: var(--text-dim);
	}
	button {
		background: #120f22;
		color: var(--text);
		border: 1px solid #38315a;
		border-radius: 8px;
		padding: 0.32rem 0.6rem;
		font: inherit;
		cursor: pointer;
	}
	button:hover {
		border-color: var(--accent-a);
	}
	button.active {
		border-color: var(--accent-a);
		background: rgba(180, 165, 255, 0.18);
	}
	input[type='range'] {
		width: 150px;
		vertical-align: middle;
	}
	.readout {
		margin: 0 0 0.8rem;
		font-size: 0.74rem;
		color: var(--text-dim);
		font-variant-numeric: tabular-nums;
	}
	.stage {
		position: relative;
		height: min(78vh, 660px);
		border: 1px solid rgba(190, 200, 255, 0.16);
		border-radius: 16px;
		overflow: hidden;
		background: var(--bg-base);
	}
	.notice {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		margin: 0;
		color: var(--text-dim);
		font-size: 0.85rem;
	}
	.mock-title {
		position: absolute;
		top: clamp(1rem, 4vh, 2.2rem);
		left: 50%;
		translate: -50% 0;
		margin: 0;
		font-size: clamp(1.4rem, 3.4vw, 2.6rem);
		font-weight: 200;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: rgba(250, 247, 255, 0.94);
		text-shadow: 0 2px 14px rgba(3, 4, 14, 0.9);
		white-space: nowrap;
		pointer-events: none;
	}
	.mock-panel {
		position: absolute;
		top: clamp(3.4rem, 10vh, 5rem);
		left: clamp(0.9rem, 3vw, 2rem);
		width: clamp(240px, 26vw, 320px);
		padding: 0.7rem;
		border-radius: 12px;
		background: rgba(9, 10, 26, 0.34);
		border: 1px solid rgba(190, 200, 255, 0.12);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		pointer-events: none;
	}
	.mock-genre {
		margin: 0 0 0.35rem;
		font-size: 0.7rem;
		letter-spacing: 0.1em;
		color: rgba(238, 232, 255, 0.8);
	}
	.mock-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.mock-btn {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		background: rgba(180, 165, 255, 0.2);
		font-size: 0.7rem;
	}
	.mock-bar {
		flex: 1;
		height: 3px;
		border-radius: 2px;
		background: linear-gradient(90deg, rgba(216, 198, 255, 0.7) 30%, rgba(216, 198, 255, 0.18) 30%);
	}
	.mock-meta {
		margin: 0.35rem 0 0;
		font-size: 0.62rem;
		color: rgba(238, 232, 255, 0.55);
		font-variant-numeric: tabular-nums;
	}
	.mock-dna {
		position: absolute;
		top: 50%;
		right: clamp(1rem, 4vw, 3rem);
		translate: 0 -50%;
		width: min(34%, 320px);
		pointer-events: none;
	}
</style>
