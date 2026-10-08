<script lang="ts">
	import { asset } from '$app/paths';
	import type { AssetPath } from '$app/types';
	import { galleryDir, fileOf, type GalleryWork } from '#lib/data/gallery.js';
	import Lightbox from './Lightbox.svelte';

	/**
	 * Desktop-only вход «Концепт-арт» на странице мира (L3).
	 *
	 * Получает уже найденную работу из галереи (`GalleryWork`) — поиск делает
	 * data layer (`conceptArtFor`), здесь нет ни хардкода путей, ни дубля
	 * gallery-логики. Миниатюра берётся из `sm`-варианта, крупные варианты
	 * (md/lg) грузит существующий Lightbox только при открытии.
	 *
	 * На mobile (≤ 640px) элемент полностью скрыт: фича сознательно desktop-only.
	 */
	interface ConceptArtProps {
		work: GalleryWork;
		/** название мира — только для aria-label */
		worldTitle: string;
	}

	let { work, worldTitle }: ConceptArtProps = $props();

	const thumb = $derived(fileOf(work, 'sm'));
	const thumbSrc = $derived(asset(`${galleryDir}/${thumb.path}` as AssetPath));

	let open = $state(false);
	let buttonEl: HTMLButtonElement | null = $state(null);
	// Возврат фокуса нужен только после реального закрытия (не при монтировании).
	let shouldReturnFocus = false;

	function openLightbox(): void {
		shouldReturnFocus = true;
		open = true;
	}

	function closeLightbox(): void {
		open = false;
	}

	// Lightbox сам не возвращает фокус (это делает GalleryView). На странице мира
	// возвращаем фокус на кнопку после закрытия.
	$effect(() => {
		if (open || !shouldReturnFocus) return;
		shouldReturnFocus = false;
		requestAnimationFrame(() => buttonEl?.focus({ preventScroll: true }));
	});
</script>

<button
	class="concept-art"
	type="button"
	bind:this={buttonEl}
	aria-haspopup="dialog"
	aria-label={`Открыть концепт-арт мира «${worldTitle}»`}
	onclick={openLightbox}
>
	<span class="concept-art__thumb" aria-hidden="true">
		<img
			class="concept-art__img"
			src={thumbSrc}
			width={thumb.w}
			height={thumb.h}
			alt=""
			loading="lazy"
			decoding="async"
		/>
	</span>
	<span class="concept-art__label">Концепт-арт</span>
</button>

{#if open}
	<!-- Одна картинка: стрелки prev/next отключены штатным `list.length < 2`. -->
	<Lightbox list={[work]} index={0} onstep={() => {}} onclose={closeLightbox} />
{/if}

<style>
	.concept-art {
		position: absolute;
		z-index: 3;
		right: clamp(1rem, 3vw, 2rem);
		bottom: calc(clamp(1rem, 3vh, 2rem) + env(safe-area-inset-bottom, 0px));
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.35rem 0.9rem 0.35rem 0.35rem;
		border: 1px solid rgba(190, 200, 255, 0.16);
		border-radius: 999px;
		background: rgba(9, 10, 26, 0.42);
		color: rgba(238, 232, 255, 0.82);
		font-family: 'Nunito Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
		font-size: 0.72rem;
		font-weight: 300;
		letter-spacing: 0.08em;
		cursor: pointer;
		box-shadow: 0 8px 28px rgba(3, 4, 14, 0.45);
		backdrop-filter: blur(10px) saturate(1.15);
		-webkit-backdrop-filter: blur(10px) saturate(1.15);
		transition:
			color var(--dur-ui) var(--ease-ui),
			background var(--dur-ui) var(--ease-ui),
			border-color var(--dur-ui) var(--ease-ui),
			transform var(--dur-fast) var(--ease-out);
		-webkit-tap-highlight-color: transparent;
	}

	.concept-art:active {
		transform: scale(0.97);
	}

	.concept-art:focus {
		outline: none;
	}

	.concept-art:focus-visible {
		outline: 1px solid rgba(216, 198, 255, 0.6);
		outline-offset: 4px;
	}

	@media (hover: hover) and (pointer: fine) {
		.concept-art:hover {
			color: #f4f0ff;
			background: rgba(9, 10, 26, 0.58);
			border-color: rgba(190, 200, 255, 0.3);
		}
	}

	.concept-art__thumb {
		flex: none;
		width: 2.2rem;
		height: 2.2rem;
		border-radius: 9px;
		overflow: hidden;
		box-shadow: inset 0 0 0 1px rgba(216, 198, 255, 0.18);
	}

	.concept-art__img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.concept-art__label {
		white-space: nowrap;
	}

	/* Desktop-only: на mobile фича не показывается и не участвует в layout. */
	@media (max-width: 640px) {
		.concept-art {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.concept-art {
			transition: none;
		}

		.concept-art:active {
			transform: none;
		}
	}
</style>
