<script>
	import { onMount } from 'svelte';
	import AudioDNA from '#lib/components/AudioDNA.svelte';
	import ButterchurnCanvas from '#lib/components/ButterchurnCanvas.svelte';
	import WorldView from '#lib/components/WorldView.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { absoluteUrl, pluralRu } from '#lib/seo.js';
	import { isSupported } from '#lib/audio/butterchurn.js';

	/**
	 * @type {{
	 *   data: {
	 *     world: { slug: string, title: string, artwork: string, panelShift: boolean },
	 *     tracks: { id: string, title: string, genre: string, src: string }[],
	 *     lyrics: string
	 *   }
	 * }}
	 */
	let { data } = $props();

	// Один visualizer slot (модель v1.1): каноническая версия → Butterchurn;
	// Audio DNA — альтернатива/fallback, когда Butterchurn (WebGL2) недоступен.
	// Одновременно рендерится ровно ОДИН визуализатор, не overlay.
	// SSR/prerender по умолчанию отдаёт Butterchurn; выбор уточняется на клиенте.
	let butterchurn = $state(true);
	onMount(() => {
		butterchurn = isSupported();
	});
</script>

<Seo
	title={`${data.world.title} — мир песни | Infinite Today`}
	description={`Мир песни «${data.world.title}»: ${data.tracks.length} ${pluralRu(data.tracks.length, 'версия', 'версии', 'версий')} со словами и аудиовизуализацией. Infinite Today.`}
	path={`/world/${data.world.slug}`}
	image={data.world.artwork}
	imageAlt={`Артворк мира «${data.world.title}»`}
	jsonLd={{
		'@context': 'https://schema.org',
		'@type': 'MusicComposition',
		name: data.world.title,
		inLanguage: 'ru',
		url: absoluteUrl(`/world/${data.world.slug}`)
	}}
/>

<div class="screen screen--world">
	<!-- Визуализатор L3 — ровно один слот. Butterchurn остаётся основным, а
	     artwork мира служит только мобильной карточкой на L2. Audio DNA —
	     альтернативный движок того же слота, если Butterchurn недоступен. -->
	{#if butterchurn}
		<ButterchurnCanvas />
	{:else}
		<AudioDNA />
	{/if}
	<WorldView world={data.world} tracks={data.tracks} lyrics={data.lyrics} />
</div>

<style>
	.screen--world {
		background:
			radial-gradient(90% 70% at 50% 38%, rgba(96, 64, 168, 0.22), rgba(5, 3, 12, 0) 66%),
			var(--bg-base);
	}
</style>
