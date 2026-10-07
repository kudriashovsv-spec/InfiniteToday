<script lang="ts">
	import { onMount } from 'svelte';
	import { asset } from '$app/paths';
	import type { AssetPath } from '$app/types';
	import { galleryDir, fileOf, categories, type GalleryWork } from '#lib/data/gallery.js';

	/**
	 * Lightbox галереи: оверлей поверх списка, без новой страницы.
	 * Презентация + клавиатура + свайп. История/навигация — на стороне
	 * GalleryView (SvelteKit shallow state), здесь только показ.
	 */
	interface LightboxProps {
		list: GalleryWork[];
		index: number;
		onstep: (delta: number) => void;
		onclose: () => void;
	}

	let { list, index, onstep, onclose }: LightboxProps = $props();

	const image = $derived(list[index]);

	let imgEl: HTMLImageElement | null = $state(null);
	let frameEl: HTMLElement | null = $state(null);
	let closeEl: HTMLButtonElement | null = $state(null);
	let prevEl: HTMLButtonElement | null = $state(null);
	let nextEl: HTMLButtonElement | null = $state(null);

	let shown: boolean = $state(false);
	let imageToken = 0;
	const preloaded = new Set<string>();

	const categoryTitle = $derived(
		(image && categories.find((c) => c.slug === image.category)?.title) || ''
	);

	// md сразу (обычно уже в кэше карточки), затем lg — подмена после декодирования.
	function loadImage(work: GalleryWork | undefined): void {
		if (!imgEl || !work) return;
		const medium = fileOf(work, 'md');
		const large = fileOf(work, 'lg');
		const token = ++imageToken;
		imgEl.width = medium.w;
		imgEl.height = medium.h;
		imgEl.src = asset(`${galleryDir}/${medium.path}` as AssetPath);
		if (large.path === medium.path) {
			preloadNeighbours();
			return;
		}
		const probe = new Image();
		probe.decoding = 'async';
		const swap = (): void => {
			if (token !== imageToken || !imgEl) return;
			imgEl.width = large.w;
			imgEl.height = large.h;
			imgEl.src = asset(`${galleryDir}/${large.path}` as AssetPath);
		};
		probe.onload = () => {
			if (typeof probe.decode === 'function') probe.decode().then(swap, swap);
			else swap();
		};
		preloadNeighbours();
		probe.src = asset(`${galleryDir}/${large.path}` as AssetPath);
	}

	// Предзагрузка соседей — только ±1, по простою.
	function preloadNeighbours(): void {
		if (list.length < 2) return;
		const run = (): void => {
			for (const step of [1, -1]) {
				const neighbor = list[(index + step + list.length) % list.length];
				const large = neighbor && neighbor.files.lg;
				if (!large || preloaded.has(large.path)) continue;
				preloaded.add(large.path);
				const probe = new Image();
				probe.decoding = 'async';
				probe.src = asset(`${galleryDir}/${large.path}` as AssetPath);
			}
		};
		// requestIdleCallback есть не во всех браузерах — тип допускает его отсутствие.
		const ric: typeof window.requestIdleCallback | undefined = window.requestIdleCallback;
		if (ric) ric(run, { timeout: 1500 });
		else window.setTimeout(run, 300);
	}

	function onKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			event.preventDefault();
			onclose();
			return;
		}
		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			onstep(-1);
			return;
		}
		if (event.key === 'ArrowRight') {
			event.preventDefault();
			onstep(1);
			return;
		}
		if (event.key !== 'Tab') return;
		const controls = [prevEl, nextEl, closeEl].filter(
			(el): el is HTMLButtonElement => !!el && !el.disabled
		);
		if (!controls.length) {
			event.preventDefault();
			return;
		}
		const first = controls[0];
		const last = controls[controls.length - 1];
		const active = document.activeElement;
		if (!frameEl || !frameEl.parentElement) return;
		if (event.shiftKey && active === first) {
			event.preventDefault();
			last.focus({ preventScroll: true });
		} else if (!event.shiftKey && active === last) {
			event.preventDefault();
			first.focus({ preventScroll: true });
		}
	}

	/** Состояние активного свайпа. */
	interface SwipeState {
		x: number;
		y: number;
		id: number;
	}

	let swipe: SwipeState | null = null;

	function onPointerDown(event: PointerEvent): void {
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		swipe = { x: event.clientX, y: event.clientY, id: event.pointerId };
	}

	function onPointerUp(event: PointerEvent): void {
		if (!swipe || event.pointerId !== swipe.id) {
			swipe = null;
			return;
		}
		const dx = event.clientX - swipe.x;
		const dy = event.clientY - swipe.y;
		swipe = null;
		if (Math.abs(dx) < 44 || Math.abs(dx) < Math.abs(dy)) return;
		onstep(dx < 0 ? 1 : -1);
	}

	onMount(() => {
		document.addEventListener('keydown', onKeydown);
		requestAnimationFrame(() => (shown = true));
		if (closeEl) closeEl.focus({ preventScroll: true });
		return () => document.removeEventListener('keydown', onKeydown);
	});

	// смена изображения/листание
	$effect(() => {
		if (image) loadImage(image);
	});
