<script lang="ts">
	import { resolve, asset } from '$app/paths';
	import type { AssetPath } from '$app/types';

	/**
	 * Мобильная карточка мира (portrait ≤ 640px). На desktop список карточек
	 * скрыт, там работает карта с точками входа.
	 */
	interface WorldCardProps {
		world: { slug: string; title: string; artwork: string };
	}

	let { world }: WorldCardProps = $props();
</script>

<a class="world-card" href={resolve('/world/[slug]', { slug: world.slug })} aria-label={`Открыть мир песни «${world.title}»`}>
	<span class="world-card__media">
		<img class="world-card__img" src={asset(world.artwork as AssetPath)} alt="" loading="lazy" decoding="async" />
	</span>
	<span class="world-card__title">{world.title}</span>
</a>

<style>
	.world-card {
		position: relative;
		flex: none;
		display: block;
		width: 100%;
		padding: 0;
		border: 1px solid rgba(190, 200, 255, 0.14);
		border-radius: 18px;
		overflow: hidden;
		background: rgba(9, 10, 26, 0.5);
		color: inherit;
		font: inherit;
		text-align: left;
		text-decoration: none;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		box-shadow: 0 12px 32px rgba(3, 4, 14, 0.5);
		transition:
			transform var(--dur-ui) var(--ease-out),
			border-color var(--dur-ui) var(--ease-ui);
	}

	.world-card:active {
		transform: scale(0.985);
	}

	.world-card:focus {
		outline: none;
	}

	.world-card:focus-visible {
		outline: 2px solid rgba(216, 198, 255, 0.8);
		outline-offset: 3px;
	}

	.world-card__media {
		position: relative;
		display: block;
		aspect-ratio: 4 / 5;
		overflow: hidden;
	}

	.world-card__img {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.world-card__media::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to top,
			rgba(5, 3, 12, 0.92) 0%,
			rgba(5, 3, 12, 0.4) 38%,
			rgba(5, 3, 12, 0) 68%
		);
		pointer-events: none;
	}

	.world-card__title {
		position: absolute;
		left: 1.05rem;
		right: 1.05rem;
		bottom: 0.85rem;
		font-family: 'Nunito Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
		font-size: 1.3rem;
		font-weight: 300;
		letter-spacing: 0.05em;
		line-height: 1.1;
		color: rgba(250, 247, 255, 0.97);
		text-shadow:
			0 1px 2px rgba(3, 4, 14, 0.95),
			0 2px 14px rgba(3, 4, 14, 0.9);
	}
	@media (prefers-reduced-motion: reduce) {
		.world-card:active {
			transform: none;
		}
	}
</style>
