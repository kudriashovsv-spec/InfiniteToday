// SEO-константы и помощники. ЕДИНЫЙ источник production-URL и общих метаданных,
// чтобы canonical / Open Graph / sitemap не дублировали адрес по страницам.
//
// Base path совпадает с `paths.base` в vite.config.js (GitHub Pages deployment).
// SvelteKit при prerender отдаёт относительные пути (`paths.relative` по
// умолчанию), поэтому canonical и OG-URL строятся от абсолютного production
// origin, а не от `page.url` — иначе в разметку попал бы localhost/dev.

export const SITE_ORIGIN = 'https://kudriashovsv-spec.github.io';
export const BASE_PATH = '/InfiniteToday';
export const SITE_URL = `${SITE_ORIGIN}${BASE_PATH}`;
export const SITE_NAME = 'Infinite Today';
export const SITE_LOCALE = 'ru_RU';
export const SITE_LANG = 'ru';

/**
 * Основное preview-изображение (относительно static/), если у страницы нет своего.
 *
 * Намеренно JPEG, а не WebP: Telegram не рендерит WebP в link preview и в этом
 * случае не показывает превью-карточку.
 * Размеры должны совпадать с реальным файлом `static/images/og-preview.jpg`.
 */
export const PREVIEW_IMAGE = 'images/og-preview.jpg';
export const PREVIEW_IMAGE_WIDTH = 1733;
export const PREVIEW_IMAGE_HEIGHT = 907;

/** Изображение Open Graph по умолчанию — то же основное preview-изображение. */
export const DEFAULT_IMAGE = PREVIEW_IMAGE;

/** Абсолютный URL страницы по root-relative пути без base (`/`, `/space`, …). */
export function absoluteUrl(path: string): string {
	if (/^https?:\/\//i.test(path)) return path;
	const suffix = path === '/' ? '/' : `/${path.replace(/^\/+/, '')}`;
	return `${SITE_URL}${suffix}`;
}

/** Абсолютный URL ассета по пути относительно static/ (`images/…`). */
export function absoluteAsset(assetPath: string): string {
	return absoluteUrl(assetPath.replace(/^\/+/, ''));
}

/** MIME-тип изображения по расширению (для og:image:type). */
export function imageMimeType(path: string): string {
	const ext = path.split('.').pop()?.toLowerCase() ?? '';
	if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
	if (ext === 'png') return 'image/png';
	if (ext === 'webp') return 'image/webp';
	return 'image/jpeg';
}

/** Русская форма множественного числа: pluralRu(2, 'версия', 'версии', 'версий'). */
export function pluralRu(count: number, one: string, few: string, many: string): string {
	const mod10 = count % 10;
	const mod100 = count % 100;
	if (mod10 === 1 && mod100 !== 11) return one;
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
	return many;
}