</script>

<div
	class="lightbox"
	class:is-open={shown}
	role="dialog"
	aria-modal="true"
	aria-label="Просмотр изображения"
>
	<button
		class="lightbox__backdrop"
		type="button"
		tabindex="-1"
		aria-label="Закрыть просмотр"
		onclick={() => onclose()}
	></button>

	{#if image}
		<figure
			class="lightbox__frame"
			bind:this={frameEl}
			onpointerdown={onPointerDown}
			onpointerup={onPointerUp}
			onpointercancel={() => (swipe = null)}
		>
			<img
				class="lightbox__img"
				bind:this={imgEl}
				alt={`Изображение ${index + 1} из ${list.length}`}
				decoding="async"
			/>
			<figcaption class="lightbox__caption">
				<span class="lightbox__counter">{index + 1} / {list.length}</span>
				{#if categoryTitle}
					<span class="lightbox__category">{categoryTitle}</span>
				{/if}
			</figcaption>
		</figure>
	{/if}

	<button
		class="lightbox__nav lightbox__nav--prev"
		bind:this={prevEl}
		type="button"
		aria-label="Предыдущее изображение"
		disabled={list.length < 2}
		onclick={() => onstep(-1)}>‹</button
	>
	<button
		class="lightbox__nav lightbox__nav--next"
		bind:this={nextEl}
		type="button"
		aria-label="Следующее изображение"
		disabled={list.length < 2}
		onclick={() => onstep(1)}>›</button
	>
	<button
		class="lightbox__close"
		bind:this={closeEl}
		type="button"
		aria-label="Закрыть просмотр"
		onclick={() => onclose()}>×</button
	>
</div>

<style>
	.lightbox {
		position: absolute;
		inset: 0;
		z-index: 6;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: calc(clamp(2.6rem, 6vh, 3.4rem) + env(safe-area-inset-top, 0px)) clamp(1rem, 4vw, 3.4rem)
			calc(clamp(1.2rem, 4vh, 2.4rem) + env(safe-area-inset-bottom, 0px));
		opacity: 0;
		touch-action: none;
		overflow: hidden;
		transition: opacity var(--dur-enter) var(--ease-out);
	}

	.lightbox.is-open {
		opacity: 1;
	}

	.lightbox__backdrop {
		position: absolute;
		inset: 0;
		margin: 0;
		padding: 0;
		border: 0;
		-webkit-appearance: none;
		appearance: none;
		background: radial-gradient(120% 80% at 50% 42%, rgba(20, 10, 42, 0.62) 0%, rgba(3, 2, 10, 0.93) 72%);
		-webkit-backdrop-filter: blur(3px);
		backdrop-filter: blur(3px);
	}

	.lightbox__frame {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.65rem;
		max-width: 100%;
		max-height: 100%;
		margin: 0;
		opacity: 0;
		transform: scale(0.94);
		transition:
			opacity var(--dur-enter) var(--ease-out),
			transform var(--dur-enter) var(--ease-out);
	}

	.lightbox.is-open .lightbox__frame {
		opacity: 1;
		transform: none;
	}

	.lightbox__img {
		display: block;
		width: auto;
		height: auto;
		max-width: 100%;
		max-height: calc(100dvh - 11rem);
		border: 1px solid rgba(216, 198, 255, 0.16);
		border-radius: 10px;
		background: rgba(8, 5, 18, 0.6);
		box-shadow:
			0 24px 60px rgba(2, 1, 8, 0.65),
			0 0 42px rgba(120, 84, 200, 0.12);
	}

	.lightbox__caption {
		display: flex;
		align-items: baseline;
		justify-content: center;
		flex-wrap: wrap;
		gap: 0.3rem 0.7rem;
		max-width: min(92vw, 60rem);
		text-align: center;
		font-family: 'Nunito Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
		font-weight: 300;
	}

	.lightbox__counter {
		color: rgba(238, 232, 255, 0.5);
		font-size: 0.76rem;
		letter-spacing: 0.1em;
		font-variant-numeric: tabular-nums;
	}

	.lightbox__category {
		color: rgba(180, 139, 255, 0.78);
		font-size: 0.76rem;
		letter-spacing: 0.08em;
	}

	.lightbox__nav,
	.lightbox__close {
		position: absolute;
		z-index: 2;
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		padding: 0 0 3px;
		border: 1px solid rgba(216, 198, 255, 0.22);
		border-radius: 50%;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.015) 100%),
			rgba(10, 6, 22, 0.5);
		-webkit-backdrop-filter: blur(7px);
		backdrop-filter: blur(7px);
		color: rgba(246, 242, 255, 0.85);
		font-family: 'Nunito Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
		font-size: 1.4rem;
		font-weight: 300;
		line-height: 1;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition:
			color var(--dur-ui) var(--ease-ui),
			border-color var(--dur-ui) var(--ease-ui),
			transform var(--dur-fast) var(--ease-out),
			box-shadow var(--dur-ui) var(--ease-ui);
	}

	.lightbox__nav:active,
	.lightbox__close:active {
		transform: scale(0.94);
	}

	.lightbox__nav:focus-visible,
	.lightbox__close:focus-visible {
		color: #ffffff;
		border-color: rgba(180, 139, 255, 0.5);
		box-shadow: 0 0 20px rgba(180, 139, 255, 0.18);
	}

	@media (hover: hover) and (pointer: fine) {
		.lightbox__nav:hover,
		.lightbox__close:hover {
			color: #ffffff;
			border-color: rgba(180, 139, 255, 0.5);
			box-shadow: 0 0 20px rgba(180, 139, 255, 0.18);
		}
	}

	.lightbox__nav:focus,
	.lightbox__close:focus {
		outline: none;
	}

	.lightbox__nav:focus-visible,
	.lightbox__close:focus-visible {
		outline: 1px solid rgba(216, 198, 255, 0.55);
		outline-offset: 3px;
	}

	.lightbox__nav {
		top: 50%;
		translate: 0 -50%;
	}

	.lightbox__nav--prev {
		left: clamp(0.6rem, 1.6vw, 1.6rem);
	}

	.lightbox__nav--next {
		right: clamp(0.6rem, 1.6vw, 1.6rem);
	}

	.lightbox__close {
		top: calc(clamp(0.6rem, 2vh, 1.1rem) + env(safe-area-inset-top, 0px));
		right: clamp(0.6rem, 1.6vw, 1.4rem);
	}

	@media (max-width: 640px) {
		.lightbox {
			padding: calc(3.1rem + env(safe-area-inset-top, 0px)) 0.9rem
				calc(5.4rem + env(safe-area-inset-bottom, 0px));
		}

		.lightbox__img {
			max-width: calc(100vw - 1.8rem);
			max-height: calc(100dvh - 15rem);
			border-radius: 8px;
		}

		.lightbox__caption {
			max-width: calc(100vw - 8.5rem);
			gap: 0.25rem 0.55rem;
		}

		.lightbox__nav {
			top: auto;
			bottom: max(1rem, env(safe-area-inset-bottom, 0px));
			translate: none;
			width: 52px;
			height: 52px;
		}

		.lightbox__nav--prev {
			left: 1rem;
		}

		.lightbox__nav--next {
			right: 1rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.lightbox__frame {
			transform: none;
			transition: opacity var(--dur-enter) var(--ease-out);
		}

		.lightbox.is-open .lightbox__frame {
			transform: none;
		}

		.lightbox__nav:active,
		.lightbox__close:active {
			transform: none;
		}
	}
</style>
