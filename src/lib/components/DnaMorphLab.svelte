<script lang="ts">
	import { tick } from 'svelte';
	import { MORPHOLOGIES, MORPHOLOGY_ORDER, trackDna, type DnaMorphology } from '#lib/data/dna.js';
	import { dnaMorphFallbackPair, petalRings, ringsFinite } from './dna-geometry.js';
	import SongDna from './SongDna.svelte';
	import DnaMorph from './DnaMorph.svelte';

	/**
	 * DNA Morph Lab — внутренняя страница разработки (только dev).
	 *
	 * Переиспользует реальные `SongDna` (превью) и `DnaMorph` (переход), а не
	 * отдельную реализацию алгоритма. Значения морфологий берутся из настоящего
	 * каталога (`trackDna`) — по одной репрезентативной версии на морфологию.
	 *
	 * Позволяет прогнать все 30 направленных переходов (6×5) и 6 self-проверок,
	 * повторить конкретный переход, быстро сменить направление и увидеть режим
	 * (настоящий morph или cross-dissolve fallback).
	 */
	const REP = (() => {
		const out: Partial<Record<DnaMorphology, number[]>> = {};
		for (const dna of Object.values(trackDna)) {
			if (!out[dna.morphology]) out[dna.morphology] = [...dna.values];
		}
		for (const m of MORPHOLOGY_ORDER) if (!out[m]) out[m] = [50, 50, 50, 50, 50, 50, 50, 50];
		return out as Record<DnaMorphology, number[]>;
	})();

	const order = MORPHOLOGY_ORDER;
	const directed = order.flatMap((a) => order.filter((b) => b !== a).map((b) => [a, b] as const));
	const selfs = order.map((m) => [m, m] as const);

	let from = $state<DnaMorphology>('star');
	let to = $state<DnaMorphology>('bloom');
	let stage = $state<DnaMorphology>('star');
	let runId = $state(0);
	let override = $state<'auto' | 'morph' | 'cross'>('auto');
	let autoRunning = $state(false);
	let autoDone = $state(0);
	let lastMs = $state(0);
	let reduced = $state(false);

	const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

	/** Ожидаемый режим перехода — тот же критерий, что в `DnaMorph` (auto). */
	function modeOf(a: DnaMorphology, b: DnaMorphology): 'morph' | 'cross' {
		if (override !== 'auto') return override;
		return dnaMorphFallbackPair(a, b) ||
			!ringsFinite(petalRings(REP[a], a)) ||
			!ringsFinite(petalRings(REP[b], b))
			? 'cross'
			: 'morph';
	}
	const currentMode = $derived(modeOf(from, to));

	/** Прогон одного перехода: сначала показать источник (static), затем цель. */
	async function run(a: DnaMorphology, b: DnaMorphology): Promise<void> {
		from = a;
		to = b;
		stage = a;
		runId += 1;
		await tick();
		const t0 = performance.now();
		stage = b;
		await sleep(520);
		lastMs = Math.round(performance.now() - t0);
	}

	async function runAll(): Promise<void> {
		if (autoRunning) return;
		autoRunning = true;
		autoDone = 0;
		for (const [a, b] of directed) {
			if (!autoRunning) break;
			await run(a, b);
			autoDone += 1;
			await sleep(320);
		}
		autoRunning = false;
	}

	function swapRun(): void {
		void run(to, from);
	}

	$effect(() => {
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		const apply = (): void => {
			reduced = mq.matches;
		};
		apply();
		mq.addEventListener('change', apply);
		return () => mq.removeEventListener('change', apply);
	});
</script>

