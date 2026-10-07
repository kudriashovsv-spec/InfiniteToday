<script lang="ts">
	import { onMount } from 'svelte';
	import { attachGlobalAudio, player } from '#lib/audio/player.svelte.js';
	import { initMediaSession, syncMediaSession } from '#lib/audio/media-session.js';
	import { getTrack } from '#lib/data/music.js';
	import { trackPlay } from '#lib/analytics.js';

	/**
	 * Persistent <audio> for the global L1 player.
	 *
	 * Монтируется один раз в layout, поэтому переживает любые route transitions
	 * (L1 → L2 → L3 → …). Видимый UI библиотеки — LibraryPanel.svelte на L1;
	 * здесь элемент, связывание его с глобальным состоянием и Media Session.
	 */

	let element: HTMLAudioElement | null = $state(null);

	onMount(() => {
		const detachAudio = element ? attachGlobalAudio(element) : undefined;
		const detachMedia = initMediaSession();
		return () => {
			detachAudio?.();
			detachMedia();
		};
	});

	// $effect выполняется только в браузере (не при SSR) и держит метаданные
	// Media Session в синхроне с глобальным player state.
	$effect(() => {
		syncMediaSession();
	});

	// Аналитика: считаем реальный старт воспроизведения (состояние playing),
	// а не нажатие кнопки. Один трек — одно событие до паузы/остановки.
	let countedTrackId: string | null = null;
	$effect(() => {
		const playing = player.playing;
		const id = player.trackId;
		if (playing && id) {
			if (countedTrackId !== id) {
				countedTrackId = id;
				const track = getTrack(id);
				if (track) trackPlay({ id: track.id, world: track.world });
			}
		} else {
			countedTrackId = null;
		}
	});
</script>

<audio class="global-audio" bind:this={element} aria-hidden="true"></audio>

<style>
	audio {
		display: none;
	}
</style>
