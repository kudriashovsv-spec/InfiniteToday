<script>
	import { onMount } from 'svelte';
	import { asset } from '$app/paths';
	import AudioDNA from '#lib/components/AudioDNA.svelte';
	import ButterchurnCanvas from '#lib/components/ButterchurnCanvas.svelte';
	import WorldView from '#lib/components/WorldView.svelte';
	import SongDna from '#lib/components/SongDna.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { absoluteUrl, pluralRu } from '#lib/seo.js';
	import { isSupported } from '#lib/audio/butterchurn.js';
	import { getDna } from '#lib/data/dna.js';
	import { visualizerMode } from '#lib/visualizer-mode.svelte.js';

	/**
	 * @type {{
	 *   data: {
	 *     world: { slug: string, title: string, artwork: string, panelShift: boolean },
	 *     tracks: { id: string, title: string, genre: string, src: string }[],
	 *     lyrics: string
	 *   }
	 * }}
	 */
	let { data } = $props();

	// Desktop / mobile уточняется на клиенте. На SSR считаем desktop: главный
	// DNA-слот присутствует в разметке (мгновенно виден на desktop), а на mobile
	// он просто скрыт CSS — никакой visualizer-логики он не запускает.
	let isMobile = $state(false);
	/** @type {'butterchurn' | 'dna'} */
	let vizKind = $state('butterchurn');

	// Visualizer — опциональный режим, по умолчанию OFF. Главный визуал — DNA.
	// Состояние module-level: режим переживает переходы между мирами.
	// Чью DNA смотрим. Не связано с playback: можно слушать одну, смотреть другую.
	// Начальное значение — первая версия мира (функция, чтобы не читать prop в $state).
	function firstTrackId() {
		return data.tracks[0]?.id ?? '';
	}
	let selectedDnaId = $state(firstTrackId());

	const artworkSrc = $derived(asset(data.world.artwork));
	const selectedDna = $derived(getDna(selectedDnaId));

	onMount(() => {
		const mq = window.matchMedia('(max-width: 640px)');
		const apply = () => (isMobile = mq.matches);
		apply();
		vizKind = isSupported() ? 'butterchurn' : 'dna';
		mq.addEventListener('change', apply);
		return () => {
			mq.removeEventListener('change', apply);
			// Любой уход с world-страницы выключает Visualizer: режим не переносится
			// на следующую страницу/world. DNA снова обычный основной визуал.
			visualizerMode.open = false;
		};
	});
</script>

<Seo
	title={`${data.world.title} — мир песни | Infinite Today`}
	description={`Мир песни «${data.world.title}»: ${data.tracks.length} ${pluralRu(data.tracks.length, 'версия', 'версии', 'версий')} со словами и аудиовизуализацией. Infinite Today.`}
	path={`/world/${data.world.slug}`}
	image={data.world.artwork}
	imageAlt={`Артворк мира «${data.world.title}»`}
	jsonLd={{
		'@context': 'https://schema.org',
		'@type': 'MusicComposition',
		name: data.world.title,
		inLanguage: 'ru',
		url: absoluteUrl(`/world/${data.world.slug}`)
	}}
/>

