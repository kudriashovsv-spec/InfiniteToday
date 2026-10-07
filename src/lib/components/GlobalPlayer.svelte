<script lang="ts">
	import { onMount } from 'svelte';
	import { attachGlobalAudio } from '#lib/audio/player.svelte.js';
	import { initMediaSession, syncMediaSession } from '#lib/audio/media-session.js';

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
</script>

<audio class="global-audio" bind:this={element} aria-hidden="true"></audio>

<style>
	audio {
		display: none;
	}
</style>
