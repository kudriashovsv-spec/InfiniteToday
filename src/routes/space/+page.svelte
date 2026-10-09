<script lang="ts">
	import { resolve } from '$app/paths';
	import { afterNavigate } from '$app/navigation';
	import { onMount, type Component } from 'svelte';
	import Scene from '#lib/components/Scene.svelte';
	import MapHotspot from '#lib/components/MapHotspot.svelte';
	import WorldCard from '#lib/components/WorldCard.svelte';
	import BackLink from '#lib/components/BackLink.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { worlds, getMobileWorlds, type World, type WorldHotspot } from '#lib/data/worlds.js';

	interface CalibrationEntry {
		left: number;
		top: number;
		width: number;
		height: number;
	}

	// Calibration-панель подгружается лениво только в dev по `?calibrate`.
	// `import.meta.env.DEV` в production заменяется на false, поэтому этот
	// динамический import вырезается и код редактора в бандл не попадает.
	const loadCalibrator = import.meta.env.DEV
		? () => import('#lib/components/HotspotCalibrator.svelte')
		: null;

	type CalibratorComponent = Component<{
		worlds: World[];
		selectedSlug: string;
		entry: CalibrationEntry;
		onSelect: (slug: string) => void;
		onChange: (next: CalibrationEntry) => void;
		onClose: () => void;
	}>;

	// Dev-only calibration входов L2. В production редактор недоступен:
	// `import.meta.env.DEV` в собранном приложении всегда false, а в dev он
	// включается только по явному `?calibrate`. Состояние — временное, живёт
	// до перезагрузки, в файлы и localStorage ничего не пишется.
	let calibrateRequested = $state(false);
	let isDesktop = $state(false);
	let selectedSlug = $state('');
	let entries = $state<Record<string, CalibrationEntry>>({});
	let Calibrator = $state<CalibratorComponent | null>(null);

	// Внутренний скролл mobile-списка миров — отдельный контейнер (не окно),
	// поэтому браузер сам его не восстанавливает. Позицию запоминаем в
	// sessionStorage, а возвращаем ТОЛЬКО при реальном возврате в L2: из мира
	// (L3, в том числе по «← Назад») или по browser Back/Forward. При обычном
	// входе в L2 из L1 или по прямому URL сохранённая позиция игнорируется,
	// поэтому устаревшая позиция не «прыгает» при новом открытии уровня.
	const SPACE_SCROLL_KEY = 'space:mobile-scroll';
	let mobileListEl = $state<HTMLElement | null>(null);

	function persistScroll(): void {
		if (!mobileListEl) return;
		try {
			sessionStorage.setItem(SPACE_SCROLL_KEY, String(mobileListEl.scrollTop));
		} catch {
			/* sessionStorage может быть недоступен (private mode) — позиция просто не сохраняется */
		}
	}

	// `page.url.pathname` включает base path, поэтому сравниваем маршрут без него.
	// Base выводим из resolve('/space'), т.к. этот путь уже учитывает его.
	function routePathOf(pathname: string): string {
		const spaceHref = resolve('/space');
		const prefix = spaceHref.slice(0, spaceHref.length - '/space'.length);
		return prefix && pathname.startsWith(prefix) ? pathname.slice(prefix.length) || '/' : pathname;
	}

	afterNavigate(({ from, to, type }) => {
		if (!to) return;
		if (routePathOf(to.url.pathname) !== '/space') return;
		const returningFromWorld = from ? routePathOf(from.url.pathname).startsWith('/world/') : false;
		const isHistoryNav = type === 'popstate';
		if (!returningFromWorld && !isHistoryNav) return;

		let saved = 0;
		try {
			saved = Number(sessionStorage.getItem(SPACE_SCROLL_KEY)) || 0;
		} catch {
			saved = 0;
		}
		if (saved <= 0) return;

		// Список после перехода рендерится заново: ставим позицию после
		// обновления DOM, иначе scrollTop сбросится к началу.
		requestAnimationFrame(() => {
			if (mobileListEl) mobileListEl.scrollTop = saved;
		});
	});

	// Позицию mobile-списка пишем по ходу скролла (rAF-троттлинг), чтобы
	// к моменту ухода на L3 последнее значение уже было сохранено.
	// Слушатель вешаем в $effect, а не в onMount: `bind:this` проставляется
	// уже после onMount, поэтому там элемент ещё null.
	$effect(() => {
		const el = mobileListEl;
		if (!el) return;
		let saveScheduled = false;
		const onListScroll = (): void => {
			if (saveScheduled) return;
			saveScheduled = true;
			requestAnimationFrame(() => {
				saveScheduled = false;
				persistScroll();
			});
		};
		el.addEventListener('scroll', onListScroll, { passive: true });
		return () => el.removeEventListener('scroll', onListScroll);
	});

	const calibrate = $derived(calibrateRequested && isDesktop);

	// Mobile L2 использует отдельный постоянный порядок (не порядок массива).
	const mobileWorlds = getMobileWorlds();

	const clamp = (v: number, min: number, max: number): number => Math.min(Math.max(v, min), max);
	const fmt = (value: number): string => String(Math.round(value * 100) / 100);

	function parse(sp: WorldHotspot): CalibrationEntry {
		return {
			left: parseFloat(sp.left) || 0,
			top: parseFloat(sp.top) || 0,
			width: parseFloat(sp.width) || 0,
			height: parseFloat(sp.height) || 0
		};
	}

	/** Держит вход целиком внутри карты: центр ограничен половиной размера. */
	function normalize(entry: CalibrationEntry): CalibrationEntry {
		const width = clamp(entry.width, 0.5, 100);
		const height = clamp(entry.height, 0.5, 100);
		return {
			left: clamp(entry.left, width / 2, 100 - width / 2),
			top: clamp(entry.top, height / 2, 100 - height / 2),
			width,
			height
		};
	}

	function toHotspot(entry: CalibrationEntry): WorldHotspot {
		return {
			left: `${fmt(entry.left)}%`,
			top: `${fmt(entry.top)}%`,
			width: `${fmt(entry.width)}%`,
			height: `${fmt(entry.height)}%`
		};
	}

	function positionFor(world: World): WorldHotspot | undefined {
		const entry = entries[world.slug];
		return entry ? toHotspot(entry) : undefined;
	}

	function selectWorld(slug: string): void {
		const world = worlds.find((item) => item.slug === slug);
		if (!world) return;
		selectedSlug = slug;
		if (!entries[slug]) entries = { ...entries, [slug]: parse(world.hotspot) };
	}

	function updateEntry(slug: string, next: CalibrationEntry): void {
		entries = { ...entries, [slug]: normalize(next) };
	}

	function moveWorld(slug: string, left: number, top: number): void {
		const world = worlds.find((item) => item.slug === slug);
		const current = entries[slug] ?? (world ? parse(world.hotspot) : null);
		if (!current) return;
		updateEntry(slug, { ...current, left, top });
	}

	const selectedEntry = $derived(selectedSlug ? entries[selectedSlug] : undefined);

	onMount(() => {
		let cancelled = false;
		if (loadCalibrator && new URLSearchParams(window.location.search).has('calibrate')) {
			// Панель грузится лениво и только в dev: в production её код
			// не попадает в бандл и редактор недоступен.
			loadCalibrator().then((module) => {
				if (cancelled) return;
				Calibrator = module.default;
				calibrateRequested = true;
				const first = worlds[0];
				if (first) selectWorld(first.slug);
			});
		}

		// Инструмент desktop-only: при уходе на мобильную ширину он отключается
		// и обычная навигация L2 возвращается.
		const mq = window.matchMedia('(min-width: 641px)');
		isDesktop = mq.matches;
		const onMediaChange = (event: MediaQueryListEvent): void => {
			isDesktop = event.matches;
		};
		mq.addEventListener('change', onMediaChange);

		return () => {
			cancelled = true;
			mq.removeEventListener('change', onMediaChange);
		};
	});
