<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { categories, works, worksIn } from '#lib/data/gallery.js';
	import BackLink from './BackLink.svelte';
	import GalleryItem from './GalleryItem.svelte';
	import Lightbox from './Lightbox.svelte';

	/**
	 * Композиция галереи: заголовок, фильтры по категориям, waterfall-сетка и
	 * lightbox. Данные — из data layer (gallery.json), ничего не дублируется.
	 * Фильтр — локальное состояние; открытый lightbox — SvelteKit shallow state,
	 * поэтому Back закрывает lightbox, а следующий Back уходит из галереи (v1.1).
	 */

	let filter: string = $state('all');
	let returnFocus: HTMLElement | null = $state(null);

	const filtered = $derived(worksIn(filter));
	const lightboxId = $derived(typeof page.state?.lightbox === 'string' ? page.state.lightbox : null);
	const lightboxIndex = $derived(lightboxId ? filtered.findIndex((work) => work.id === lightboxId) : -1);

	function openLightbox(id: string, element: HTMLElement): void {
		returnFocus = element;
		// page.url — readonly URL, а goto() в SvelteKit 3 принимает string | URL.
		goto(page.url.href, { state: { lightbox: id }, shallow: true });
	}

	function stepLightbox(delta: number): void {
		if (filtered.length < 2 || lightboxIndex < 0) return;
		const index = (lightboxIndex + delta + filtered.length) % filtered.length;
		goto(page.url.href, { state: { lightbox: filtered[index].id }, replace: true, shallow: true });
	}

	function closeLightbox(): void {
		// как v1.1: закрытие снимает запись истории
		if (page.state?.lightbox) history.back();
	}

	// вернуть фокус на карточку после закрытия lightbox
	$effect(() => {
		if (lightboxId === null && returnFocus) {
			const element = returnFocus;
			returnFocus = null;
			requestAnimationFrame(() => {
				if (element.isConnected) element.focus({ preventScroll: true });
			});
		}
	});
</script>

<div class="gallery">
	<div class="gallery__head">
		<h1 class="gallery__title">Галерея</h1>
		<div class="gallery__filters" role="group" aria-label="Фильтр по категориям">
			<button
				class="chip"
				type="button"
				aria-pressed={filter === 'all'}
				onclick={() => (filter = 'all')}
			>
				Все<span class="chip__count">{works.length}</span>
			</button>
			{#each categories as category (category.slug)}
				<button
					class="chip"
					type="button"
					aria-pressed={filter === category.slug}
					onclick={() => (filter = category.slug)}
				>
					{category.title}<span class="chip__count">{category.count}</span>
				</button>
			{/each}
		</div>
	</div>

	<div class="gallery__scroll">
		<div class="gallery__grid">
			{#each filtered as work (work.id)}
				<GalleryItem {work} onopen={openLightbox} />
			{/each}
		</div>
	</div>
</div>

<BackLink href={resolve('/')} ariaLabel="Вернуться на главный экран" />

{#if lightboxId && lightboxIndex >= 0}
	<Lightbox list={filtered} index={lightboxIndex} onstep={stepLightbox} onclose={closeLightbox} />
{/if}

<style>
	.gallery {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
	}

	.gallery__head {
		position: relative;
		z-index: 2;
		flex: 0 0 auto;
		padding: calc(clamp(3.1rem, 7.6vh, 4.4rem) + env(safe-area-inset-top, 0px)) clamp(1rem, 4vw, 3rem)
			0.5rem;
	}

	.gallery__title {
		margin: 0;
		font-family: 'Nunito Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
		font-size: clamp(1.5rem, 3.6vw, 2.6rem);
		font-weight: 200;
		letter-spacing: 0.24em;
		text-indent: 0.24em;
		text-transform: uppercase;
		text-align: center;
		color: rgba(250, 247, 255, 0.94);
		text-shadow:
			0 1px 2px rgba(3, 4, 14, 0.95),
			0 2px 12px rgba(3, 4, 14, 0.9),
			0 0 26px rgba(3, 4, 14, 0.7);
	}

	.gallery__filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
		margin-top: clamp(0.7rem, 1.8vh, 1.05rem);
		padding-bottom: 0.2rem;
	}

	.chip {
		flex: 0 0 auto;
		display: inline-flex;
		align-items: baseline;
		gap: 0.42em;
		padding: 0.34rem 0.78rem;
		border: 1px solid rgba(216, 198, 255, 0.16);
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.028);
		color: rgba(238, 232, 255, 0.68);
		font-family: 'Nunito Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
		font-size: 0.78rem;
		font-weight: 300;
		letter-spacing: 0.05em;
		white-space: nowrap;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition:
			color var(--dur-ui) var(--ease-ui),
			border-color var(--dur-ui) var(--ease-ui),
			transform var(--dur-fast) var(--ease-out),
			background-color var(--dur-ui) var(--ease-ui);
	}

	.chip:active {
		transform: scale(0.97);
	}

	.chip:focus-visible {
		color: #ffffff;
		border-color: rgba(216, 198, 255, 0.4);
	}

	@media (hover: hover) and (pointer: fine) {
		.chip:hover {
			color: #ffffff;
			border-color: rgba(216, 198, 255, 0.4);
		}
	}

	.chip:focus {
		outline: none;
	}

	.chip:focus-visible {
		outline: 1px solid rgba(216, 198, 255, 0.55);
		outline-offset: 3px;
	}

	.chip[aria-pressed='true'] {
		color: #f6f2ff;
		border-color: rgba(180, 139, 255, 0.62);
		background: rgba(180, 139, 255, 0.14);
		box-shadow: 0 0 14px rgba(180, 139, 255, 0.16);
	}

	.chip__count {
		font-size: 0.68rem;
		letter-spacing: 0.02em;
		color: rgba(238, 232, 255, 0.42);
	}

	.chip[aria-pressed='true'] .chip__count {
		color: rgba(246, 242, 255, 0.72);
	}

	.gallery__scroll {
		position: relative;
		z-index: 2;
		flex: 1 1 auto;
		overflow-y: auto;
		overflow-x: hidden;
		overscroll-behavior: contain;
		padding: 0.4rem clamp(1rem, 4vw, 3rem) clamp(1.4rem, 5vh, 3rem);
	}

	/* Waterfall на CSS columns: без JS-раскладки, span-математики и
	   ResizeObserver. Картинки сохраняют пропорции (width:100%;height:auto),
	   карточки не разрываются между колонками. */
	.gallery__grid {
		--tile-gap: 14px;
		column-width: 280px;
		column-gap: var(--tile-gap);
	}

	@media (max-width: 820px) {
		.gallery__head {
			padding-top: 3rem;
		}

		.gallery__grid {
			column-width: 180px;
		}
	}

	@media (max-width: 640px) {
		.gallery__head {
			padding-top: 2.7rem;
		}

		.gallery__title {
			font-size: 1.45rem;
			letter-spacing: 0.2em;
			text-indent: 0.2em;
		}

		.gallery__filters {
			flex-wrap: nowrap;
			overflow-x: auto;
			overscroll-behavior-x: contain;
			scrollbar-width: none;
			-webkit-overflow-scrolling: touch;
		}

		.gallery__filters::-webkit-scrollbar {
			display: none;
		}

		.chip {
			min-height: 36px;
			padding: 0.42rem 0.72rem;
		}

		.gallery__grid {
			column-width: 146px;
			--tile-gap: 12px;
		}
	}
</style>
