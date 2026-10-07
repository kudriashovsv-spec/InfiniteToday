<script>
	import { resolve } from '$app/paths';
	import Scene from '#lib/components/Scene.svelte';
	import LibraryPanel from '#lib/components/LibraryPanel.svelte';
</script>

<svelte:head>
	<title>Infinite Today — Music Laboratory</title>
	<meta name="description" content="Infinite Today — музыкальная вселенная. Войди через чёрную дыру." />
</svelte:head>

<div class="screen">
	<Scene src="images/MainPageLvl1.webp">
		<!-- центр чёрной дыры на изображении ≈ 49.5% / 46.2% (координаты v1.1) -->
		<a
			class="hole"
			href={resolve('/space')}
			aria-label="Войти во вселенную — нажать на чёрную дыру"
		></a>
	</Scene>

	<div class="enter">
		<p class="enter__kicker">Music Laboratory</p>
		<h1 class="enter__title">
			<span class="enter__title-line">Infinite</span>
			<span class="enter__title-line enter__title-line--accent">Today</span>
		</h1>
		<a class="enter__hint" href={resolve('/space')}>Вход</a>
	</div>

	<!-- Библиотека L1: видимый UI глобального player (audio живёт в layout). -->
	<LibraryPanel />

	<!-- Внешние ссылки (production v1.1) → YouTube / Telegram. -->
	<div class="social">
		<a
			class="social__link"
			href="https://www.youtube.com/@InfiniteToday_music"
			target="_blank"
			rel="noopener noreferrer">YouTube</a
		>
		<a class="social__link" href="https://t.me/parabola_music" target="_blank" rel="noopener noreferrer"
			>Telegram</a
		>
	</div>

	<!-- Вход в галерею — отдельная страница (настоящий SvelteKit route). -->
	<a class="gallery-entry" href={resolve('/gallery')}>Галерея</a>
</div>

