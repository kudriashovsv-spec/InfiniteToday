<script>
	import GalleryView from '#lib/components/GalleryView.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { galleryStats } from '#lib/data/gallery.js';
	import { pluralRu } from '#lib/seo.js';

	const description = `Галерея Infinite Today: ${galleryStats.categories} ${pluralRu(galleryStats.categories, 'категория', 'категории', 'категорий')} и ${galleryStats.images} ${pluralRu(galleryStats.images, 'работа', 'работы', 'работ')} вокруг музыки и миров.`;
</script>

<Seo
	title="Галерея — Infinite Today"
	{description}
	path="/gallery"
	image="images/MainPageLvl1.webp"
	imageAlt="Галерея работ Infinite Today"
/>

<div class="screen screen--gallery">
	<GalleryView />
</div>

<style>
	.screen--gallery {
		background:
			radial-gradient(115% 75% at 50% -12%, rgba(124, 88, 214, 0.16) 0%, rgba(5, 3, 12, 0) 62%),
			radial-gradient(90% 60% at 50% 118%, rgba(255, 138, 92, 0.1) 0%, rgba(5, 3, 12, 0) 58%),
			var(--bg-base);
	}
</style>
