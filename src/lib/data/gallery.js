// Данные галереи. ЕДИНЫЙ источник правды — production gallery.json
// (schema gallery-v1): 11 категорий, 99 работ, 291 WebP-вариант (sm/md/lg).
//
// Манифест импортируется как модуль (он небольшой и нужен только на /gallery,
// поэтому Vite выносит его в чанк галереи, а не в initial bundle L1).
// Картинки остаются обычными static-assets в static/gallery/**; здесь хранятся
// только относительные пути, к которым UI применяет asset().
//
// Оригиналы-архивы в production bundle не входят — только 291 WebP.

import manifest from './gallery.json';

/** Путь к галерее относительно static/ (используется с asset()). */
export const galleryDir = 'gallery';

/**
 * @typedef {{ path: string, w: number, h: number, bytes: number }} GalleryFile
 * @typedef {{
 *   id: string,
 *   category: string,
 *   title: string,
 *   w: number,
 *   h: number,
 *   ratio: number,
 *   files: { lg?: GalleryFile, md?: GalleryFile, sm: GalleryFile }
 * }} GalleryWork
 * @typedef {{ slug: string, title: string, kind: string, count: number }} GalleryCategory
 */

/** 11 категорий в порядке production v1.1 (порядок задан явно, не сортируем). */
export const categories = /** @type {GalleryCategory[]} */ (manifest.categories);

/** 99 работ в порядке production v1.1. */
export const works = /** @type {GalleryWork[]} */ (manifest.images);

/** Статистика из манифеста (categories/images/files/bytes). */
export const galleryStats = manifest.stats;

/**
 * Файл нужного варианта с fallback на sm.
 * @param {GalleryWork} work
 * @param {'lg' | 'md' | 'sm'} variant
 * @returns {GalleryFile}
 */
export function fileOf(work, variant) {
	return work.files[variant] || work.files.sm;
}

/**
 * Работы выбранной категории (или все при 'all') в порядке манифеста.
 * @param {string} category
 * @returns {GalleryWork[]}
 */
export function worksIn(category) {
	if (!category || category === 'all') return works;
	return works.filter((work) => work.category === category);
}
