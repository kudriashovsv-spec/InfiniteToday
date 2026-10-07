<script lang="ts">
	import { resolve } from '$app/paths';
	import type { World, WorldHotspot } from '#lib/data/worlds.js';

	/**
	 * Переиспользуемая точка входа на карте L2. Координаты и сторона подписи
	 * приходят из данных мира, поэтому для миров нет отдельных CSS-классов —
	 * только одна модель.
	 *
	 * Dev-only calibration (см. `space/+page.svelte`): при `calibrating = true`
	 * hotspot можно тащить мышью, а навигация по нему блокируется. В production
	 * (по умолчанию `calibrating = false`) поведение не меняется: это обычная
	 * ссылка из данных `world.hotspot`.
	 */
	interface MapHotspotProps {
		world: World;
		/** рантайм-оверрайд координат (calibration); иначе world.hotspot */
		position?: WorldHotspot;
		calibrating?: boolean;
		selected?: boolean;
		onpick?: (slug: string) => void;
		onmove?: (slug: string, left: number, top: number) => void;
	}

	let {
		world,
		position,
		calibrating = false,
		selected = false,
		onpick,
		onmove
	}: MapHotspotProps = $props();

	const spot = $derived(position ?? world.hotspot);

	const labelClass = $derived(
		world.labelSide === 'above'
			? 'hotspot--label-above'
			: world.labelSide === 'left'
				? 'hotspot--label-left'
				: ''
	);

	// Calibration drag state. Живёт только когда calibrating = true; источник
	// истины — оверрайды на странице L2, сюда приходит только позиция.
	let dragging = $state(false);
	let grabDX = 0;
	let grabDY = 0;

	const clamp = (v: number, min: number, max: number): number => Math.min(Math.max(v, min), max);
	const num = (value: string): number => parseFloat(value) || 0;

	function sceneRect(el: HTMLElement): DOMRect | null {
		const parent = el.offsetParent;
		return parent instanceof HTMLElement ? parent.getBoundingClientRect() : null;
	}

	function onPointerDown(event: PointerEvent): void {
		if (!calibrating) return;
		event.preventDefault();
		event.stopPropagation();
		onpick?.(world.slug);
		const el = event.currentTarget as HTMLElement;
		const rect = sceneRect(el);
		if (!rect) return;
		// Сохраняем смещение точки захвата относительно центра, чтобы вход
		// не прыгал под курсор.
		const centerX = rect.left + (num(spot.left) / 100) * rect.width;
		const centerY = rect.top + (num(spot.top) / 100) * rect.height;
		grabDX = event.clientX - centerX;
		grabDY = event.clientY - centerY;
		dragging = true;
		try {
			el.setPointerCapture(event.pointerId);
		} catch {
			/* ignore */
		}
	}

	function onPointerMove(event: PointerEvent): void {
		if (!dragging || !calibrating) return;
		const el = event.currentTarget as HTMLElement;
		const rect = sceneRect(el);
		if (!rect) return;
		const width = num(spot.width);
		const height = num(spot.height);
		const cx = ((event.clientX - grabDX - rect.left) / rect.width) * 100;
		const cy = ((event.clientY - grabDY - rect.top) / rect.height) * 100;
		// Центр ограничиваем так, чтобы весь вход оставался внутри карты.
		onmove?.(world.slug, clamp(cx, width / 2, 100 - width / 2), clamp(cy, height / 2, 100 - height / 2));
	}

	function onPointerUp(event: PointerEvent): void {
		if (!dragging) return;
		dragging = false;
		try {
			(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
		} catch {
			/* ignore */
		}
	}
</script>

<a
	class="hotspot {labelClass}"
	class:is-calibrating={calibrating}
	class:is-selected={selected}
	href={calibrating ? undefined : resolve('/world/[slug]', { slug: world.slug })}
	style="--left:{spot.left};--top:{spot.top};--w:{spot.width};--h:{spot.height}"
	aria-label={`Открыть мир песни «${world.title}»`}
	draggable={calibrating ? false : undefined}
	onpointerdown={calibrating ? onPointerDown : undefined}
	onpointermove={calibrating ? onPointerMove : undefined}
	onpointerup={calibrating ? onPointerUp : undefined}
	onpointercancel={calibrating ? onPointerUp : undefined}
>
	<span class="hotspot__label">{world.title}</span>
</a>

<style>
	.hotspot {
		position: absolute;
		left: var(--left);
		top: var(--top);
		width: var(--w);
		height: var(--h);
		translate: -50% -50%;
		border-radius: 50%;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition:
			transform var(--dur-ui) var(--ease-out),
			filter var(--dur-ui) var(--ease-ui);
	}

	/* Dev-only calibration: вход становится перетаскиваемым и не уводит
	   по маршруту. Никак не влияет на production-состояние. */
	.hotspot.is-calibrating {
		cursor: grab;
		touch-action: none;
		outline: 1px dashed rgba(180, 220, 255, 0.55);
		outline-offset: 2px;
	}

	.hotspot.is-calibrating.is-selected {
		cursor: grabbing;
		outline: 2px solid rgba(120, 220, 255, 0.95);
		outline-offset: 4px;
	}

	.hotspot:focus {
		outline: none;
	}

	.hotspot:focus-visible {
		outline: 2px solid rgba(216, 198, 255, 0.85);
		outline-offset: 6px;
		border-radius: 50%;
	}

	/* Свечение созвездия */
	.hotspot::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 50%;
		background: radial-gradient(
			circle,
			rgba(106, 168, 255, 0) 40%,
			rgba(120, 178, 255, 0.38) 62%,
			rgba(150, 200, 255, 0.23) 78%,
			rgba(106, 168, 255, 0) 100%
		);
		mix-blend-mode: screen;
		animation: starPulse 4.2s ease-in-out infinite;
	}

	/* Тонкое кольцо-подсказка + мягкое свечение (desktop-стиль v1.1) */
	.hotspot::after {
		content: '';
		position: absolute;
		inset: 14%;
		border-radius: 50%;
		border: 1px solid rgba(178, 216, 255, 0.9);
		opacity: 0.82;
		box-shadow:
			0 0 8px rgba(150, 200, 255, 0.55),
			0 0 18px rgba(120, 170, 255, 0.35),
			inset 0 0 6px rgba(200, 230, 255, 0.35);
		transition:
			opacity var(--dur-slow) var(--ease-soft),
			transform var(--dur-slow) var(--ease-soft);
	}

	.hotspot:focus-visible {
		transform: scale(1.05);
	}

	.hotspot:focus-visible::before {
		animation-duration: 2.2s;
	}

	.hotspot:focus-visible::after {
		opacity: 1;
		transform: scale(1.06);
		box-shadow:
			0 0 10px rgba(170, 214, 255, 0.75),
			0 0 24px rgba(130, 180, 255, 0.5),
			inset 0 0 8px rgba(210, 235, 255, 0.5);
	}

	@media (hover: hover) and (pointer: fine) {
		.hotspot:hover {
			transform: scale(1.05);
		}

		.hotspot:hover::before {
			animation-duration: 2.2s;
		}

		.hotspot:hover::after {
			opacity: 1;
			transform: scale(1.06);
			box-shadow:
				0 0 10px rgba(170, 214, 255, 0.75),
				0 0 24px rgba(130, 180, 255, 0.5),
				inset 0 0 8px rgba(210, 235, 255, 0.5);
		}
	}

	@keyframes starPulse {
		0%,
		100% {
			opacity: 0.5;
			transform: scale(1);
		}
		50% {
			opacity: 0.95;
			transform: scale(1.04);
		}
	}

	.hotspot__label {
		position: absolute;
		left: 50%;
		top: 100%;
		translate: -50% 8px;
		color: #eef4ff;
		font-family: 'Nunito Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
		font-size: clamp(0.9rem, 1.9vw, 1.3rem);
		font-weight: 300;
		white-space: nowrap;
		text-shadow:
			0 1px 2px rgba(2, 4, 12, 0.95),
			0 0 6px rgba(2, 4, 12, 0.9),
			0 0 18px rgba(2, 4, 12, 0.75);
		opacity: 0.8;
		pointer-events: none;
		transition: opacity var(--dur-ui) var(--ease-ui);
	}

	.hotspot:focus-visible .hotspot__label {
		opacity: 1;
	}

	@media (hover: hover) and (pointer: fine) {
		.hotspot:hover .hotspot__label {
			opacity: 1;
		}
	}

	/* Подпись над зоной — у входа, где снизу нет места (v1.1: «Мечтай») */
	.hotspot--label-above .hotspot__label {
		top: auto;
		bottom: 100%;
		translate: -50% -8px;
	}

	/* Подпись слева от зоны — у входа у правого края (v1.1: «Время не торопи») */
	.hotspot--label-left .hotspot__label {
		left: auto;
		right: 50%;
		translate: 0 8px;
	}

	@media (prefers-reduced-motion: reduce) {
		.hotspot::before {
			animation: none;
		}

		.hotspot:hover,
		.hotspot:focus-visible {
			transform: none;
		}

		.hotspot:hover::after,
		.hotspot:focus-visible::after {
			transform: none;
		}
	}
</style>