<div class="screen screen--world">
	{#if isMobile}
		<!-- Mobile L3: portrait artwork мира вместо визуализатора. -->
		<div class="world-art" aria-hidden="true">
			<img class="world-art__img" src={artworkSrc} alt="" decoding="async" />
		</div>
	{/if}

	<!-- Visualizer монтируется ТОЛЬКО когда он включён: engine не создаётся заранее. -->
	{#if visualizerMode.open && !isMobile}
		{#if vizKind === 'butterchurn'}
			<ButterchurnCanvas />
		{:else}
			<AudioDNA />
		{/if}
	{/if}

	<!-- Главный визуальный слот DNA (desktop). На mobile скрыт CSS. -->
	{#if !visualizerMode.open}
		<div class="main-dna">
			{#key selectedDnaId}
				<div class="main-dna__inner">
					{#if selectedDna}
						<SongDna values={selectedDna.values} morphology={selectedDna.morphology} />
					{/if}
				</div>
			{/key}
		</div>
	{/if}

	<WorldView
		world={data.world}
		tracks={data.tracks}
		lyrics={data.lyrics}
		{selectedDnaId}
		onSelectDna={(id) => {
			selectedDnaId = id;
			// DNA имеет приоритет: выбор DNA возвращает из Visualizer-режима к DNA.
			visualizerMode.open = false;
		}}
	/>

	<!-- Переключатель режима: DNA ↔ Visualizer. На mobile не нужен. -->
	<button
		class="viz-toggle"
		class:is-on={visualizerMode.open}
		type="button"
		aria-pressed={visualizerMode.open}
		aria-label={visualizerMode.open ? 'Выключить визуализатор' : 'Включить визуализатор'}
		onclick={() => (visualizerMode.open = !visualizerMode.open)}
	>
		<span class="viz-toggle__icon" aria-hidden="true">{visualizerMode.open ? '❚❚' : '▶'}</span>
		<span>Визуализатор</span>
	</button>
</div>

<style>
	.screen--world {
		background:
			radial-gradient(90% 70% at 50% 38%, rgba(96, 64, 168, 0.22), rgba(5, 3, 12, 0) 66%),
			var(--bg-base);
	}

	/* Mobile-фон: тот же artwork, что и на L2. */
	.world-art {
		position: absolute;
		inset: 0;
		z-index: 0;
		overflow: hidden;
	}

	.world-art__img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
	}

	.world-art::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			180deg,
			rgba(5, 3, 12, 0.5) 0%,
			rgba(5, 3, 12, 0.14) 30%,
			rgba(5, 3, 12, 0.14) 64%,
			rgba(5, 3, 12, 0.6) 100%
		);
		pointer-events: none;
	}

	/* Правый визуальный слот: DNA — главный художественный объект, без карточки
	   и рамки. Слот прозрачный и не перехватывает события, кроме самой формы. */
	.main-dna {
		position: absolute;
		z-index: 1;
		top: 0;
		right: 0;
		bottom: 0;
		width: 44%;
		display: grid;
		place-items: center;
		padding: clamp(2rem, 7vh, 4.5rem) clamp(1.4rem, 3vw, 3.2rem);
		pointer-events: none;
	}

	.main-dna__inner {
		width: min(100%, 70vh);
		max-width: 620px;
		pointer-events: auto;
		animation: dna-slot-enter 480ms var(--ease-out) both;
	}

	@keyframes dna-slot-enter {
		from {
			opacity: 0;
			transform: scale(0.9);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	/* Кнопка режима: компактная glass-пилюля в левом нижнем углу world-страницы,
	   с нормальным отступом от краёв; не мешает DNA и нижней панели. */
	.viz-toggle {
		position: absolute;
		z-index: 4;
		left: clamp(0.9rem, 3vw, 2rem);
		bottom: calc(env(safe-area-inset-bottom, 0px) + clamp(1.4rem, 3.4vh, 2.4rem));
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.44rem 1rem;
		border: 1px solid rgba(190, 200, 255, 0.18);
		border-radius: 999px;
		background: rgba(9, 10, 26, 0.46);
		color: rgba(238, 232, 255, 0.85);
		font-family: 'Nunito Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
		font-size: 0.72rem;
		font-weight: 300;
		letter-spacing: 0.08em;
		white-space: nowrap;
		cursor: pointer;
		box-shadow: 0 10px 30px rgba(3, 4, 14, 0.45);
		backdrop-filter: blur(10px) saturate(1.1);
		-webkit-backdrop-filter: blur(10px) saturate(1.1);
		transition:
			color var(--dur-ui) var(--ease-ui),
			background var(--dur-ui) var(--ease-ui),
			border-color var(--dur-ui) var(--ease-ui),
			transform var(--dur-fast) var(--ease-out);
		-webkit-tap-highlight-color: transparent;
	}

	.viz-toggle__icon {
		font-size: 0.66rem;
		line-height: 1;
	}

	.viz-toggle:active {
		transform: scale(0.97);
	}

	.viz-toggle:focus {
		outline: none;
	}

	.viz-toggle:focus-visible {
		outline: 1px solid rgba(216, 198, 255, 0.6);
		outline-offset: 4px;
	}

	.viz-toggle.is-on {
		color: #f4f0ff;
		background: rgba(9, 10, 26, 0.62);
		border-color: rgba(200, 184, 255, 0.36);
	}

	@media (hover: hover) and (pointer: fine) {
		.viz-toggle:hover {
			color: #f4f0ff;
			background: rgba(9, 10, 26, 0.6);
			border-color: rgba(190, 200, 255, 0.32);
		}
	}

	/* Mobile: своя композиция — главный DNA-слот и кнопка режима не нужны. */
	@media (max-width: 640px) {
		.main-dna,
		.viz-toggle {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.main-dna__inner {
			animation-duration: 1ms;
		}

		.viz-toggle {
			transition: none;
		}

		.viz-toggle:active {
			transform: none;
		}
	}
</style>
