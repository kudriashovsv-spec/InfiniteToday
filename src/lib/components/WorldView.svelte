<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Track } from '#lib/data/music.js';
	import type { World } from '#lib/data/worlds.js';
	import TrackPlayer from './TrackPlayer.svelte';
	import LyricsPanel from './LyricsPanel.svelte';
	import BackLink from './BackLink.svelte';
	import ShareButton from './ShareButton.svelte';

	/**
	 * Переиспользуемый мир песни (L3) — зародыш будущего `SongWorld`.
	 * Получает данные и не знает ни одного конкретного мира, трека или текста:
	 * все 7 миров рисует этот же компонент.
	 */
	interface WorldViewProps {
		world: World;
		tracks: Track[];
		lyrics: string;
	}

	let { world, tracks, lyrics }: WorldViewProps = $props();
</script>

<BackLink href={resolve('/space')} ariaLabel="Вернуться в космос" />

<h1 class="song-title">{world.title}</h1>

<div class="song-panel" class:is-shifted={world.panelShift}>
	{#each tracks as track (track.id)}
		<div class="track">
			<p class="track__genre">{track.genre}</p>
			<TrackPlayer {track} />
		</div>
	{/each}

	{#if lyrics}
		<LyricsPanel text={lyrics} />
	{/if}

	<ShareButton
		path={`/world/${world.slug}`}
		title={`${world.title} — Infinite Today`}
		text={`Мир песни «${world.title}» в музыкальной лаборатории Infinite Today.`}
	/>
</div>

<style>
	.song-title {
		position: absolute;
		z-index: 2;
		top: calc(clamp(1rem, 3.6vh, 2.4rem) + env(safe-area-inset-top, 0px));
		left: 50%;
		translate: -50% 0;
		margin: 0;
		max-width: 94vw;
		font-family: 'Nunito Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
		font-size: clamp(1.9rem, 5.4vw, 4.2rem);
		font-weight: 200;
		letter-spacing: 0.24em;
		text-indent: 0.24em;
		text-transform: uppercase;
		white-space: nowrap;
		color: rgba(250, 247, 255, 0.94);
		text-shadow:
			0 1px 2px rgba(3, 4, 14, 0.95),
			0 2px 12px rgba(3, 4, 14, 0.9),
			0 0 26px rgba(3, 4, 14, 0.7),
			0 0 48px rgba(120, 160, 255, 0.32);
		pointer-events: none;
	}

	.song-panel {
		position: absolute;
		z-index: 2;
		top: calc(clamp(3rem, 8.4vh, 4.6rem) + env(safe-area-inset-top, 0px));
		left: clamp(0.9rem, 3vw, 2rem);
		width: clamp(280px, 27vw, 360px);
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.7rem;
	}

	/* Длинный заголовок мира заходит на блок — сдвигаем саму панель.
	   Это различие ДАННЫХ (world.panelShift), а не отдельная страница. */
	.song-panel.is-shifted {
		top: calc(clamp(3rem, 8.4vh, 4.6rem) + 2cm + env(safe-area-inset-top, 0px));
	}

	.track {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.28rem;
	}

	.track__genre {
		margin: 0;
		padding-left: 0.2rem;
		font-size: 0.72rem;
		font-weight: 300;
		letter-spacing: 0.1em;
		color: rgba(238, 232, 255, 0.8);
		text-shadow: 0 1px 5px rgba(3, 4, 14, 0.9);
	}

	@media (max-width: 640px) {
		.song-title {
			top: calc(2.6rem + env(safe-area-inset-top, 0px));
			font-size: clamp(1.4rem, 6.4vw, 2rem);
			letter-spacing: 0.1em;
			text-indent: 0.1em;
		}

		.song-panel {
			top: calc(5.6rem + env(safe-area-inset-top, 0px));
			left: 0.8rem;
			right: 0.8rem;
			width: auto;
		}

		.song-panel.is-shifted {
			top: calc(5.6rem + 1cm + env(safe-area-inset-top, 0px));
		}
	}
</style>
