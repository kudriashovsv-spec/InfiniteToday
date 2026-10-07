<script lang="ts">
	import { asset } from '$app/paths';
	import type { AssetPath } from '$app/types';
	import type { Snippet } from 'svelte';

	/**
	 * Полноэкранная «сцена» уровня: изображение вписывается по cover так,
	 * что его пропорции сохраняются, а проценты вложенных элементов
	 * совпадают с координатами картинки (приём из v1.1).
	 */
	interface SceneProps {
		/** путь к изображению относительно static/ */
		src: AssetPath;
		width?: number;
		height?: number;
		containOnNarrow?: boolean;
		children?: Snippet;
	}

	let { src, width = 1672, height = 941, containOnNarrow = false, children }: SceneProps = $props();
</script>

<div class="scene" class:contain-on-narrow={containOnNarrow} style="--w:{width};--h:{height}">
	<img class="scene__img" src={asset(src)} alt="" decoding="async" />
	{@render children?.()}
</div>

<div class="screen__veil"></div>

<style>
	.scene {
		position: absolute;
		top: 50%;
		left: 50%;
		translate: -50% -50%;
		width: max(100%, calc(100vh * var(--w) / var(--h)));
		height: max(100%, calc(100vw * var(--h) / var(--w)));
		/* dvh учитывает динамическую адресную строку мобильных браузеров */
		width: max(100%, calc(100dvh * var(--w) / var(--h)));
		transform-origin: 50% 50%;
	}

	/* Показывать изображение целиком на узких экранах (ширина 100%, высота по
	   пропорции) — нужно ТОЛЬКО там, где важны все координаты сцены: например,
	   карта L2, чтобы все точки входа оставались доступны. L1 opt-in не включает
	   и сохраняет свой полноэкранный mobile-вариант. Порог 820px — как в v1.1. */
	@media (max-width: 820px) {
		.scene.contain-on-narrow {
			width: 100%;
			height: auto;
			aspect-ratio: var(--w) / var(--h);
		}
	}

	.scene__img {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
		/* сцена уже имеет пропорции изображения, cover страхует от округлений */
		object-fit: cover;
		user-select: none;
		pointer-events: none;
	}

	/* Тёплый свет и виньетка поверх сцены (как в v1.1). */
	.screen__veil {
		position: absolute;
		inset: 0;
		background:
			radial-gradient(
				120% 80% at 50% 118%,
				rgba(255, 138, 92, 0.18) 0%,
				rgba(255, 138, 92, 0) 55%
			),
			radial-gradient(
				95% 75% at 50% 42%,
				rgba(10, 4, 24, 0) 42%,
				rgba(5, 3, 12, 0.55) 100%
			);
		pointer-events: none;
	}
</style>