<div class="lab">
	<h1>DNA Morph Lab <span class="tag">dev only</span></h1>
	<p class="hint">
		30 направленных переходов (6×5) + 6 self-проверок. Значения — реальные версии каталога
		(по одной на морфологию). Переходы идут через общий <code>DnaMorph</code>.
	</p>

	<div class="controls">
		<label>Из:
			<select bind:value={from}>
				{#each order as m}<option value={m}>{MORPHOLOGIES[m].name}</option>{/each}
			</select>
		</label>
		<label>В:
			<select bind:value={to}>
				{#each order as m}<option value={m}>{MORPHOLOGIES[m].name}</option>{/each}
			</select>
		</label>
		<button onclick={() => run(from, to)}>▶ Запустить</button>
		<button onclick={swapRun}>⇄ Сменить направление</button>
		<label>Режим:
			<select bind:value={override}>
				<option value="auto">auto (штатный критерий)</option>
				<option value="morph">force morph</option>
				<option value="cross">force cross-dissolve</option>
			</select>
		</label>
		<button onclick={() => (autoRunning ? (autoRunning = false) : runAll())}>
			{autoRunning ? `■ Стоп (${autoDone}/${directed.length})` : '⏭ Авто: все 30'}
		</button>
	</div>

	<p class="status">
		Переход: <b>{MORPHOLOGIES[from].name} → {MORPHOLOGIES[to].name}</b> · режим:
		<b class:is-cross={currentMode === 'cross'}
			>{currentMode === 'morph' ? 'настоящий morph' : 'cross-dissolve fallback'}</b
		>
		{#if reduced} · <b class="warn">reduced-motion: мгновенно</b>{/if}
		{#if lastMs} · {lastMs} ms{/if}
	</p>

	<div class="previews">
		<figure>
			<figcaption>Исходная: {MORPHOLOGIES[from].name}</figcaption>
			<div class="prev"><SongDna values={REP[from]} morphology={from} /></div>
		</figure>
		<figure>
			<figcaption>Целевая: {MORPHOLOGIES[to].name}</figcaption>
			<div class="prev"><SongDna values={REP[to]} morphology={to} /></div>
		</figure>
	</div>

	<div class="stage">
		{#key runId}
			<DnaMorph
				values={REP[stage]}
				morphology={stage}
				forceMode={override === 'auto' ? undefined : override}
			/>
		{/key}
	</div>

	<div class="grid">
		{#each directed as [a, b]}
			<button class:active={from === a && to === b} onclick={() => run(a, b)}>
				{MORPHOLOGIES[a].name} → {MORPHOLOGIES[b].name}
			</button>
		{/each}
	</div>

	<div class="grid selfs">
		{#each selfs as [a]}
			<button onclick={() => run(a, a)}>self {MORPHOLOGIES[a].name}</button>
		{/each}
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
	code {
		color: var(--accent-a);
	}
	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 0.9rem;
		align-items: center;
		margin-bottom: 0.7rem;
		font-size: 0.82rem;
	}
	select,
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
	.status {
		margin: 0 0 0.9rem;
		font-size: 0.85rem;
		color: var(--text-dim);
	}
	.status b {
		color: var(--text);
	}
	.status .is-cross {
		color: var(--accent-b);
	}
	.status .warn {
		color: var(--accent-b);
	}
	.previews {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	figure {
		margin: 0;
	}
	figcaption {
		font-size: 0.72rem;
		color: var(--text-dim);
		margin-bottom: 0.3rem;
	}
	.prev {
		border: 1px solid rgba(190, 200, 255, 0.12);
		border-radius: 12px;
		padding: 0.5rem;
		background: rgba(9, 10, 26, 0.35);
	}
	.stage {
		border: 1px solid rgba(190, 200, 255, 0.16);
		border-radius: 16px;
		padding: 1rem;
		background: rgba(9, 10, 26, 0.45);
		display: grid;
		place-items: center;
		margin-bottom: 1rem;
	}
	.stage :global(.dna-morph) {
		width: min(100%, 420px);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 0.4rem;
	}
	.grid button {
		font-size: 0.72rem;
		text-align: left;
	}
	.grid button.active {
		border-color: var(--accent-a);
		background: rgba(180, 165, 255, 0.16);
	}
	.selfs {
		margin-top: 0.6rem;
	}
	@media (max-width: 640px) {
		.previews {
			grid-template-columns: 1fr;
		}
	}
</style>
