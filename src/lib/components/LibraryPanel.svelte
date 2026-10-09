<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { asset } from '$app/paths';
	import type { AssetPath } from '$app/types';
	import { tracks } from '#lib/data/music.js';
	import { MORPHOLOGIES, MORPHOLOGY_ORDER, getMorphologyForTrack } from '#lib/data/dna.js';
	import {
		player,
		formatTime,
		currentTrack,
		selectTrack,
		next,
		prev,
		toggle,
		retry,
		seekTo,
		setVolume,
		toggleMute,
		libraryFilter
	} from '#lib/audio/player.svelte.js';

	/**
	 * Видимый UI библиотеки L1 (порт v1.1): текущий трек, play/pause, skip,
	 * progress, время, громкость/mute и список 40 версий.
	 *
	 * Это отдельный компонент от GlobalPlayer.svelte: audio-элемент постоянный
	 * и живёт в layout, а этот UI существует только на L1. Оба используют одно
	 * глобальное состояние и один audio-слой.
	 */

	let playerEl: HTMLElement | null = $state(null);
	let volumeButtonEl: HTMLButtonElement | null = $state(null);
	let volumeOpen: boolean = $state(false);
	let scrubbing = false;

	// Открыт ли выпадающий список морфологий (кастомный, а не нативный select).
	let filterOpen: boolean = $state(false);

	// Единственная визуальная подсказка морфологии на всю библиотеку.
	// position: fixed — её не обрезает скролл списка.
	let tip = $state<{ text: string; x: number; y: number } | null>(null);

	let filterRoot = $state<HTMLElement | null>(null);
	let filterButton = $state<HTMLButtonElement | null>(null);
	let filterMenu = $state<HTMLElement | null>(null);

	const track = $derived(currentTrack());

	// Видимость каталога: треки выбранной морфологии ПЛЮС текущий играющий
	// трек, даже если он под фильтр не попадает. Дубликата нет — он остаётся на
	// своём месте в исходном порядке. Сама очередь воспроизведения считается в
	// player.svelte.ts из того же libraryFilter (единый источник правды).
	const visibleTracks = $derived.by(() => {
		const m = libraryFilter.morphology;
		if (m === 'all') return tracks;
		const currentId = player.trackId;
		// Текущий трек добавляется как исключение только после реального старта
		// прослушивания (player.started). Выбранный по умолчанию, но ещё не
		// игравший трек исключением не является.
		return tracks.filter(
			(item) => getMorphologyForTrack(item.id) === m || (player.started && item.id === currentId)
		);
	});

	function showTip(el: Element, text: string): void {
		const rect = el.getBoundingClientRect();
		tip = { text, x: rect.left + rect.width / 2, y: rect.top };
	}

	function hideTip(): void {
		tip = null;
	}

	function toggleFilter(): void {
		if (filterOpen) closeFilter(true);
		else filterOpen = true;
	}

	function closeFilter(returnFocus: boolean): void {
		if (!filterOpen) return;
		filterOpen = false;
		if (returnFocus) filterButton?.focus({ preventScroll: true });
	}

	function selectMorphology(value: string): void {
		libraryFilter.morphology = value;
		closeFilter(true);
	}

	function morphOptions(): HTMLButtonElement[] {
		if (!filterMenu) return [];
		return Array.from(filterMenu.querySelectorAll<HTMLButtonElement>('[data-morph-option]'));
	}

	function focusMorphOption(value: string): void {
		morphOptions().find((option) => option.dataset.morphOption === value)?.focus();
	}

	function moveMorphFocus(key: string): void {
		const options = morphOptions();
		if (!options.length) return;
		const current = options.indexOf(document.activeElement as HTMLButtonElement);
		let index = current === -1 ? 0 : current;
		if (key === 'ArrowDown') index = (index + 1) % options.length;
		else if (key === 'ArrowUp') index = (index - 1 + options.length) % options.length;
		else if (key === 'Home') index = 0;
		else if (key === 'End') index = options.length - 1;
		options[index]?.focus();
	}

	function onFilterButtonKeydown(event: KeyboardEvent): void {
		const key = event.key;
		if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
			event.preventDefault();
			event.stopPropagation();
			if (filterOpen) {
				focusMorphOption(libraryFilter.morphology);
			} else {
				filterOpen = true;
				tick().then(() => focusMorphOption(libraryFilter.morphology));
			}
			return;
		}
		if (key === 'Escape') {
			event.preventDefault();
			closeFilter(true);
		}
	}

	function onFilterMenuKeydown(event: KeyboardEvent): void {
		const key = event.key;
		if (key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			closeFilter(true);
			return;
		}
		if (key === 'Tab') {
			closeFilter(false);
			return;
		}
		if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Home' || key === 'End') {
			event.preventDefault();
			event.stopPropagation();
			moveMorphFocus(key);
		}
	}

	onMount(() => {
		const onDocClick = (event: MouseEvent): void => {
			if (volumeOpen && !(playerEl && event.target instanceof Node && playerEl.contains(event.target))) {
				volumeOpen = false;
			}
			if (filterOpen && !(event.target instanceof Node && filterRoot?.contains(event.target))) {
				filterOpen = false;
			}
		};
		document.addEventListener('click', onDocClick);
		window.addEventListener('keydown', onKeydown);
		return () => {
			document.removeEventListener('click', onDocClick);
			window.removeEventListener('keydown', onKeydown);
		};
	});

	/** События бара: Svelte отдаёт currentTarget самим элементом бара. */
	type BarPointerEvent = PointerEvent & { currentTarget: HTMLDivElement };
	type BarMouseEvent = MouseEvent & { currentTarget: HTMLDivElement };

	function ratioFromEvent(event: BarPointerEvent | BarMouseEvent): number {
		const rect = event.currentTarget.getBoundingClientRect();
		return Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
	}

	function onBarPointerDown(event: BarPointerEvent): void {
		if (player.duration <= 0) return;
		scrubbing = true;
		try {
			event.currentTarget.setPointerCapture?.(event.pointerId);
		} catch {
			/* ignore */
		}
		seekTo(ratioFromEvent(event) * player.duration);
		event.preventDefault();
	}

	function onBarPointerMove(event: BarPointerEvent): void {
		if (!scrubbing) return;
		seekTo(ratioFromEvent(event) * player.duration);
	}

	function endScrub(event: BarPointerEvent): void {
		if (!scrubbing) return;
		scrubbing = false;
		try {
			event.currentTarget.releasePointerCapture?.(event.pointerId);
		} catch {
			/* ignore */
		}
	}

	function onBarClick(event: BarMouseEvent): void {
		if (event.detail === 0) return;
		seekTo(ratioFromEvent(event) * player.duration);
	}

	function onBarKeydown(event: KeyboardEvent): void {
		if (event.key === 'ArrowRight') {
			seekTo(player.currentTime + 5);
		} else if (event.key === 'ArrowLeft') {
			seekTo(player.currentTime - 5);
		} else {
			return;
		}
		event.preventDefault();
	}

	const progress = $derived(player.duration > 0 ? player.currentTime / player.duration : 0);
	const loading = $derived(player.loading && !player.playing);
	const seekText = $derived(
		player.duration > 0
			? `${formatTime(player.currentTime)} из ${formatTime(player.duration)}`
			: formatTime(player.currentTime)
	);
	const toggleLabel = $derived(
		player.failed
			? 'Повторить загрузку'
			: player.retrying
				? 'Повторная загрузка'
				: loading
					? 'Загрузка'
					: player.playing
						? 'Пауза'
						: 'Воспроизвести'
	);

	/** Текстовые поля/списки сами обрабатывают клавиши — не мешаем. */
	function isTextTarget(target: EventTarget | null): boolean {
		if (!(target instanceof HTMLElement)) return false;
		if (target.isContentEditable) return true;
		const tag = target.tagName;
		return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
	}

	/**
	 * Keyboard shortcuts глобального player (только на L1, где есть этот UI):
	 * Space play/pause, ←/→ seek, ↑/↓ volume, M mute, N next, P previous.
	 * Не перехватываем клавиши у полей ввода, у кнопок/ссылок (Space — их
	 * нативная активация) и у слайдера (его стрелки нативны).
	 */
	function onKeydown(event: KeyboardEvent): void {
		if (event.defaultPrevented) return;
		const key = event.key;

		if (volumeOpen && key === 'Escape') {
			volumeOpen = false;
			volumeButtonEl?.focus({ preventScroll: true });
			event.preventDefault();
			return;
		}

		if (event.metaKey || event.ctrlKey || event.altKey) return;
		if (isTextTarget(event.target)) return;

		// Пока открыт фильтр морфологий, глобальные шорткаты плеера не
		// перехватывают клавиши, адресованные самому списку.
		if (filterOpen && event.target instanceof Node && filterRoot?.contains(event.target)) return;

		const el = event.target instanceof HTMLElement ? event.target : null;
		const activates = !!el && (el.tagName === 'BUTTON' || el.tagName === 'A');
		const isSlider = !!el && el.getAttribute('role') === 'slider';
		if ((key === ' ' || key === 'Spacebar') && activates) return;
		if ((key === 'ArrowRight' || key === 'ArrowLeft') && isSlider) return;

		switch (key) {
			case ' ':
			case 'Spacebar':
				toggle();
				break;
			case 'ArrowRight':
				seekTo(player.currentTime + 5);
				break;
			case 'ArrowLeft':
				seekTo(player.currentTime - 5);
				break;
			case 'ArrowUp':
				setVolume(player.volume + 0.05);
				break;
			case 'ArrowDown':
				setVolume(player.volume - 0.05);
				break;
			case 'm':
			case 'M':
				toggleMute();
				break;
			case 'n':
			case 'N':
				next();
				break;
			case 'p':
			case 'P':
				prev();
				break;
			default:
				return;
		}
		event.preventDefault();
	}
