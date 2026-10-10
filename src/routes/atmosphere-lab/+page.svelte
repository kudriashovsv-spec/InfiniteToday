<script lang="ts">
	import { onMount, type Component } from 'svelte';

	// Atmosphere Lab — внутренняя страница ТОЛЬКО для разработки.
	//
	// Сайт статический (adapter-static, prerender), поэтому маршрут существует и в
	// production. Чтобы прототип не попал на рабочий сайт: `import.meta.env.DEV` в
	// собранном приложении всегда false → динамический import вырезается (код
	// лаборатории и движка не попадают в бандл), а страница рендерит только
	// заглушку. В навигацию и sitemap маршрут не добавлен.
	const loadLab = import.meta.env.DEV ? () => import('#lib/components/AtmosphereLab.svelte') : null;

	let Lab = $state<Component | null>(null);

	onMount(async () => {
		if (loadLab) Lab = (await loadLab()).default;
	});
</script>

<svelte:head>
	<title>Atmosphere Lab (dev)</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="screen screen--lab">
	{#if Lab}
		<Lab />
	{:else}
		<p class="lab-stub">Atmosphere Lab доступна только в режиме разработки.</p>
	{/if}
</div>

<style>
	.screen--lab {
		overflow: auto;
		padding: 1.4rem clamp(1rem, 4vw, 2.4rem);
	}
	.lab-stub {
		color: var(--text-dim);
		font-family: 'Nunito Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
	}
</style>
