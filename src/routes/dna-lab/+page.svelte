<script lang="ts">
	import { onMount, type Component } from 'svelte';

	// DNA Morph Lab — внутренняя страница ТОЛЬКО для разработки.
	//
	// Сайт полностью статический (adapter-static, prerender), поэтому маршрут
	// существует и в production. Чтобы лаборатория не стала рабочим инструментом
	// на production-сайте: `import.meta.env.DEV` в собранном приложении всегда
	// false, поэтому динамический import вырезается (код лаборатории не попадает
	// в бандл), а страница рендерит только заглушку. В навигацию и sitemap
	// маршрут не добавлен.
	const loadLab = import.meta.env.DEV ? () => import('#lib/components/DnaMorphLab.svelte') : null;

	let Lab = $state<Component | null>(null);

	onMount(async () => {
		if (loadLab) Lab = (await loadLab()).default;
	});
</script>

<svelte:head>
	<title>DNA Morph Lab (dev)</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="screen screen--lab">
	{#if Lab}
		<Lab />
	{:else}
		<p class="lab-stub">DNA Morph Lab доступна только в режиме разработки.</p>
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
