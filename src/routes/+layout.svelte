<script>
	import '../app.css';
	import { asset } from '$app/paths';
	import GlobalPlayer from '#lib/components/GlobalPlayer.svelte';
	import Analytics from '#lib/components/Analytics.svelte';

	let { children } = $props();
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