</script>

<div class="library">
	<div class="library__head">
		<p class="library__current" aria-live="polite">
			<span class="library__current-title">{track?.title ?? ''}</span>
			<span class="library__current-genre">{track?.genre ?? ''}</span>
		</p>
		<div class="library__filter" bind:this={filterRoot}>
			<button
				class="library__filter-btn"
				class:is-open={filterOpen}
				type="button"
				aria-haspopup="listbox"
				aria-expanded={filterOpen}
				aria-controls="library-morph-menu"
				aria-label="Фильтр по морфологии"
				bind:this={filterButton}
				onclick={toggleFilter}
				onkeydown={onFilterButtonKeydown}
			>DNA</button>
			{#if filterOpen}
				<div
					class="library__filter-menu"
					id="library-morph-menu"
					role="listbox"
					tabindex="-1"
					aria-label="Морфологии"
					bind:this={filterMenu}
					onkeydown={onFilterMenuKeydown}
				>
					<button
						class="library__filter-option"
						type="button"
						role="option"
						aria-selected={libraryFilter.morphology === 'all'}
						data-morph-option="all"
						onclick={() => selectMorphology('all')}
					>
						<span class="library__filter-check" aria-hidden="true">✓</span>
						<span class="library__filter-name">Все DNA</span>
					</button>
					{#each MORPHOLOGY_ORDER as id (id)}
						<button
							class="library__filter-option"
							type="button"
							role="option"
							aria-selected={libraryFilter.morphology === id}
							data-morph-option={id}
							style={`--morph-color:${MORPHOLOGIES[id].color}`}
							onclick={() => selectMorphology(id)}
						>
							<span class="library__filter-check" aria-hidden="true">✓</span>
							<span class="library__filter-name">{MORPHOLOGIES[id].name}</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<div
		class="player"
		class:is-playing={player.playing}
		class:is-loading={loading}
		class:is-failed={player.failed}
		class:is-muted={player.muted}
		class:is-volume-open={volumeOpen}
		bind:this={playerEl}
	>
		<button class="player__skip player__prev" type="button" aria-label="Предыдущий трек" onclick={() => prev()}>
			<svg class="player__skip-icon" viewBox="0 0 16 16" aria-hidden="true">
				<path d="M9.5 3.5 5.5 8l4 4.5"></path>
			</svg>
		</button>

		<button
			class="player__toggle"
			type="button"
			aria-label={toggleLabel}
			aria-pressed={player.playing}
			onclick={() => toggle()}
		>
			<span class="player__spinner" aria-hidden="true"></span>
		</button>

		<button class="player__skip player__next" type="button" aria-label="Следующий трек" onclick={() => next()}>
			<svg class="player__skip-icon" viewBox="0 0 16 16" aria-hidden="true">
				<path d="M6.5 3.5 10.5 8l-4 4.5"></path>
			</svg>
		</button>

		<div
			class="player__bar"
			class:is-disabled={player.duration <= 0}
			role="slider"
			tabindex="0"
			aria-label="Позиция трека"
			aria-orientation="horizontal"
			aria-valuemin="0"
			aria-valuemax="100"
			aria-valuenow={Math.round(progress * 100)}
			aria-valuetext={seekText}
			aria-disabled={player.duration <= 0}
			onpointerdown={onBarPointerDown}
			onpointermove={onBarPointerMove}
			onpointerup={endScrub}
			onpointercancel={endScrub}
			onclick={onBarClick}
			onkeydown={onBarKeydown}
		>
			<span class="player__fill" style="width:{progress * 100}%"></span>
		</div>

		<span class="player__time">{formatTime(player.currentTime)} / {formatTime(player.duration)}</span>

		<div class="player__volume">
			<button
				class="player__volume-button"
				type="button"
				aria-label="Громкость"
				aria-haspopup="true"
				aria-expanded={volumeOpen}
				bind:this={volumeButtonEl}
				onclick={() => (volumeOpen = !volumeOpen)}
			>
				<svg class="player__volume-icon" viewBox="0 0 16 16" aria-hidden="true">
					<path class="player__speaker" d="M2 6h2.4L7.6 3.1v9.8L4.4 10H2z"></path>
					<path class="player__wave" d="M9.8 6.1a2.7 2.7 0 0 1 0 3.8"></path>
					<path class="player__wave" d="M11.6 4.3a5.2 5.2 0 0 1 0 7.4"></path>
				</svg>
			</button>
			<div class="player__volume-popover" aria-hidden={!volumeOpen}>
				<button
					class="player__mute"
					type="button"
					aria-label={player.muted ? 'Включить звук' : 'Выключить звук'}
					aria-pressed={player.muted}
					onclick={() => toggleMute()}
				>
					<svg class="player__volume-icon" viewBox="0 0 16 16" aria-hidden="true">
						<path class="player__speaker" d="M2 6h2.4L7.6 3.1v9.8L4.4 10H2z"></path>
						<path class="player__wave" d="M9.8 6.1a2.7 2.7 0 0 1 0 3.8"></path>
						<path class="player__wave" d="M11.6 4.3a5.2 5.2 0 0 1 0 7.4"></path>
					</svg>
				</button>
				<input
					class="player__volume-range"
					type="range"
					min="0"
					max="1"
					step="0.01"
					value={player.volume}
					aria-label="Громкость"
					oninput={(event) => setVolume(Number(event.currentTarget.value))}
				/>
			</div>
		</div>
	</div>

	{#if player.failed}
		<p class="player__error" role="alert">
			<span>Не удалось загрузить трек.</span>
			<button class="player__retry" type="button" onclick={() => retry()}>Повторить</button>
		</p>
	{:else if player.retrying}
		<p class="player__error player__error--note" role="status">Повторная загрузка…</p>
	{/if}

	<div class="library__list">
		{#each visibleTracks as item (item.id)}
			{@const morph = getMorphologyForTrack(item.id)}
			{@const meta = morph ? MORPHOLOGIES[morph] : undefined}
			<div class="lib-track" class:is-current={item.id === player.trackId}>
				<button
					class="lib-track__play"
					type="button"
					aria-label={`Воспроизвести ${item.title} — ${item.genre}`}
					onclick={() => selectTrack(item.id, true)}
				></button>
				<span class="lib-track__num" aria-hidden="true">{item.num}</span>
				<span class="lib-track__name" aria-hidden="true">{item.title}</span>
				<span class="lib-track__genre" aria-hidden="true">{item.genre}</span>
				{#if meta}
					<button
						class="lib-track__morph"
						type="button"
						style={`color:${meta.color}`}
						aria-describedby={`lib-morph-desc-${item.id}`}
						onmouseenter={(event) => showTip(event.currentTarget, meta.description)}
						onfocus={(event) => showTip(event.currentTarget, meta.description)}
						onmouseleave={hideTip}
						onblur={hideTip}
					>{meta.name}</button>
					<span class="sr-only" id={`lib-morph-desc-${item.id}`}>{meta.description}</span>
				{/if}
				<a
					class="lib-track__download"
					href={asset(item.src as AssetPath)}
					download={`${item.title} — ${item.genre}.mp3`}
					aria-label={`Скачать ${item.title} — ${item.genre}`}
				>
					<svg class="lib-track__download-icon" viewBox="0 0 16 16" aria-hidden="true">
						<path d="M8 2.6v6.9"></path>
						<path d="M4.9 6.7 8 9.8l3.1-3.1"></path>
						<path d="M3.4 12.6h9.2"></path>
					</svg>
				</a>
			</div>
		{/each}
	</div>

	{#if tip}
		<div class="lib-tip" style={`left:${tip.x}px;top:${tip.y}px`} aria-hidden="true">{tip.text}</div>
	{/if}
</div>

<style>
	/* ==================== ОБЩАЯ БИБЛИОТЕКА ТРЕКОВ (Lvl1, порт v1.1) ==================== */
	.library {
		position: absolute;
		z-index: 2;
		top: clamp(0.8rem, 2.2vh, 1.5rem);
		left: clamp(0.9rem, 2.4vw, 1.8rem);
		width: min(31vw, 520px);
		max-height: calc(100dvh - clamp(0.8rem, 2.2vh, 1.5rem) - 2rem);
		display: flex;
		flex-direction: column;
		pointer-events: none;
	}

	/* L1 desktop, уровень 1: большая мягкая glass-поверхность, группирующая
	   всю библиотеку (текущий трек + player + список) и отделяющая её от
	   фонового artwork. Псевдоэлемент с отрицательными inset даёт внутренние
	   отступы без reflow — сам список остаётся на прежнем месте. */
	.library::before {
		content: '';
		position: absolute;
		z-index: -1;
		inset: -0.7rem -0.7rem;
		border: 1px solid rgba(190, 200, 255, 0.1);
		border-radius: 16px;
		/* Fallback без backdrop-filter: плотнее, чтобы список читался. */
		background: rgba(9, 10, 26, 0.5);
		box-shadow: 0 18px 46px rgba(3, 4, 14, 0.4);
	}

	/* L1 desktop, уровень 2: текущий трек — более плотная и контрастная
	   подложка поверх большой панели, чтобы читалось «сейчас играет это».
	   Поверхность живёт на самом <p>: псевдоэлемент не подходит, потому что
	   `overflow: hidden` (нужный для ellipsis) обрезал бы его. Вертикальный
	   padding скомпенсирован отрицательными margin — player и список ниже
	   почти не сдвигаются. */
	/* Строка заголовка: текущий трек слева, фильтр морфологий справа. */
	.library__head {
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.library__current {
		flex: 0 1 auto;
		min-width: 0;
		width: fit-content;
		max-width: 100%;
		margin: -0.3rem 0 -0.08rem 0;
		padding: 0.3rem 0.7rem;
		border: 1px solid rgba(200, 208, 255, 0.22);
		border-radius: 10px;
		/* Fallback без backdrop-filter: плотнее, чтобы текст читался. */
		background: rgba(9, 10, 26, 0.72);
		box-shadow:
			0 6px 18px rgba(3, 4, 14, 0.34),
			inset 0 0 20px rgba(180, 139, 255, 0.08);
		font-family: 'Nunito Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
		font-size: clamp(0.8rem, 1.35vw, 1rem);
		font-weight: 300;
		letter-spacing: 0.03em;
		color: rgba(248, 245, 255, 0.94);
		text-shadow:
			0 1px 2px rgba(2, 4, 12, 0.95),
			0 0 12px rgba(2, 4, 12, 0.8);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Когда blur доступен — обе поверхности становятся настоящим glass:
	   большая панель мягче, текущий трек — заметнее и плотнее. */
	@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
		.library::before {
			background: rgba(9, 10, 26, 0.28);
			-webkit-backdrop-filter: blur(10px) saturate(1.08);
			backdrop-filter: blur(10px) saturate(1.08);
		}

		.library__current {
			background: rgba(9, 10, 26, 0.52);
			-webkit-backdrop-filter: blur(8px) saturate(1.1);
			backdrop-filter: blur(8px) saturate(1.1);
		}
	}

	.library__current-genre {
		color: rgba(200, 190, 240, 0.72);
	}

	.library__current-genre::before {
		content: ' · ';
	}

	/* Фильтр морфологий — компактный glass-селект в правой части заголовка.
	   Только desktop: на mobile он скрыт (см. медиа-блок ниже). */
	.library__filter {
		position: relative;
		flex: 0 0 auto;
		pointer-events: auto;
	}

	/* Кнопка всегда называется DNA; выбранная морфология отмечается в списке. */
	.library__filter-btn {
		display: inline-flex;
		align-items: center;
		padding: 0.24rem 0.72rem;
		border: 1px solid rgba(200, 208, 255, 0.22);
		border-radius: 999px;
		background: rgba(9, 10, 26, 0.6);
		color: rgba(240, 237, 252, 0.92);
		font-family: 'Nunito Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
		font-size: 0.62rem;
		font-weight: 300;
		letter-spacing: 0.16em;
		text-indent: 0.16em;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition:
			color var(--dur-ui) var(--ease-ui),
			border-color var(--dur-ui) var(--ease-ui),
			background var(--dur-ui) var(--ease-ui),
			transform var(--dur-fast) var(--ease-out);
	}

	.library__filter-btn:active {
		transform: scale(0.96);
	}

	/* Убираем дефолтную обводку при клике, но сохраняем видимый фокус с клавиатуры. */
	.library__filter-btn:focus {
		outline: none;
	}

	.library__filter-btn:focus-visible {
		outline: 1px solid rgba(216, 198, 255, 0.75);
		outline-offset: 3px;
	}

	.library__filter-btn.is-open {
		color: #ffffff;
		border-color: rgba(180, 139, 255, 0.5);
		background: rgba(9, 10, 26, 0.74);
	}

	@media (hover: hover) and (pointer: fine) {
		.library__filter-btn:hover {
			color: #ffffff;
			border-color: rgba(216, 198, 255, 0.4);
		}
	}

	/* Стеклянный список морфологий. Названия окрашены цветом из MORPHOLOGIES,
	   «Все DNA» — нейтральный; выбранный пункт отмечен галочкой и фоном. */
	.library__filter-menu {
		position: absolute;
		z-index: 6;
		top: calc(100% + 0.35rem);
		right: 0;
		min-width: 10.5rem;
		display: flex;
		flex-direction: column;
		padding: 0.3rem;
		border: 1px solid rgba(200, 208, 255, 0.2);
		border-radius: 12px;
		background: rgba(9, 10, 26, 0.72);
		box-shadow: 0 16px 40px rgba(3, 4, 14, 0.5);
		-webkit-backdrop-filter: blur(12px) saturate(1.1);
		backdrop-filter: blur(12px) saturate(1.1);
	}

	.library__filter-option {
		display: grid;
		grid-template-columns: 0.9em minmax(0, 1fr);
		align-items: center;
		gap: 0.4rem;
		padding: 0.34rem 0.5rem;
		border: 0;
		border-radius: 8px;
		background: transparent;
		color: rgba(238, 232, 255, 0.82);
		font-family: 'Nunito Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
		font-size: 0.68rem;
		font-weight: 300;
		letter-spacing: 0.05em;
		text-align: left;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition:
			background var(--dur-fast) var(--ease-out),
			color var(--dur-fast) var(--ease-out);
	}

	.library__filter-name {
		color: var(--morph-color, inherit);
	}

	.library__filter-check {
		color: transparent;
		font-size: 0.72rem;
		line-height: 1;
		text-align: center;
	}

	.library__filter-option[aria-selected='true'] {
		background: rgba(180, 165, 255, 0.16);
	}

	.library__filter-option[aria-selected='true'] .library__filter-check {
		color: #d8c6ff;
	}

	.library__filter-option:focus {
		outline: none;
	}

	.library__filter-option:focus-visible {
		outline: 1px solid rgba(216, 198, 255, 0.65);
		outline-offset: -2px;
	}

	@media (hover: hover) and (pointer: fine) {
		.library__filter-option:hover {
			background: rgba(180, 165, 255, 0.1);
		}
	}

	.library :global(.player) {
		pointer-events: auto;
		flex: 0 0 auto;
	}

	/* Desktop: одна вертикальная колонка-сетка. Общая сетка колонок живёт на
	   контейнере, а каждая строка — subgrid, поэтому «Жанр» и «DNA» стоят в
	   одних и тех же колонках во всех строках независимо от длины текста. */
	.library__list {
		flex: 1 1 auto;
		min-height: 0;
		margin-top: 0.5rem;
		display: grid;
		grid-template-columns: max-content minmax(0, 1fr) minmax(0, max-content) minmax(0, max-content) max-content;
		align-content: start;
		column-gap: 0.5rem;
		row-gap: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		pointer-events: none;
		scrollbar-width: thin;
		scrollbar-color: rgba(180, 165, 255, 0.4) transparent;
		padding-right: 0.25rem;
	}

	/* Строка каталога — subgrid общей сетки списка: колонки (Номер | Название |
	   Жанр | DNA | Скачивание) одинаковы во всех строках. Первое значение —
	   fallback для браузеров без subgrid (строки хотя бы не ломаются). */
	.lib-track {
		position: relative;
		grid-column: 1 / -1;
		display: grid;
		grid-template-columns: max-content minmax(0, 1fr) max-content max-content max-content;
		grid-template-columns: subgrid;
		align-items: center;
		width: 100%;
		padding: 0.13rem 0.28rem;
		border-radius: 5px;
		background: transparent;
		color: rgba(240, 237, 252, 0.92);
		font-family: 'Nunito Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
		font-size: clamp(0.58rem, 0.72vw, 0.7rem);
		font-weight: 300;
		line-height: 1.25;
		pointer-events: auto;
		text-shadow:
			0 1px 2px rgba(2, 4, 12, 1),
			0 0 5px rgba(2, 4, 12, 0.95),
			0 0 11px rgba(2, 4, 12, 0.85);
		-webkit-tap-highlight-color: transparent;
		transition:
			color var(--dur-ui) var(--ease-ui),
			background var(--dur-ui) var(--ease-ui);
	}

	/* Клик по строке — невидимая кнопка-оверлей на всю строку. Видимый контент
	   лежит выше (z-index) и не перехватывает клики, кроме DNA и скачивания. */
	.lib-track__play {
		position: absolute;
		inset: 0;
		z-index: 0;
		margin: 0;
		padding: 0;
		border: 0;
		border-radius: 5px;
		background: transparent;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.lib-track__play:focus {
		outline: none;
	}

	.lib-track__play:focus-visible {
		outline: 1px solid rgba(216, 198, 255, 0.55);
		outline-offset: -1px;
	}

	@media (hover: hover) and (pointer: fine) {
		.lib-track:hover {
			color: #ffffff;
			background: rgba(180, 165, 255, 0.1);
		}
	}

	.lib-track__num {
		position: relative;
		z-index: 1;
		pointer-events: none;
		min-width: 1.4em;
		color: rgba(192, 200, 238, 0.72);
		font-variant-numeric: tabular-nums;
		text-align: right;
	}

	.lib-track__name {
		position: relative;
		z-index: 1;
		pointer-events: none;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.lib-track__genre {
		position: relative;
		z-index: 1;
		pointer-events: none;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		color: rgba(200, 208, 245, 0.72);
		white-space: nowrap;
	}

	/* Морфология версии: цветной текст (цвет из MORPHOLOGIES). Кнопка —
	   только для фокуса/подсказки, действия не выполняет. */
	.lib-track__morph {
		position: relative;
		z-index: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		padding: 0 0.1rem;
		border: 0;
		border-radius: 4px;
		background: transparent;
		font: inherit;
		letter-spacing: 0.04em;
		white-space: nowrap;
		cursor: help;
		-webkit-tap-highlight-color: transparent;
	}

	.lib-track__morph:focus {
		outline: none;
	}

	.lib-track__morph:focus-visible {
		outline: 1px solid rgba(216, 198, 255, 0.6);
		outline-offset: 1px;
	}

	/* Скачивание трека: вторичная миниатюрная иконка сразу справа от жанра. */
	.lib-track__download {
		position: relative;
		z-index: 1;
		flex: none;
		display: grid;
		place-items: center;
		width: 1em;
		height: 1em;
		border-radius: 50%;
		color: rgba(200, 208, 245, 0.5);
		opacity: 0.85;
		text-decoration: none;
		-webkit-tap-highlight-color: transparent;
		transition:
			color var(--dur-ui) var(--ease-ui),
			background var(--dur-ui) var(--ease-ui),
			opacity var(--dur-ui) var(--ease-ui),
			transform var(--dur-fast) var(--ease-out);
	}

	/* Увеличиваем зону нажатия, не увеличивая видимую иконку. */
	.lib-track__download::after {
		content: '';
		position: absolute;
		inset: -0.4em -0.15em;
	}

	.lib-track__download-icon {
		width: 0.8em;
		height: 0.8em;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.6;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.lib-track__download:active {
		transform: scale(0.9);
	}

	.lib-track__download:focus-visible {
		color: #ffffff;
		opacity: 1;
		outline: 1px solid rgba(216, 198, 255, 0.6);
		outline-offset: 2px;
	}

	@media (hover: hover) and (pointer: fine) {
		.lib-track__download:hover {
			color: #ffffff;
			background: rgba(180, 165, 255, 0.16);
			opacity: 1;
		}
	}

	.lib-track.is-current {
		color: #ffffff;
		background: rgba(180, 165, 255, 0.13);
	}

	.lib-track.is-current .lib-track__num {
		color: var(--accent-b);
	}

	.lib-track.is-current .lib-track__genre {
		color: rgba(255, 200, 175, 0.85);
	}

	/* ==================== PLAYER (общий вид с TrackPlayer) ==================== */
	.player {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.38rem 0.8rem 0.38rem 0.38rem;
		border-radius: 999px;
		border: 1px solid rgba(190, 200, 255, 0.16);
		background: rgba(9, 10, 26, 0.38);
		box-shadow: 0 6px 26px rgba(3, 4, 14, 0.35);
		backdrop-filter: blur(9px) saturate(1.1);
		-webkit-backdrop-filter: blur(9px) saturate(1.1);
	}

	.player__skip {
		flex: none;
		display: grid;
		place-items: center;
		width: 1.5rem;
		height: 1.5rem;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: transparent;
		color: rgba(244, 240, 255, 0.8);
		cursor: pointer;
		transition:
			background var(--dur-ui) var(--ease-ui),
			color var(--dur-ui) var(--ease-ui),
			transform var(--dur-fast) var(--ease-out);
		-webkit-tap-highlight-color: transparent;
	}

	.player__skip:active {
		transform: scale(0.92);
	}

	.player__skip:focus-visible {
		background: rgba(180, 165, 255, 0.28);
		color: #f4f0ff;
		outline: 1px solid rgba(216, 198, 255, 0.7);
		outline-offset: 2px;
	}

	@media (hover: hover) and (pointer: fine) {
		.player__skip:hover {
			background: rgba(180, 165, 255, 0.28);
			color: #f4f0ff;
		}
	}

	.player__skip-icon {
		width: 0.95rem;
		height: 0.95rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.6;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.player__toggle {
		position: relative;
		flex: none;
		display: grid;
		place-items: center;
		width: 1.9rem;
		height: 1.9rem;
		border: 0;
		border-radius: 50%;
		background: rgba(180, 165, 255, 0.18);
		cursor: pointer;
		transition:
			background var(--dur-ui) var(--ease-ui),
			transform var(--dur-fast) var(--ease-out);
		-webkit-tap-highlight-color: transparent;
	}

	.player__toggle:active {
		transform: scale(0.94);
	}

	.player__toggle:focus-visible {
		background: rgba(180, 165, 255, 0.32);
		outline: 1px solid rgba(216, 198, 255, 0.7);
		outline-offset: 3px;
	}

	@media (hover: hover) and (pointer: fine) {
		.player__toggle:hover {
			background: rgba(180, 165, 255, 0.32);
		}
	}

	/* Иконки play/pause: crossfade/scale вместо резкого display:none. */
	.player__toggle::before,
	.player__toggle::after {
		content: '';
		position: absolute;
		inset: 0;
		margin: auto;
		transition:
			opacity var(--dur-fast) var(--ease-ui),
			transform var(--dur-fast) var(--ease-out);
	}

	.player__toggle::before {
		width: 0;
		height: 0;
		border-style: solid;
		border-width: 0.4rem 0 0.4rem 0.66rem;
		border-color: transparent transparent transparent #f4f0ff;
		translate: 1px 0;
		opacity: 1;
		transform: scale(1);
	}

	.player.is-playing .player__toggle::before {
		opacity: 0;
		transform: scale(0.7);
	}

	.player__toggle::after {
		width: 0.62rem;
		height: 0.78rem;
		background:
			linear-gradient(#f4f0ff, #f4f0ff) left / 0.22rem 100% no-repeat,
			linear-gradient(#f4f0ff, #f4f0ff) right / 0.22rem 100% no-repeat;
		opacity: 0;
		transform: scale(0.7);
	}

	.player.is-playing .player__toggle::after {
		opacity: 1;
		transform: scale(1);
	}

	.player__bar {
		position: relative;
		flex: 1;
		height: 2px;
		border-radius: 2px;
		background: rgba(220, 225, 255, 0.22);
		cursor: pointer;
	}

	.player__bar::before {
		content: '';
		position: absolute;
		inset: -9px 0;
	}

	.player__bar:focus {
		outline: none;
	}

	.player__bar:focus-visible {
		outline: 1px solid rgba(216, 198, 255, 0.6);
		outline-offset: 5px;
		border-radius: 3px;
	}

	.player__fill {
		position: absolute;
		inset: 0 auto 0 0;
		width: 0;
		border-radius: 2px;
		background: linear-gradient(90deg, var(--accent-a), var(--accent-b));
	}

	/* Видимый thumb на позиции воспроизведения. */
	.player__fill::after {
		content: '';
		position: absolute;
		top: 50%;
		right: -4px;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #f4f0ff;
		box-shadow: 0 0 8px rgba(150, 200, 255, 0.55);
		opacity: 0.85;
		transform: translate(0, -50%) scale(0.85);
		transition:
			transform var(--dur-fast) var(--ease-out),
			opacity var(--dur-fast) var(--ease-ui);
	}

	.player__bar:hover .player__fill::after,
	.player__bar:focus-visible .player__fill::after,
	.player__bar:active .player__fill::after {
		opacity: 1;
		transform: translate(0, -50%) scale(1);
	}

	.player__bar.is-disabled {
		cursor: default;
	}

	.player__bar.is-disabled .player__fill::after {
		opacity: 0;
	}

	/* Индикатор загрузки: кольцо вместо иконки play, без layout shift. */
	.player__spinner {
		position: absolute;
		inset: 0;
		margin: auto;
		width: 0.95rem;
		height: 0.95rem;
		border: 2px solid rgba(244, 240, 255, 0.22);
		border-top-color: #f4f0ff;
		border-radius: 50%;
		opacity: 0;
		animation: player-spin 700ms linear infinite;
		transition: opacity var(--dur-fast) var(--ease-ui);
	}

	.player.is-loading .player__spinner {
		opacity: 1;
	}

	.player.is-loading .player__toggle::before,
	.player.is-loading .player__toggle::after {
		opacity: 0;
	}

	@keyframes player-spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Ошибка загрузки: понятное действие «Повторить» через существующий retry(). */
	.player__error {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0.35rem 0 0 0.15rem;
		font-family: 'Nunito Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
		font-size: 0.72rem;
		font-weight: 300;
		color: #ffb1a1;
		pointer-events: auto;
		text-shadow: 0 1px 2px rgba(2, 4, 12, 0.95);
	}

	.player__error--note {
		color: rgba(238, 232, 255, 0.72);
	}

	.player__retry {
		flex: none;
		padding: 0.15rem 0.6rem;
		border: 1px solid rgba(255, 177, 161, 0.5);
		border-radius: 999px;
		background: rgba(255, 177, 161, 0.12);
		color: #ffd9d1;
		font: inherit;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition:
			background var(--dur-ui) var(--ease-ui),
			border-color var(--dur-ui) var(--ease-ui),
			transform var(--dur-fast) var(--ease-out);
	}

	.player__retry:active {
		transform: scale(0.95);
	}

	.player__retry:focus-visible {
		outline: 1px solid rgba(255, 200, 190, 0.8);
		outline-offset: 2px;
	}

	@media (hover: hover) and (pointer: fine) {
		.player__retry:hover {
			background: rgba(255, 177, 161, 0.22);
			border-color: rgba(255, 177, 161, 0.75);
		}
	}

	.player__time {
		flex: none;
		font-size: 0.66rem;
		letter-spacing: 0.03em;
		color: rgba(238, 232, 255, 0.72);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.player__volume {
		position: relative;
		flex: none;
		display: grid;
		place-items: center;
	}

	.player__volume-button,
	.player__mute {
		display: grid;
		place-items: center;
		padding: 0;
		border: 0;
		background: transparent;
		color: rgba(244, 240, 255, 0.85);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition:
			color var(--dur-ui) var(--ease-ui),
			transform var(--dur-fast) var(--ease-out);
	}

	.player__volume-button:active,
	.player__mute:active {
		transform: scale(0.88);
	}

	.player__volume-button {
		width: 1.05rem;
		height: 1.05rem;
	}

	.player__mute {
		flex: none;
		width: 0.95rem;
		height: 0.95rem;
	}

	.player__volume-button:focus-visible,
	.player__mute:focus-visible {
		color: #ffffff;
		outline: 1px solid rgba(216, 198, 255, 0.6);
		outline-offset: 3px;
		border-radius: 3px;
	}

	@media (hover: hover) and (pointer: fine) {
		.player__volume-button:hover,
		.player__mute:hover {
			color: #ffffff;
		}
	}

	.player__volume-popover {
		position: absolute;
		left: calc(100% + 0.55rem);
		top: 50%;
		z-index: 6;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.7rem;
		border: 1px solid rgba(190, 200, 255, 0.16);
		border-radius: 999px;
		background: rgba(9, 10, 26, 0.64);
		box-shadow: 0 8px 26px rgba(3, 4, 14, 0.5);
		backdrop-filter: blur(10px) saturate(1.1);
		-webkit-backdrop-filter: blur(10px) saturate(1.1);
		opacity: 0;
		visibility: hidden;
		pointer-events: none;
		transform: translate(4px, -50%);
		transition:
			opacity var(--dur-ui) var(--ease-ui),
			transform var(--dur-ui) var(--ease-out),
			visibility 0s linear var(--dur-ui);
	}

	.player.is-volume-open .player__volume-popover {
		opacity: 1;
		visibility: visible;
		pointer-events: auto;
		transform: translate(0, -50%);
		transition-delay: 0s;
	}

	.player__volume-icon {
		width: 100%;
		height: 100%;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.3;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.player__speaker {
		fill: currentColor;
		stroke: none;
	}

	.player__wave {
		transition: opacity var(--dur-ui) var(--ease-ui);
	}

	.player.is-muted .player__wave {
		opacity: 0.12;
	}

	.player__volume-range {
		flex: none;
		width: 54px;
		height: 14px;
		margin: 0;
		padding: 0;
		background: transparent;
		-webkit-appearance: none;
		appearance: none;
		cursor: pointer;
	}

	.player__volume-range:focus {
		outline: none;
	}

	.player__volume-range:focus-visible {
		outline: 1px solid rgba(216, 198, 255, 0.6);
		outline-offset: 3px;
		border-radius: 3px;
	}

	.player__volume-range::-webkit-slider-runnable-track {
		height: 2px;
		border-radius: 2px;
		background: rgba(220, 225, 255, 0.22);
	}

	.player__volume-range::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 9px;
		height: 9px;
		margin-top: -3.5px;
		border: 0;
		border-radius: 50%;
		background: #f4f0ff;
		box-shadow: 0 0 6px rgba(150, 200, 255, 0.55);
	}

	.player__volume-range::-moz-range-track {
		height: 2px;
		border-radius: 2px;
		background: rgba(220, 225, 255, 0.22);
	}

	.player__volume-range::-moz-range-thumb {
		width: 9px;
		height: 9px;
		border: 0;
		border-radius: 50%;
		background: #f4f0ff;
		box-shadow: 0 0 6px rgba(150, 200, 255, 0.55);
	}

	/* Подсказка морфологии: position: fixed, чтобы её не обрезал скролл списка. */
	.lib-tip {
		position: fixed;
		z-index: 5;
		translate: -50% calc(-100% - 0.45rem);
		padding: 0.3rem 0.6rem;
		border: 1px solid rgba(216, 198, 255, 0.2);
		border-radius: 8px;
		background: rgba(9, 10, 26, 0.92);
		box-shadow: 0 8px 22px rgba(3, 4, 14, 0.55);
		color: rgba(244, 240, 255, 0.95);
		font-family: 'Nunito Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
		font-size: 0.68rem;
		font-weight: 300;
		letter-spacing: 0.04em;
		white-space: nowrap;
		pointer-events: none;
	}

	/* L1 desktop: вертикальная подстройка по замечаниям. Значения заданы от
	   текущего состояния один раз (без накопления при ре-рендерах):
	   кнопка DNA — на 0,2 см выше, плеер и всё ниже — на 0,3 см ниже,
	   нижняя граница списка — на 1 см ниже текущей (библиотека выше на 1 см).

	   Важно: сдвиг кнопки/меню — это translate на них самих, а НЕ на
	   .library__filter. translate на обёртке-фильтре создавал stacking context
	   и «запирал» z-index выпадающего меню под строками списка. */
	@media (min-width: 641px) {
		.library__filter-btn,
		.library__filter-menu {
			translate: 0 -0.2cm;
		}

		.library :global(.player) {
			margin-top: 0.3cm;
		}

		.library {
			max-height: calc(100dvh - clamp(0.8rem, 2.2vh, 1.5rem) - 2rem - 1.5cm);
		}
	}

	/* ==================== МОБИЛЬНАЯ КОМПОЗИЦИЯ (portrait phone) ==================== */
	@media (max-width: 640px) {
		.library {
			top: auto;
			bottom: 0;
			left: 0;
			right: 0;
			width: 100%;
			max-height: min(44dvh, 360px);
			display: flex;
			flex-direction: column;
			padding: 0.7rem 0.8rem calc(0.7rem + env(safe-area-inset-bottom, 0px));
			background: linear-gradient(
				to top,
				rgba(5, 3, 12, 0.94) 0%,
				rgba(5, 3, 12, 0.78) 62%,
				rgba(5, 3, 12, 0) 100%
			);
		}

		/* Desktop-панель библиотеки на телефоне не нужна: у нижней
		   панели уже свой фон, mobile visual model сохраняется. */
		.library::before {
			display: none;
		}

		/* Мобильная библиотека сохраняет прежний вид: десктопный фильтр и
		   колонку морфологии в неё не переносим. */
		.library__filter,
		.lib-track__morph {
			display: none;
		}

		.library__current {
			/* На телефоне трек живёт в нижней панели со своим фоном —
			   desktop-подложки здесь не дублируем, layout не меняем. */
			width: auto;
			max-width: none;
			margin: 0 0 0.28rem 0.15rem;
			padding: 0;
			border: 0;
			border-radius: 0;
			background: transparent;
			box-shadow: none;
			-webkit-backdrop-filter: none;
			backdrop-filter: none;
			font-size: 0.9rem;
		}

		.library__list {
			flex: 1 1 auto;
			min-height: 0;
			margin-top: 0.5rem;
			display: grid;
			grid-template-columns: max-content minmax(0, 1fr) max-content max-content;
			align-content: start;
			column-gap: 0.4rem;
			row-gap: 0;
			overflow-y: auto;
			overscroll-behavior: contain;
			pointer-events: auto;
			-webkit-overflow-scrolling: touch;
			scrollbar-width: thin;
			scrollbar-color: rgba(180, 165, 255, 0.4) transparent;
			padding-right: 0.25rem;
		}

		.lib-track {
			font-size: 0.85rem;
			padding: 0.34rem 0.4rem;
			overflow: hidden;
		}

		.lib-track__play {
			gap: 0.5rem;
		}

		.lib-track__download {
			width: 1.5rem;
			height: 1.5rem;
			color: rgba(210, 216, 245, 0.72);
			opacity: 1;
		}

		.lib-track__download-icon {
			width: 0.95rem;
			height: 0.95rem;
		}

		.player__bar::before {
			inset: -14px 0;
		}

		.player__volume-popover {
			left: auto;
			right: calc(100% + 0.55rem);
			transform: translate(-4px, -50%);
		}

		.player.is-volume-open .player__volume-popover {
			transform: translate(0, -50%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.lib-track__play:active,
		.lib-track__download:active,
		.player__skip:active,
		.player__toggle:active,
		.player__volume-button:active,
		.player__mute:active,
		.player__retry:active {
			transform: none;
		}

		.player__toggle::before,
		.player__toggle::after {
			transition: opacity var(--dur-fast) linear;
		}

		.player__spinner {
			animation: none;
		}
	}
</style>
