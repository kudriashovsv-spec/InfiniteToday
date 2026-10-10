<script lang="ts">
	import { isFavorite, toggleFavorite } from '#lib/favorites.svelte.js';

	/**
	 * Сердечко «Избранное» для КОНКРЕТНОЙ версии трека (по её устойчивому id).
	 * Переиспользуется в каталоге L1 (desktop и mobile) и в плеере версии на L3.
	 *
	 * Размеры задаёт контекст через CSS-переменные `--fav-size` / `--fav-icon`
	 * (по умолчанию — как у кнопки скачивания в каталоге: 1em / 0.8em).
	 * Состояние — общее (`favorites.svelte.ts`), поэтому сердечки в каталоге и
	 * в мире L3 всегда показывают одно и то же.
	 */
	interface FavoriteButtonProps {
		trackId: string;
		/** название версии — для доступного имени кнопки */
		title: string;
		/** жанр версии — уточняет имя: у двух версий одной песни оно одинаковое */
		genre?: string;
	}

	let { trackId, title, genre }: FavoriteButtonProps = $props();

	const active = $derived(isFavorite(trackId));
	// Как у кнопки скачивания: у версий одного произведения общее название,
	// поэтому в имени кнопки есть ещё и жанр — иначе два сердечка подряд
	// объявлялись бы одинаково.
	const versionName = $derived(genre ? `${title} — ${genre}` : title);

	/**
	 * Клик по сердечку — ТОЛЬКО избранное: он не запускает воспроизведение,
	 * не выбирает версию и не доходит до обработчиков строки каталога.
	 */
	function onToggle(event: MouseEvent): void {
		event.preventDefault();
		event.stopPropagation();
		toggleFavorite(trackId);
	}
</script>

<button
	class="fav"
	class:is-active={active}
	type="button"
	aria-pressed={active}
	aria-label={active ? `Убрать из избранного: ${versionName}` : `Добавить в избранное: ${versionName}`}
	onclick={onToggle}
>
	<svg class="fav__icon" viewBox="0 0 16 16" aria-hidden="true">
		<path
			d="M13.89 3.07a3.67 3.67 0 0 0-5.19 0L8 3.78 7.29 3.07a3.67 3.67 0 0 0-5.19 5.19l.71.71L8 14.15l5.19-5.18.71-.71a3.67 3.67 0 0 0 0-5.19z"
		></path>
	</svg>
</button>

<style>
	/* Габарит — из контекста (`--fav-size`), поэтому в каталоге сердечко ровно
	   такое же, как кнопка скачивания, а в плеере L3 — под его масштаб. */
	.fav {
		position: relative;
		z-index: 1;
		flex: none;
		display: grid;
		place-items: center;
		width: var(--fav-size, 1em);
		height: var(--fav-size, 1em);
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: transparent;
		color: rgba(200, 208, 245, 0.5);
		opacity: 0.85;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition:
			color var(--dur-ui) var(--ease-ui),
			opacity var(--dur-ui) var(--ease-ui),
			transform var(--dur-fast) var(--ease-out);
	}

	/* Увеличиваем зону нажатия, не увеличивая видимую иконку (как у скачивания). */
	.fav::after {
		content: '';
		position: absolute;
		inset: -0.4em -0.15em;
	}

	.fav__icon {
		width: var(--fav-icon, 0.8em);
		height: var(--fav-icon, 0.8em);
		fill: none;
		stroke: currentColor;
		stroke-width: 1.6;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.fav:active {
		transform: scale(0.9);
	}

	.fav:focus {
		outline: none;
	}

	.fav:focus-visible {
		color: #ffffff;
		opacity: 1;
		outline: 1px solid rgba(216, 198, 255, 0.6);
		outline-offset: 2px;
		border-radius: 3px;
	}

	/* В избранном: залитое красное сердечко — состояние видно без hover. */
	.fav.is-active {
		color: var(--fav);
		opacity: 1;
	}

	.fav.is-active .fav__icon {
		fill: currentColor;
	}

	@media (hover: hover) and (pointer: fine) {
		.fav:hover {
			color: #ffffff;
			opacity: 1;
		}

		.fav.is-active:hover {
			color: var(--fav);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.fav:active {
			transform: none;
		}
	}
</style>
