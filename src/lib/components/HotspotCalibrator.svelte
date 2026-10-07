<script lang="ts">
	import type { World } from '#lib/data/worlds.js';

	/**
	 * Dev-only панель ручной настройки Desktop-входов L2.
	 *
	 * Компонент — только UI: состояние сессии (оверрайды + выбранный мир) живёт
	 * на странице `space/+page.svelte` и передаётся сюда props. Production
	 * `worlds.ts` остаётся источником истины; панель ничего никуда не пишет,
	 * а лишь готовит текст для вставки в data layer.
	 *
	 * Панель можно перетаскивать за заголовок, чтобы освободить любой вход
	 * карты, который она перекрывает.
	 */
	interface CalibrationEntry {
		left: number;
		top: number;
		width: number;
		height: number;
	}

	interface HotspotCalibratorProps {
		worlds: World[];
		selectedSlug: string;
		entry: CalibrationEntry;
		onSelect: (slug: string) => void;
		onChange: (next: CalibrationEntry) => void;
		onClose: () => void;
	}

	let { worlds, selectedSlug, entry, onSelect, onChange, onClose }: HotspotCalibratorProps =
		$props();

	const world = $derived(worlds.find((item) => item.slug === selectedSlug));

	const fmt = (value: number): string => String(Math.round(value * 100) / 100);

	const configText = $derived(
		`hotspot: {\n\tleft: '${fmt(entry.left)}%',\n\ttop: '${fmt(entry.top)}%',\n\twidth: '${fmt(entry.width)}%',\n\theight: '${fmt(entry.height)}%'\n}`
	);

	let copyState = $state<'idle' | 'ok' | 'fail'>('idle');
	let copyTimer: ReturnType<typeof setTimeout> | undefined;

	// Перетаскивание самой панели (за заголовок). Переносим её из угла в
	// свободную позицию, чтобы она не перекрывала нужный вход.
	let panelEl: HTMLElement | null = $state(null);
	let panelPos = $state<{ x: number; y: number } | null>(null);
	let dragOffset = { x: 0, y: 0 };

	const clamp = (v: number, min: number, max: number): number => Math.min(Math.max(v, min), max);

	function setField(field: keyof CalibrationEntry, raw: string): void {
		if (raw.trim() === '') return;
		const value = Number(raw);
		if (!Number.isFinite(value)) return;
		onChange({ ...entry, [field]: value });
	}

	async function copyConfig(): Promise<void> {
		let ok = false;
		try {
			await navigator.clipboard.writeText(configText);
			ok = true;
		} catch {
			ok = false;
		}
		copyState = ok ? 'ok' : 'fail';
		clearTimeout(copyTimer);
		copyTimer = setTimeout(() => (copyState = 'idle'), 1600);
	}

	function onHeaderPointerDown(event: PointerEvent): void {
		if ((event.target as HTMLElement | null)?.closest('button')) return;
		if (!panelEl) return;
		event.preventDefault();
		const rect = panelEl.getBoundingClientRect();
		dragOffset = { x: event.clientX - rect.left, y: event.clientY - rect.top };
		panelPos = { x: rect.left, y: rect.top };
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function onHeaderPointerMove(event: PointerEvent): void {
		if (!panelPos) return;
		const x = clamp(event.clientX - dragOffset.x, 0, window.innerWidth - 80);
		const y = clamp(event.clientY - dragOffset.y, 0, window.innerHeight - 32);
		panelPos = { x, y };
	}

	function onHeaderPointerUp(event: PointerEvent): void {
		try {
			(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
		} catch {
			/* ignore */
		}
	}
</script>

<aside
	class="calib"
	class:is-moved={panelPos !== null}
	style={panelPos ? `left:${panelPos.x}px;top:${panelPos.y}px` : undefined}
	bind:this={panelEl}
	aria-label="Настройка входов L2"
>
	<div
		class="calib__head"
		role="presentation"
		onpointerdown={onHeaderPointerDown}
		onpointermove={onHeaderPointerMove}
		onpointerup={onHeaderPointerUp}
		onpointercancel={onHeaderPointerUp}
	>
		<strong class="calib__title">L2 calibration</strong>
		<button class="calib__close" type="button" aria-label="Закрыть калибровку" onclick={onClose}>
			×
		</button>
	</div>

	<div class="calib__field">
		<label for="calib-world">Мир</label>
		<select
			id="calib-world"
			value={selectedSlug}
			onchange={(event) => onSelect(event.currentTarget.value)}
		>
			{#each worlds as item (item.slug)}
				<option value={item.slug}>{item.title}</option>
			{/each}
		</select>
	</div>

	<dl class="calib__readout">
		<div><dt>center / left:</dt><dd>{fmt(entry.left)}%</dd></div>
		<div><dt>center / top:</dt><dd>{fmt(entry.top)}%</dd></div>
		<div><dt>label:</dt><dd>{world?.labelSide ?? '—'}</dd></div>
	</dl>

	<div class="calib__grid">
		<div class="calib__field">
			<label for="calib-x">Center X (%)</label>
			<input
				id="calib-x"
				type="number"
				inputmode="decimal"
				step="0.1"
				min="0"
				max="100"
				value={entry.left}
				oninput={(event) => setField('left', event.currentTarget.value)}
			/>
		</div>
		<div class="calib__field">
			<label for="calib-y">Center Y (%)</label>
			<input
				id="calib-y"
				type="number"
				inputmode="decimal"
				step="0.1"
				min="0"
				max="100"
				value={entry.top}
				oninput={(event) => setField('top', event.currentTarget.value)}
			/>
		</div>
		<div class="calib__field">
			<label for="calib-w">Width (%)</label>
			<input
				id="calib-w"
				type="number"
				inputmode="decimal"
				step="0.1"
				min="0.5"
				max="100"
				value={entry.width}
				oninput={(event) => setField('width', event.currentTarget.value)}
			/>
		</div>
		<div class="calib__field">
			<label for="calib-h">Height (%)</label>
			<input
				id="calib-h"
				type="number"
				inputmode="decimal"
				step="0.1"
				min="0.5"
				max="100"
				value={entry.height}
				oninput={(event) => setField('height', event.currentTarget.value)}
			/>
		</div>
	</div>

	<button class="calib__copy" type="button" onclick={copyConfig}>Копировать конфигурацию</button>
	<span class="calib__status" role="status" aria-live="polite">
		{copyState === 'ok' ? 'Скопировано' : copyState === 'fail' ? 'Не удалось скопировать' : ''}
	</span>

	<pre class="calib__preview">{configText}</pre>
</aside>

<style>
	.calib {
		position: fixed;
		z-index: 5;
		right: calc(1rem + env(safe-area-inset-right, 0px));
		bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
		width: min(300px, 32vw);
		max-height: calc(100dvh - 2rem);
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		padding: 0.75rem 0.8rem;
		border: 1px solid rgba(190, 200, 255, 0.16);
		border-radius: 14px;
		background: rgba(9, 10, 26, 0.62);
		-webkit-backdrop-filter: blur(12px) saturate(1.1);
		backdrop-filter: blur(12px) saturate(1.1);
		box-shadow: 0 14px 40px rgba(3, 4, 14, 0.5);
		color: rgba(240, 237, 252, 0.94);
		font-family: 'Nunito Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
		font-size: 0.76rem;
		font-weight: 300;
	}

	.calib.is-moved {
		right: auto;
		bottom: auto;
	}

	@media (max-width: 640px) {
		/* Инструмент строго desktop-only. */
		.calib {
			display: none;
		}
	}

	.calib__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		cursor: grab;
		user-select: none;
		touch-action: none;
	}

	.calib__head:active {
		cursor: grabbing;
	}

	.calib__title {
		font-size: 0.8rem;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(216, 198, 255, 0.9);
	}

	.calib__close {
		display: grid;
		place-items: center;
		width: 1.55rem;
		height: 1.55rem;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: rgba(180, 165, 255, 0.14);
		color: rgba(240, 237, 252, 0.85);
		font-size: 1rem;
		line-height: 1;
		cursor: pointer;
		transition:
			background var(--dur-ui) var(--ease-ui),
			transform var(--dur-fast) var(--ease-out);
	}

	.calib__close:active {
		transform: scale(0.94);
	}

	.calib__close:focus-visible,
	.calib__copy:focus-visible,
	.calib select:focus-visible,
	.calib input:focus-visible {
		outline: 1px solid rgba(216, 198, 255, 0.7);
		outline-offset: 2px;
	}

	@media (hover: hover) and (pointer: fine) {
		.calib__close:hover {
			background: rgba(180, 165, 255, 0.28);
		}
	}

	.calib__field {
		display: flex;
		flex-direction: column;
		gap: 0.18rem;
	}

	.calib__field label {
		color: rgba(210, 216, 245, 0.78);
		font-size: 0.68rem;
		letter-spacing: 0.03em;
	}

	.calib select,
	.calib input {
		width: 100%;
		padding: 0.3rem 0.5rem;
		border: 1px solid rgba(190, 200, 255, 0.18);
		border-radius: 8px;
		background: rgba(6, 6, 18, 0.6);
		color: rgba(244, 240, 255, 0.95);
		font: inherit;
	}

	.calib__grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.4rem 0.5rem;
	}

	.calib__readout {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		font-variant-numeric: tabular-nums;
	}

	.calib__readout div {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.calib__readout dt {
		color: rgba(210, 216, 245, 0.72);
	}

	.calib__readout dd {
		margin: 0;
		color: rgba(255, 214, 190, 0.9);
	}

	.calib__copy {
		padding: 0.4rem 0.7rem;
		border: 1px solid rgba(180, 165, 255, 0.4);
		border-radius: 999px;
		background: rgba(180, 139, 255, 0.16);
		color: #f4f0ff;
		font: inherit;
		cursor: pointer;
		transition:
			background var(--dur-ui) var(--ease-ui),
			transform var(--dur-fast) var(--ease-out);
	}

	.calib__copy:active {
		transform: scale(0.97);
	}

	@media (hover: hover) and (pointer: fine) {
		.calib__copy:hover {
			background: rgba(180, 139, 255, 0.28);
		}
	}

	.calib__status {
		min-height: 1em;
		color: #9ff0c8;
		font-size: 0.7rem;
	}

	.calib__preview {
		margin: 0;
		max-height: 74px;
		overflow-y: auto;
		padding: 0.45rem 0.55rem;
		border: 1px solid rgba(190, 200, 255, 0.12);
		border-radius: 8px;
		background: rgba(6, 6, 18, 0.5);
		color: rgba(216, 226, 255, 0.85);
		font-family: ui-monospace, 'Cascadia Code', 'SF Mono', Consolas, monospace;
		font-size: 0.66rem;
		line-height: 1.4;
		white-space: pre-wrap;
	}

	@media (prefers-reduced-motion: reduce) {
		.calib__close:active,
		.calib__copy:active {
			transform: none;
		}
	}
</style>