<style>
	/* Кликабельная зона чёрной дыры. v1.1: 20% × 35.5%, центр 49.5% / 46.2%. */
	.hole {
		position: absolute;
		left: 49.5%;
		top: 46.2%;
		width: 20%;
		height: 35.5%;
		translate: -50% -50%;
		border-radius: 50%;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.hole:focus {
		outline: none;
	}

	.hole:focus-visible {
		outline: 2px solid rgba(216, 198, 255, 0.85);
		outline-offset: 6px;
		border-radius: 50%;
	}

	.enter {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		padding: calc(clamp(4vh, 7vh, 10vh) + env(safe-area-inset-top, 0px)) 8vmin 8vmin;
		text-align: center;
		pointer-events: none; /* клики проходят к чёрной дыре */
	}

	.enter__kicker {
		margin: 0 0 1rem;
		font-size: clamp(0.7rem, 1.4vw, 0.95rem);
		letter-spacing: 0.55em;
		text-transform: uppercase;
		color: var(--text-dim);
		text-indent: 0.55em;
	}

	.enter__title {
		margin: 0;
		font-weight: 300;
		line-height: 0.98;
		letter-spacing: 0.04em;
		font-size: clamp(2.4rem, 7.6vw, 6.2rem);
		text-transform: uppercase;
	}

	.enter__title-line {
		display: block;
		text-shadow:
			0 0 42px rgba(180, 139, 255, 0.5),
			0 2px 26px rgba(5, 3, 12, 0.75);
	}

	.enter__title-line--accent {
		font-weight: 600;
		background: linear-gradient(100deg, var(--accent-a) 0%, #ffd9c2 45%, var(--accent-b) 100%);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		filter: drop-shadow(0 0 34px rgba(255, 138, 92, 0.4));
	}

	.enter__hint {
		margin: calc(2rem + 2cm) 0 0;
		font-size: clamp(0.95rem, 2vw, 1.3rem);
		font-weight: 400;
		letter-spacing: 0.46em;
		text-indent: 0.46em;
		text-transform: uppercase;
		color: #f7f2ff;
		text-decoration: none;
		text-shadow:
			0 1px 12px rgba(5, 3, 12, 0.7),
			0 0 22px rgba(190, 165, 255, 0.5);
		pointer-events: auto; /* на мобильном подпись — самостоятельная точка входа */
		animation: breathe 3s ease-in-out 1.6s infinite;
	}

	.enter__hint:focus-visible {
		outline: 1px solid rgba(216, 198, 255, 0.6);
		outline-offset: 5px;
		border-radius: 4px;
	}

	@keyframes breathe {
		0%,
		100% {
			opacity: 0.3;
		}
		50% {
			opacity: 0.62;
		}
	}

	/* Вход в галерею (порт v1.1): левый низ на desktop.
	   ВАЖНО: базовый блок должен идти ДО @media (max-width: 640px), чтобы
	   mobile-override с bottom:auto был последним и перебивал bottom. */
	.gallery-entry {
		position: absolute;
		z-index: 3;
		left: clamp(1rem, 3vw, 2.4rem);
		bottom: clamp(1rem, 3vh, 2rem);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.62rem 1.5rem;
		border: 1px solid rgba(216, 198, 255, 0.22);
		border-radius: 999px;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.055) 0%, rgba(255, 255, 255, 0.018) 100%),
			rgba(10, 6, 22, 0.42);
		-webkit-backdrop-filter: blur(7px);
		backdrop-filter: blur(7px);
		color: rgba(246, 242, 255, 0.9);
		font-family: 'Nunito Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
		font-size: clamp(0.95rem, 1.35vw, 1.2rem);
		font-weight: 300;
		letter-spacing: 0.18em;
		text-indent: 0.18em;
		text-decoration: none;
		text-shadow:
			0 1px 3px rgba(2, 4, 12, 0.9),
			0 0 12px rgba(2, 4, 12, 0.7);
		box-shadow:
			0 6px 22px rgba(3, 2, 10, 0.45),
			inset 0 0 18px rgba(180, 139, 255, 0.06);
		transition:
			color var(--dur-ui) var(--ease-ui),
			border-color var(--dur-ui) var(--ease-ui),
			box-shadow var(--dur-ui) var(--ease-ui),
			transform var(--dur-fast) var(--ease-out);
		-webkit-tap-highlight-color: transparent;
	}

	.gallery-entry:active {
		transform: scale(0.97);
	}

	.gallery-entry:focus-visible {
		color: #ffffff;
		border-color: rgba(180, 139, 255, 0.5);
		box-shadow:
			0 8px 28px rgba(3, 2, 10, 0.5),
			0 0 22px rgba(180, 139, 255, 0.18),
			inset 0 0 20px rgba(180, 139, 255, 0.08);
		outline: 1px solid rgba(216, 198, 255, 0.55);
		outline-offset: 4px;
	}

	@media (hover: hover) and (pointer: fine) {
		.gallery-entry:hover {
			color: #ffffff;
			border-color: rgba(180, 139, 255, 0.5);
			box-shadow:
				0 8px 28px rgba(3, 2, 10, 0.5),
				0 0 22px rgba(180, 139, 255, 0.18),
				inset 0 0 20px rgba(180, 139, 255, 0.08);
			transform: translateY(-1px);
		}
	}

	/* Внешние ссылки (порт v1.1): desktop — правый низ. База ДО media-блока,
	   чтобы mobile-override оставался последним. */
	.social {
		position: absolute;
		z-index: 2;
		right: clamp(0.9rem, 2.4vw, 1.8rem);
		bottom: clamp(0.9rem, 2.4vh, 1.8rem);
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.15rem;
	}

	.social__link {
		color: rgba(238, 236, 250, 0.72);
		font-family: 'Nunito Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
		font-size: clamp(0.72rem, 1.1vw, 0.9rem);
		font-weight: 300;
		letter-spacing: 0.06em;
		text-decoration: none;
		text-shadow:
			0 1px 2px rgba(2, 4, 12, 0.95),
			0 0 9px rgba(2, 4, 12, 0.8);
		transition: color var(--dur-ui) var(--ease-ui);
	}

	.social__link:focus-visible {
		color: #ffffff;
		outline: 1px solid rgba(216, 198, 255, 0.55);
		outline-offset: 3px;
		border-radius: 3px;
	}

	@media (hover: hover) and (pointer: fine) {
		.social__link:hover {
			color: #ffffff;
		}
	}

	@media (max-width: 640px) {
		.enter {
			padding: calc(clamp(2.4rem, 8vh, 4rem) + env(safe-area-inset-top, 0px)) 6vmin 0;
		}

		.enter__title {
			font-size: clamp(2rem, 11vw, 3rem);
		}

		.enter__hint {
			margin-top: 1.4rem;
			font-size: 0.95rem;
			letter-spacing: 0.4em;
			text-indent: 0.4em;
		}

		/* Вход в галерею на мобильном: левый верх. */
		.gallery-entry {
			top: calc(clamp(0.5rem, 1.6vh, 0.8rem) + env(safe-area-inset-top, 0px));
			bottom: auto;
			left: calc(0.8rem + env(safe-area-inset-left, 0px));
			min-height: 40px;
			padding: 0.4rem 0.9rem;
			border-radius: 12px;
			font-size: 0.8125rem;
			letter-spacing: 0.14em;
			text-indent: 0.14em;
		}

		/* Ссылки — в верхний угол, чтобы их не закрывала нижняя панель. */
		.social {
			top: calc(clamp(0.6rem, 2vh, 1rem) + env(safe-area-inset-top, 0px));
			bottom: auto;
			right: calc(0.8rem + env(safe-area-inset-right, 0px));
		}

		.social__link {
			font-size: 0.72rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.enter__hint {
			animation: none;
			opacity: 0.62;
		}

		.gallery-entry:active {
			transform: none;
		}
	}
</style>
