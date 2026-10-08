<script lang="ts">
	import {
		absoluteUrl,
		absoluteAsset,
		imageMimeType,
		DEFAULT_IMAGE,
		SITE_NAME,
		SITE_LOCALE
	} from '#lib/seo.js';

	/**
	 * Единый источник head-метаданных страницы: title, description, canonical,
	 * Open Graph и Twitter/X. Каждая страница задаёт только своё содержимое.
	 * Компонент SSR-safe: никаких браузерных API, только разметка.
	 */
	interface SeoProps {
		title: string;
		description: string;
		/** root-relative путь страницы без base: `/`, `/space`, `/world/posik` */
		path: string;
		/** изображение относительно static/; по умолчанию — главный экран */
		image?: string;
		imageAlt?: string;
		/** необязательные реальные размеры изображения (для og:image:width/height) */
		imageWidth?: number;
		imageHeight?: number;
		/** Open Graph type; для статического сайта — website */
		type?: string;
		/** опциональная JSON-LD структура (рендерится как application/ld+json) */
		jsonLd?: Record<string, unknown>;
	}

	let {
		title,
		description,
		path,
		image = DEFAULT_IMAGE,
		imageAlt = SITE_NAME,
		imageWidth,
		imageHeight,
		type = 'website',
		jsonLd
	}: SeoProps = $props();

	const canonical = $derived(absoluteUrl(path));
	const imageUrl = $derived(absoluteAsset(image));
	// MIME выводится из фактического расширения: OG-картинки могут быть JPEG или WebP,
	// и объявленный `og:image:type` должен совпадать с реально отдаваемым файлом.
	const imageType = $derived(imageMimeType(image));
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonical} />

	<meta property="og:type" content={type} />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:locale" content={SITE_LOCALE} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonical} />
	<meta property="og:image" content={imageUrl} />
	<meta property="og:image:type" content={imageType} />
	{#if imageWidth}<meta property="og:image:width" content={String(imageWidth)} />{/if}
	{#if imageHeight}<meta property="og:image:height" content={String(imageHeight)} />{/if}
	<meta property="og:image:alt" content={imageAlt} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={imageUrl} />
	<meta name="twitter:image:alt" content={imageAlt} />

	{#if jsonLd}
		{@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`}
	{/if}
</svelte:head>
