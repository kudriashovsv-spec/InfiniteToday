<script>
	import { onMount } from 'svelte';
	import { asset } from '$app/paths';
	import { galleryDir, fileOf, categories } from '#lib/data/gallery.js';

	/**
	 * Lightbox галереи: оверлей поверх списка, без новой страницы.
	 * Презентация + клавиатура + свайп. История/навигация — на стороне
	 * GalleryView (SvelteKit shallow state), здесь только показ.
	 *
	 * @type {{
	 *   list: import('#lib/data/gallery.js').GalleryWork[],
	 *   index: number,
	 *   onstep: (delta: number) => void,
	 *   onclose: () => void
	 * }}
	 */
	let { list, index, onstep, onclose } = $props();

	const image = $derived(list[index]);

	/** @type {HTMLImageElement | null} */
	let imgEl = $state(null);
	/** @type {HTMLElement | null} */
	let frameEl = $state(null);
	/** @type {HTMLButtonElement | null} */
	let closeEl = $state(null);
	/** @type {HTMLButtonElement | null} */
	let prevEl = $state(null);
	/** @type {HTMLButtonElement | null} */
	let nextEl = $state(null);

	let shown = $state(false);
	let imageToken = 0;
	/** @type {Set<string>} */
	const preloaded = new Set();

	const categoryTitle = $derived(
		(image && categories.find((c) => c.slug === image.category)?.title) || ''
	);

	// md сразу (обычно уже в кэше карточки), затем lg — подмена после декодирования.
	function loadImage(work) {
		if (!imgEl || !work) return;
		const medium = fileOf(work, 'md');
		const large = fileOf(work, 'lg');
		const token = ++imageToken;
		imgEl.width = medium.w;
		imgEl.height = medium.h;
		imgEl.src = asset(`${galleryDir}/${medium.path}`);
		if (large.path === medium.path) {
			preloadNeighbours();
			return;
		}
		const probe = new Image();
		probe.decoding = 'async';
		const swap = () => {
			if (token !== imageToken || !imgEl) return;
			imgEl.width = large.w;
			imgEl.height = large.h;
			imgEl.src = asset(`${galleryDir}/${large.path}`);
		};
		probe.onload = () => {
			if (typeof probe.decode === 'function') probe.decode().then(swap, swap);
			else swap();
		};
		preloadNeighbours();
		probe.src = asset(`${galleryDir}/${large.path}`);
	}

	// Предзагрузка соседей — только ±1, по простою.
	function preloadNeighbours() {
		if (list.length < 2) return;
		const run = () => {
			for (const step of [1, -1]) {
				const neighbor = list[(index + step + list.length) % list.length];
				const large = neighbor && neighbor.files.lg;
				if (!large || preloaded.has(large.path)) continue;
				preloaded.add(large.path);
				const probe = new Image();
				probe.decoding = 'async';
				probe.src = asset(`${galleryDir}/${large.path}`);
			}
		};
		const ric = /** @type {any} */ (window).requestIdleCallback;
		if (ric) ric(run, { timeout: 1500 });
		else window.setTimeout(run, 300);
	}

	/** @param {KeyboardEvent} event */
	function onKeydown(event) {
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
		const controls = [prevEl, nextEl, closeEl].filter((el) => el && !el.disabled);
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

	/** @param {PointerEvent} event */
	let swipe = null;
	function onPointerDown(event) {
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		swipe = { x: event.clientX, y: event.clientY, id: event.pointerId };
	}
	function onPointerUp(event) {
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
	<div class="lightbox__backdrop" onclick={() => onclose()}></div>

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
		padding: clamp(2.6rem, 6vh, 3.4rem) clamp(1rem, 4vw, 3.4rem) clamp(1.2rem, 4vh, 2.4rem);
		opacity: 0;
		touch-action: none;
		transition: opacity 240ms var(--ease-soft);
	}

	.lightbox.is-open {
		opacity: 1;
	}

	.lightbox__backdrop {
		position: absolute;
		inset: 0;
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
			opacity 260ms var(--ease-soft),
			transform 320ms var(--ease-soft);
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
		max-height: calc(100vh - 11rem);
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
			color 260ms var(--ease-soft),
			border-color 260ms var(--ease-soft),
			box-shadow 260ms var(--ease-soft);
	}

	.lightbox__nav:hover,
	.lightbox__nav:focus-visible,
	.lightbox__close:hover,
	.lightbox__close:focus-visible {
		color: #ffffff;
		border-color: rgba(180, 139, 255, 0.5);
		box-shadow: 0 0 20px rgba(180, 139, 255, 0.18);
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
		top: clamp(0.6rem, 2vh, 1.1rem);
		right: clamp(0.6rem, 1.6vw, 1.4rem);
	}

	@media (max-width: 640px) {
		.lightbox {
			padding: 3.1rem 0.9rem 5.4rem;
		}

		.lightbox__img {
			max-width: calc(100vw - 1.8rem);
			max-height: calc(100vh - 15rem);
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
</style>
