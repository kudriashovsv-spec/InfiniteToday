<script>
	/**
	 * Сворачиваемый текст песни. Отдельный переиспользуемый компонент:
	 * следующий мир получит lyrics тем же способом, без копирования разметки.
	 *
	 * @type {{ text: string }}
	 */
	let { text } = $props();

	let open = $state(false);
</script>

<button
	class="lyrics-toggle"
	class:is-open={open}
	type="button"
	aria-expanded={open}
	aria-controls="lyrics-panel"
	onclick={() => (open = !open)}
>
	<span>Текст песни</span>
	<span class="lyrics-toggle__chevron" aria-hidden="true"></span>
</button>

<div class="lyrics-panel" class:is-open={open} id="lyrics-panel">
	<pre class="lyrics-panel__text">{text}</pre>
</div>

<style>
	.lyrics-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		margin-top: 0.35rem;
		padding: 0.34rem 0.8rem;
		border: 1px solid rgba(190, 200, 255, 0.14);
		border-radius: 999px;
		background: rgba(9, 10, 26, 0.34);
		color: rgba(238, 232, 255, 0.82);
		font-family: inherit;
		font-size: 0.76rem;
		font-weight: 300;
		letter-spacing: 0.08em;
		cursor: pointer;
		backdrop-filter: blur(9px) saturate(1.1);
		-webkit-backdrop-filter: blur(9px) saturate(1.1);
		transition:
			color 300ms var(--ease-soft),
			background 300ms var(--ease-soft),
			border-color 300ms var(--ease-soft);
		-webkit-tap-highlight-color: transparent;
	}

	.lyrics-toggle:hover,
	.lyrics-toggle:focus-visible {
		color: #f4f0ff;
		background: rgba(9, 10, 26, 0.5);
		border-color: rgba(190, 200, 255, 0.28);
	}

	.lyrics-toggle:focus {
		outline: none;
	}

	.lyrics-toggle:focus-visible {
		outline: 1px solid rgba(216, 198, 255, 0.6);
		outline-offset: 4px;
	}

	.lyrics-toggle__chevron {
		width: 0.42rem;
		height: 0.42rem;
		border-right: 1px solid currentColor;
		border-bottom: 1px solid currentColor;
		rotate: 45deg;
		translate: 0 -1px;
		transition:
			rotate 300ms var(--ease-soft),
			translate 300ms var(--ease-soft);
	}

	.lyrics-toggle.is-open .lyrics-toggle__chevron {
		rotate: 225deg;
		translate: 0 2px;
	}

	.lyrics-panel {
		width: 100%;
		max-height: 0;
		opacity: 0;
		overflow: hidden;
		transition:
			max-height 480ms var(--ease-soft),
			opacity 360ms var(--ease-soft);
	}

	.lyrics-panel.is-open {
		max-height: min(44vh, 360px);
		opacity: 1;
	}

	.lyrics-panel__text {
		margin: 0;
		max-height: min(44vh, 360px);
		overflow-y: auto;
		padding: 0.85rem 0.95rem;
		border: 1px solid rgba(190, 200, 255, 0.14);
		border-radius: 14px;
		background: rgba(9, 10, 26, 0.4);
		color: rgba(240, 236, 255, 0.9);
		font-family: 'Nunito Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
		font-size: 0.82rem;
		line-height: 1.55;
		letter-spacing: 0.01em;
		white-space: pre-wrap;
		scrollbar-width: thin;
		scrollbar-color: rgba(180, 165, 255, 0.4) transparent;
		backdrop-filter: blur(9px) saturate(1.1);
		-webkit-backdrop-filter: blur(9px) saturate(1.1);
	}

	.lyrics-panel__text::-webkit-scrollbar {
		width: 6px;
	}

	.lyrics-panel__text::-webkit-scrollbar-thumb {
		background: rgba(180, 165, 255, 0.35);
		border-radius: 6px;
	}

	@media (max-width: 640px) {
		.lyrics-panel.is-open,
		.lyrics-panel__text {
			max-height: min(38dvh, 300px);
		}
	}
</style>
