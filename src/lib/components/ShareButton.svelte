<script lang="ts">
	import { onDestroy } from 'svelte';
	import { absoluteUrl } from '#lib/seo.js';

	/**
	 * Переиспользуемая кнопка «Поделиться».
	 *
	 * Системный Web Share API (navigator.share) на клиенте; при его отсутствии
	 * или ошибке — fallback на копирование ссылки через Clipboard API. URL всегда
	 * строится из общего SEO-помощника absoluteUrl (production /InfiniteToday),
	 * поэтому dev/localhost и внутренние UI-состояния сюда не попадают.
	 *
	 * SSR-safe: navigator не читается при рендере, только внутри обработчика клика.
	 */
	interface ShareButtonProps {
		/** root-relative путь без base: `/`, `/world/posik` */
		path: string;
		title: string;
		text: string;
		/** видимая подпись; она же accessible name (иконка aria-hidden) */
		label?: string;
		/** ghost — компактный текстовый вариант под существующие ссылки */
		variant?: 'pill' | 'ghost';
	}

	let { path, title, text, label = 'Поделиться', variant = 'pill' }: ShareButtonProps = $props();

	const url = $derived(absoluteUrl(path));

	type Status = 'idle' | 'copied' | 'error';
	let busy = $state(false);
	let status = $state<Status>('idle');
	let timer: ReturnType<typeof setTimeout> | undefined;

	function clearTimer(): void {
		if (timer !== undefined) {
			clearTimeout(timer);
			timer = undefined;
		}
	}

	function flash(next: Exclude<Status, 'idle'>): void {
		status = next;
		clearTimer();
		timer = setTimeout(() => {
			status = 'idle';
			timer = undefined;
		}, 2600);
	}

	/** Отмена пользователем — не ошибка, просто возвращаемся в idle. */
	function isAbort(error: unknown): boolean {
		return (
			typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError'
		);
	}

	/** Копирование через Clipboard API; при отсутствии — legacy textarea. */
	async function copyLink(): Promise<boolean> {
		try {
			if (navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(url);
				return true;
			}
		} catch {
			/* падаем в legacy ниже */
		}
		try {
			const area = document.createElement('textarea');
			area.value = url;
			area.setAttribute('readonly', '');
			area.style.position = 'fixed';
			area.style.opacity = '0';
			document.body.appendChild(area);
			area.select();
			const ok = document.execCommand('copy');
			area.remove();
			return ok;
		} catch {
			return false;
		}
	}

	async function onShare(): Promise<void> {
		if (busy) return;

		// navigator.share обязан вызываться прямо из обработчика клика,
		// без await до самого вызова — иначе теряется transient activation.
		if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
			const data = { title, text, url };
			if (typeof navigator.canShare === 'function' && !navigator.canShare(data)) {
				busy = true;
				try {
					flash((await copyLink()) ? 'copied' : 'error');
				} finally {
					busy = false;
				}
				return;
			}
			busy = true;
			try {
				await navigator.share(data);
				status = 'idle';
			} catch (error) {
				// Отмена — не ошибка; настоящая ошибка → fallback на копирование.
				if (isAbort(error)) status = 'idle';
				else flash((await copyLink()) ? 'copied' : 'error');
			} finally {
				busy = false;
			}
			return;
		}

		busy = true;
		try {
			flash((await copyLink()) ? 'copied' : 'error');
		} finally {
			busy = false;
		}
	}

	onDestroy(clearTimer);
</script>

<span class="share" class:is-ghost={variant === 'ghost'}>
	<button
		class="share__button"
		type="button"
		disabled={busy}
		aria-busy={busy}
		onclick={onShare}
	>
		<svg class="share__icon" viewBox="0 0 16 16" aria-hidden="true">
			<path d="M8 1.6v8.2" />
			<path d="M4.9 4.7 8 1.6l3.1 3.1" />
			<path d="M3.4 7.6v6h9.2v-6" />
		</svg>
		<span class="share__label">{label}</span>
	</button>
	{#if status === 'copied'}
		<span class="share__status" role="status">Ссылка скопирована</span>
	{:else if status === 'error'}
		<span class="share__status share__status--error" role="alert">Не удалось поделиться</span>
	{/if}
</span>

<style>
	.share {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.share__button {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		min-height: 34px;
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
		-webkit-tap-highlight-color: transparent;
		transition:
			color var(--dur-ui) var(--ease-ui),
			background var(--dur-ui) var(--ease-ui),
			border-color var(--dur-ui) var(--ease-ui),
			transform var(--dur-fast) var(--ease-out);
	}

	.share__button:active {
		transform: scale(0.97);
	}

	.share__button:focus-visible {
		color: #f4f0ff;
		background: rgba(9, 10, 26, 0.5);
		border-color: rgba(190, 200, 255, 0.28);
		outline: 1px solid rgba(216, 198, 255, 0.6);
		outline-offset: 4px;
	}

	.share__button:disabled {
		opacity: 0.6;
		cursor: default;
	}

	@media (hover: hover) and (pointer: fine) {
		.share__button:hover:not(:disabled) {
			color: #f4f0ff;
			background: rgba(9, 10, 26, 0.5);
			border-color: rgba(190, 200, 255, 0.28);
		}
	}

	.share__icon {
		flex: none;
		width: 0.9rem;
		height: 0.9rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.share__label {
		white-space: nowrap;
	}

	.share__status {
		font-size: 0.72rem;
		font-weight: 300;
		letter-spacing: 0.04em;
		color: rgba(198, 246, 208, 0.9);
		white-space: nowrap;
	}

	.share__status--error {
		color: #ffb1a1;
	}

	/* ghost: под существующие текстовые ссылки (главная, social-колонка) */
	.share.is-ghost {
		gap: 0.4rem;
	}

	.share.is-ghost .share__button {
		min-height: 24px;
		padding: 0.1rem 0;
		border: 0;
		border-radius: 3px;
		background: transparent;
		backdrop-filter: none;
		-webkit-backdrop-filter: none;
		color: rgba(238, 236, 250, 0.72);
		font-size: clamp(0.72rem, 1.1vw, 0.9rem);
		letter-spacing: 0.06em;
		text-shadow:
			0 1px 2px rgba(2, 4, 12, 0.95),
			0 0 9px rgba(2, 4, 12, 0.8);
	}

	.share.is-ghost .share__button:focus-visible {
		color: #ffffff;
		background: transparent;
		outline: 1px solid rgba(216, 198, 255, 0.55);
		outline-offset: 3px;
		border-radius: 3px;
	}

	@media (hover: hover) and (pointer: fine) {
		.share.is-ghost .share__button:hover:not(:disabled) {
			color: #ffffff;
			background: transparent;
			border-color: transparent;
		}
	}

	@media (max-width: 640px) {
		.share__button {
			min-height: 40px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.share__button:active {
			transform: none;
		}
	}
</style>
