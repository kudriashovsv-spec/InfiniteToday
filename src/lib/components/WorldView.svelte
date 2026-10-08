<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Track } from '#lib/data/music.js';
	import type { World } from '#lib/data/worlds.js';
	import { conceptArtFor } from '#lib/data/gallery.js';
	import TrackPlayer from './TrackPlayer.svelte';
	import LyricsPanel from './LyricsPanel.svelte';
	import BackLink from './BackLink.svelte';
	import ShareButton from './ShareButton.svelte';
	import ConceptArt from './ConceptArt.svelte';
	import TrackDna from './TrackDna.svelte';
	import SongDna from './SongDna.svelte';
	import { getDna } from '#lib/data/dna.js';

	/**
	 * Переиспользуемый мир песни (L3) — зародыш будущего `SongWorld`.
	 * Получает данные и не знает ни одного конкретного мира, трека или текста:
	 * все миры рисует этот же компонент.
	 */
	interface WorldViewProps {
		world: World;
		tracks: Track[];
		lyrics: string;
		/** id версии, чью DNA сейчас показывают в главном слоте (desktop) */
		selectedDnaId: string;
		/** выбрать версию для главной DNA (playback не меняется) */
		onSelectDna: (id: string) => void;
	}

	let { world, tracks, lyrics, selectedDnaId, onSelectDna }: WorldViewProps = $props();

	// Концепт-арт мира из существующей галереи («Концепты миров»).
	// Поиск работы делает data layer (`conceptArtFor`), UI не хардкодит пути.
	const conceptArt = $derived(conceptArtFor(world.slug));

	// Mobile: DNA видна ровно пока версия реально играет (playing, а не клик).
	let playingId = $state<string | null>(null);
	// Раскрытые lyrics занимают нижнюю половину mobile-экрана — DNA уступает им.
	let lyricsOpen = $state(false);

	// Единое правило: DNA visible = track is actually playing AND lyrics closed.
	const mobileDna = $derived(playingId && !lyricsOpen ? getDna(playingId) : undefined);

	// Опциональные world-specific настройки заголовка L3 (из data layer):
	// вертикальный сдвиг на Desktop и ограничение ширины на Mobile.
	const titleStyle = $derived(
		[
			world.titleShift ? `--title-shift:${world.titleShift}` : '',
			world.titleMobileMaxWidth ? `--title-mobile-max:${world.titleMobileMaxWidth}` : ''
		]
			.filter(Boolean)
			.join(';')
	);
</script>

<BackLink href={resolve('/space')} ariaLabel="Вернуться в космос" />

<h1 class="song-title" style={titleStyle || undefined}>{world.title}</h1>

<div
	class="song-panel"
	class:is-shifted={world.panelShift}
	class:is-shifted-desktop={world.panelShiftDesktop}
>
	{#each tracks as track (track.id)}
		<div class="track">
			<p class="track__genre">{track.genre}</p>
			<div class="track__row">
				<TrackPlayer
					{track}
					onplaystart={() => (playingId = track.id)}
					onplaystop={() => {
						if (playingId === track.id) playingId = null;
					}}
				/>
				<TrackDna
					trackId={track.id}
					trackTitle={track.title}
					selected={selectedDnaId === track.id}
					onselect={() => onSelectDna(track.id)}
				/>
			</div>
		</div>
	{/each}

	{#if lyrics}
		<LyricsPanel text={lyrics} onopenchange={(value) => (lyricsOpen = value)} />
	{/if}

	<ShareButton
		path={`/world/${world.slug}`}
		title={`${world.title} — Infinite Today`}
		text={`Мир песни «${world.title}» в музыкальной лаборатории Infinite Today.`}
	/>
</div>

{#if conceptArt}
	<ConceptArt work={conceptArt} worldTitle={world.title} />
{/if}

{#if mobileDna}
	<div class="mobile-dna">
		<SongDna values={mobileDna.values} morphology={mobileDna.morphology} />
	</div>
{/if}

<style>
	.song-title {
		position: absolute;
		z-index: 2;
		top: calc(clamp(1rem, 3.6vh, 2.4rem) + env(safe-area-inset-top, 0px) + var(--title-shift, 0px));
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
	/* Длинный заголовок мира и DNA-сдвиг на desktop дают одинаковый +2 cm.
	   На mobile сдвигается только `.is-shifted` (длинный заголовок). */
	.song-panel.is-shifted,
	.song-panel.is-shifted-desktop {
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

	/* Строка «player + DNA»: кнопка DNA справа, player занимает остальное. */
	.track__row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
	}

	/* Mobile: DNA запущенной версии поверх artwork, в нижней половине экрана.
	   На desktop скрыта — там DNA открывается кнопкой рядом с player. */
	.mobile-dna {
		position: absolute;
		z-index: 2;
		left: 50%;
		bottom: calc(env(safe-area-inset-bottom, 0px) + 1.4rem);
		translate: -50% 0;
		width: min(258px, 74vw);
		padding: 0.55rem 0.6rem 0.5rem;
		border: 1px solid rgba(216, 198, 255, 0.12);
		border-radius: 16px;
		background: rgba(6, 5, 16, 0.34);
		box-shadow: 0 16px 40px rgba(3, 4, 14, 0.45);
		backdrop-filter: blur(6px) saturate(1.05);
		-webkit-backdrop-filter: blur(6px) saturate(1.05);
		animation: mobile-dna-reveal 560ms var(--ease-out) both;
	}

	@media (min-width: 641px) {
		.mobile-dna {
			display: none;
		}
	}

	@keyframes mobile-dna-reveal {
		from {
			opacity: 0;
			transform: scale(0.62);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.mobile-dna {
			animation-duration: 1ms;
		}
	}

	@media (max-width: 640px) {
		.song-title {
			/* −2.4px против 2.6rem: двухстрочные заголовки не задевают
			   верх панели проигрывателя на ~640px. */
			top: calc(2.4rem + env(safe-area-inset-top, 0px));
			font-size: clamp(1.4rem, 6.4vw, 2rem);
			letter-spacing: 0.1em;
			/* Многострочный центрированный заголовок: переносы на всех мирах,
			   строки выровнены по общему центру. Ширину при необходимости
			   ограничивает world-specific `titleMobileMaxWidth` из данных. */
			text-indent: 0;
			text-align: center;
			white-space: normal;
			/* max-content + max-width: переносы задаёт ширина, а не половина
			   контейнера от `left: 50%`. */
			width: max-content;
			max-width: min(94vw, var(--title-mobile-max, 94vw));
		}

		.song-panel {
			top: calc(5.6rem + env(safe-area-inset-top, 0px));
			left: 0.8rem;
			right: 0.8rem;
			width: auto;
		}

		/* Desktop-only сдвиг (DNA) на mobile не применяется: своя композиция. */
		.song-panel.is-shifted-desktop {
			top: calc(5.6rem + env(safe-area-inset-top, 0px));
		}

		.song-panel.is-shifted {
			top: calc(5.6rem + 1cm + env(safe-area-inset-top, 0px));
		}
	}
</style>
