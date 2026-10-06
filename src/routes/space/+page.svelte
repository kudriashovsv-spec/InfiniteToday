<script>
	import { resolve } from '$app/paths';
	import Scene from '#lib/components/Scene.svelte';
	import MapHotspot from '#lib/components/MapHotspot.svelte';
	import WorldCard from '#lib/components/WorldCard.svelte';
	import BackLink from '#lib/components/BackLink.svelte';
	import { worlds } from '#lib/data/worlds.js';
</script>

<svelte:head>
	<title>Космос — Infinite Today</title>
	<meta name="description" content="Космическая карта миров Infinite Today." />
</svelte:head>

<div class="screen">
	<Scene src="images/PaigLvl2.webp" containOnNarrow>
		{#each worlds as world (world.slug)}
			<MapHotspot {world} />
		{/each}
	</Scene>

	<!-- На телефоне карта заменяется вертикальным списком миров (≤ 640px). -->
	<div class="mobile-worlds" aria-label="Миры песен">
		{#each worlds as world (world.slug)}
			<WorldCard {world} />
		{/each}
	</div>

	<BackLink href={resolve('/')} ariaLabel="Вернуться на уровень входа" />
</div>

<style>
	.mobile-worlds {
		display: none;
	}

	@media (max-width: 640px) {
		/* На телефоне карта-сцена скрыта, работает список карточек. */
		.screen :global(.scene) {
			display: none;
		}

		.mobile-worlds {
			position: absolute;
			inset: 0;
			z-index: 1;
			display: flex;
			flex-direction: column;
			gap: 1.15rem;
			padding: 3.5rem 1rem calc(1.4rem + env(safe-area-inset-bottom, 0px));
			overflow-y: auto;
			-webkit-overflow-scrolling: touch;
			scrollbar-width: thin;
			scrollbar-color: rgba(180, 165, 255, 0.4) transparent;
			background:
				radial-gradient(130% 55% at 50% 0%, rgba(96, 64, 168, 0.3), rgba(5, 3, 12, 0) 62%),
				radial-gradient(100% 45% at 50% 100%, rgba(255, 138, 92, 0.12), rgba(5, 3, 12, 0) 62%);
		}
	}
</style>
