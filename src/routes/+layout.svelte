<script>
	import '../app.css';
	import { asset } from '$app/paths';
	import GlobalPlayer from '#lib/components/GlobalPlayer.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>Infinite Today — Music Laboratory</title>
	<link rel="icon" type="image/png" href={asset('favicon.png')} />
</svelte:head>

{@render children()}

<!-- Глобальный L1 player: persistent <audio>, переживает любые route transitions. -->
<GlobalPlayer />
