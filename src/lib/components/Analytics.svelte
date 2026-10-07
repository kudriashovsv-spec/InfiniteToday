<script>
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { initAnalytics, pageview } from '#lib/analytics.js';

	/**
	 * Невидимая инфраструктура аналитики: без разметки и без UI.
	 * Инициализирует провайдера (client-only) и считает pageview на каждый
	 * SPA-переход — afterNavigate срабатывает и на первой загрузке, поэтому
	 * отдельный initial-pageview не нужен и дублей нет.
	 */
	onMount(() => {
		initAnalytics();
	});

	afterNavigate((navigation) => {
		initAnalytics();
		if (navigation.to) pageview(navigation.to.url.pathname);
	});
</script>
