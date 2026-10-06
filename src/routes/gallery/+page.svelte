<script>
	import GalleryView from '#lib/components/GalleryView.svelte';
</script>

<svelte:head>
	<title>Галерея — Infinite Today</title>
	<meta name="description" content="Галерея работ Infinite Today: 11 категорий, 99 работ." />
</svelte:head>

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
