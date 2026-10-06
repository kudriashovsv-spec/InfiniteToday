<script>
	/**
	 * Единая кнопка возврата на предыдущий уровень (L2 → L1, L3 → L2).
	 * Настоящая ссылка SvelteKit: без собственного router и без hash-навигации.
	 *
	 * @type {{ href: string, label?: string, ariaLabel?: string }}
	 */
	let { href, label = '← Назад', ariaLabel = 'Вернуться назад' } = $props();
</script>

<a class="back" {href} aria-label={ariaLabel}>{label}</a>

<style>
	.back {
		position: absolute;
		z-index: 2;
		top: clamp(0.9rem, 3vh, 1.8rem);
		left: clamp(0.9rem, 3vw, 2rem);
		padding: 0.3em 0.2em;
		border: 0;
		background: transparent;
		color: rgba(244, 240, 255, 0.72);
		font-family: 'Nunito Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
		font-size: clamp(0.82rem, 1.5vw, 1rem);
		font-weight: 300;
		letter-spacing: 0.16em;
		text-decoration: none;
		cursor: pointer;
		text-shadow:
			0 1px 3px rgba(2, 4, 12, 0.9),
			0 0 10px rgba(2, 4, 12, 0.7);
		-webkit-tap-highlight-color: transparent;
		transition:
			color 420ms var(--ease-soft),
			letter-spacing 420ms var(--ease-soft),
			text-shadow 420ms var(--ease-soft);
	}

	.back:hover,
	.back:focus-visible {
		color: #f4f0ff;
		letter-spacing: 0.2em;
		text-shadow:
			0 1px 3px rgba(2, 4, 12, 0.9),
			0 0 14px rgba(150, 200, 255, 0.6);
	}

	.back:focus-visible {
		outline: 1px solid rgba(216, 198, 255, 0.6);
		outline-offset: 5px;
		border-radius: 4px;
	}

	@media (max-width: 640px) {
		.back {
			top: 0.7rem;
			left: 0.8rem;
			font-size: 0.8rem;
		}
	}
</style>