</script>

<Seo
	title="Космос — карта миров | Infinite Today"
	description="Космическая карта музыкальных миров Infinite Today: выберите мир и войдите в его звук и визуализацию."
	path="/space"
	image="images/PaigLvl2.webp"
	imageAlt="Карта музыкальных миров Infinite Today"
/>

<div class="screen">
	<h1 class="sr-only">Космос — карта музыкальных миров Infinite Today</h1>
	<Scene src="images/PaigLvl2.webp" containOnNarrow>
		{#if calibrate}
			<div class="calib-guides" aria-hidden="true">
				{#each [25, 50, 75] as line (line)}
					<span class="calib-guides__v" style="left:{line}%"></span>
					<span class="calib-guides__h" style="top:{line}%"></span>
				{/each}
			</div>
		{/if}

		{#each worlds as world (world.slug)}
			<MapHotspot
				{world}
				position={positionFor(world)}
				calibrating={calibrate}
				selected={calibrate && world.slug === selectedSlug}
				onpick={calibrate ? selectWorld : undefined}
				onmove={calibrate ? moveWorld : undefined}
			/>
		{/each}
	</Scene>

	{#if calibrate && selectedEntry && Calibrator}
		<Calibrator
			{worlds}
			{selectedSlug}
			entry={selectedEntry}
			onSelect={selectWorld}
			onChange={(next) => updateEntry(selectedSlug, next)}
			onClose={() => (calibrateRequested = false)}
		/>
	{/if}

	<!-- На телефоне карта заменяется вертикальным списком миров (≤ 640px). -->
	<div class="mobile-worlds" aria-label="Миры песен" bind:this={mobileListEl}>
		{#each mobileWorlds as world (world.slug)}
			<WorldCard {world} />
		{/each}
	</div>

	<BackLink href={resolve('/')} ariaLabel="Вернуться на уровень входа" />
</div>

<style>
	/* Dev-only ориентиры 25/50/75% внутри сцены карты. Видны только когда
	   включён calibration; в production разметка не рендерится. */
	.calib-guides {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.calib-guides__v,
	.calib-guides__h {
		position: absolute;
		background: rgba(130, 200, 255, 0.22);
	}

	.calib-guides__v {
		top: 0;
		bottom: 0;
		width: 1px;
		transform: translateX(-0.5px);
	}

	.calib-guides__h {
		left: 0;
		right: 0;
		height: 1px;
		transform: translateY(-0.5px);
	}

	.mobile-worlds {
		display: none;
	}

	@media (max-width: 640px) {
		/* На телефоне карта-сцена скрыта, работает список карточек. */
		.screen :global(.scene) {
			display: none;
		}

		.mobile-worlds {
			position: absolute;
			inset: 0;
			z-index: 1;
			display: flex;
			flex-direction: column;
			gap: 1.15rem;
			padding: calc(3.5rem + env(safe-area-inset-top, 0px)) 1rem
				calc(1.4rem + env(safe-area-inset-bottom, 0px));
			overflow-y: auto;
			overscroll-behavior: contain;
			-webkit-overflow-scrolling: touch;
			scrollbar-width: thin;
			scrollbar-color: rgba(180, 165, 255, 0.4) transparent;
			background:
				radial-gradient(130% 55% at 50% 0%, rgba(96, 64, 168, 0.3), rgba(5, 3, 12, 0) 62%),
				radial-gradient(100% 45% at 50% 100%, rgba(255, 138, 92, 0.12), rgba(5, 3, 12, 0) 62%);
		}
	}
</style>
