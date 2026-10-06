<script>
	import { asset } from '$app/paths';
	import { galleryDir, fileOf } from '#lib/data/gallery.js';

	/**
	 * Одна карточка галереи. Отдаёт браузеру готовый srcset из production-
	 * вариантов (sm + md; lg — только для lightbox) и резервирует пропорцию
	 * через width/height из манифеста. Картинка грузится лениво.
	 *
	 * @type {{ work: import('#lib/data/gallery.js').GalleryWork, onopen: (id: string, el: HTMLElement) => void }}
	 */
	let { work, onopen } = $props();

	const sm = $derived(fileOf(work, 'sm'));
	const md = $derived(fileOf(work, 'md'));
	const src = $derived(asset(`${galleryDir}/${sm.path}`));
	const srcset = $derived(
		md.path !== sm.path
			? `${asset(`${galleryDir}/${sm.path}`)} ${sm.w}w, ${asset(`${galleryDir}/${md.path}`)} ${md.w}w`
			: `${asset(`${galleryDir}/${sm.path}`)} ${sm.w}w`
	);
</script>

<button
	class="gcard"
	type="button"
	data-gallery-id={work.id}
	aria-label={`Открыть изображение: ${work.title}`}
	onclick={(event) => onopen(work.id, /** @type {HTMLElement} */ (event.currentTarget))}
>
	<img
		class="gcard__img"
		{src}
		{srcset}
		sizes="(max-width: 640px) 45vw, (max-width: 820px) 30vw, 300px"
		width={sm.w}
		height={sm.h}
		alt={work.title}
		loading="lazy"
		decoding="async"
	/>
</button>

<style>
	.gcard {
		position: relative;
		display: block;
		width: 100%;
		margin: 0 0 var(--tile-gap, 14px) 0;
		padding: 0;
		overflow: hidden;
		border: 1px solid rgba(216, 198, 255, 0.13);
		border-radius: 10px;
		background: rgba(12, 8, 24, 0.55);
		cursor: pointer;
		/* waterfall: карточка не разрывается между колонками */
		break-inside: avoid;
		-webkit-tap-highlight-color: transparent;
	}

	.gcard__img {
		display: block;
		width: 100%;
		height: auto;
	}

	@media (hover: hover) and (pointer: fine) {
		.gcard {
			transition:
				border-color 280ms var(--ease-soft),
				transform 280ms var(--ease-soft),
				box-shadow 280ms var(--ease-soft);
		}

		.gcard:hover {
			border-color: rgba(180, 139, 255, 0.42);
			transform: translateY(-2px);
			box-shadow:
				0 12px 28px rgba(3, 2, 10, 0.55),
				0 0 20px rgba(180, 139, 255, 0.12);
		}
	}

	.gcard:focus {
		outline: none;
	}

	.gcard:focus-visible {
		outline: 1px solid rgba(216, 198, 255, 0.55);
		outline-offset: 3px;
	}
</style>
