<script lang="ts">
	import { onMount } from 'svelte';
	import { attachGlobalAudio } from '#lib/audio/player.svelte.js';

	/**
	 * Persistent <audio> for the global L1 player.
	 *
	 * Монтируется один раз в layout, поэтому переживает любые route transitions
	 * (L1 → L2 → L3 → …). Видимый UI библиотеки — LibraryPanel.svelte на L1;
	 * здесь только элемент и связывание его с глобальным состоянием.
	 */

	let element: HTMLAudioElement | null = $state(null);

	onMount(() => (element ? attachGlobalAudio(element) : undefined));
</script>

<audio class="global-audio" bind:this={element} aria-hidden="true"></audio>

<style>
	audio {
		display: none;
	}
</style>
