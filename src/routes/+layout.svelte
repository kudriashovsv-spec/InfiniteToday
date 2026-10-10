<script>
	import { onMount } from 'svelte';
	import '../app.css';
	import { asset } from '$app/paths';
	import GlobalPlayer from '#lib/components/GlobalPlayer.svelte';
	import Analytics from '#lib/components/Analytics.svelte';
	import { initFavorites } from '#lib/favorites.svelte.js';

	let { children } = $props();

	// Избранное живёт в localStorage: читаем его один раз на клиенте, поэтому
	// SSR-разметка и первый рендер совпадают — ошибок гидратации нет.
	onMount(() => {
		initFavorites();
	});
</script>

<svelte:head>
	<link rel="icon" type="image/png" href={asset('favicon.png')} />
</svelte:head>

<main>
	{@render children()}
</main>

<!-- Глобальный L1 player: persistent <audio>, переживает любые route transitions. -->
<GlobalPlayer />

<!-- Client-only analytics: без разметки, disabled без site code. -->
<Analytics />
