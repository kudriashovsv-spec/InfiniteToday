// Данные галереи. ЕДИНЫЙ источник правды — production gallery.json
// (schema gallery-v1): 10 категорий, 111 работ, 303 файла (sm/md/lg).
//
// Манифест импортируется как модуль (он небольшой и нужен только на /gallery,
// поэтому Vite выносит его в чанк галереи, а не в initial bundle L1).
// Картинки остаются обычными static-assets в static/gallery/**; здесь хранятся
// только относительные пути, к которым UI применяет asset().
//
// Оригиналы-архивы в production bundle не входят — только WebP.
//
// 12 world-mobile работ из «Концептов миров» переиспользуют артефакты
// `static/images/worlds/<slug>.webp` (без дублирования): их `path` начинается
// с `../images/worlds/...`, поэтому `${galleryDir}/${path}` выходит за пределы
// `static/gallery`, а браузер нормализует такой URL.

import manifest from './gallery.json';

/** Путь к галерее относительно static/ (используется с asset()). */
export const galleryDir = 'gallery';

export interface GalleryFile {
	path: string;
	w: number;
	h: number;
	bytes: number;
}

export interface GalleryFiles {
	lg?: GalleryFile;
	md?: GalleryFile;
	sm: GalleryFile;
}

export interface GalleryWork {
	id: string;
	category: string;
	title: string;
	w: number;
	h: number;
	ratio: number;
	files: GalleryFiles;
}

export interface GalleryCategory {
	slug: string;
	title: string;
	kind: string;
	count: number;
}

/** Итоги сборки манифеста (categories/images/files/bytes). */
export interface GalleryStats {
	categories: number;
	images: number;
	files: number;
	bytes: number;
}

/** 10 категорий в авторском порядке (порядок задан явно, не сортируем). */
export const categories: GalleryCategory[] = manifest.categories;

/** 111 работ в порядке манифеста. */
export const works: GalleryWork[] = manifest.images;

/** Статистика из манифеста (categories/images/files/bytes). */
export const galleryStats: GalleryStats = manifest.stats;

/**
 * Файл нужного варианта с fallback на sm.
 */
export function fileOf(work: GalleryWork, variant: 'lg' | 'md' | 'sm'): GalleryFile {
	return work.files[variant] || work.files.sm;
}

/**
 * Работы выбранной категории (или все при 'all') в порядке манифеста.
 */
export function worksIn(category: string): GalleryWork[] {
	if (!category || category === 'all') return works;
	return works.filter((work) => work.category === category);
}

/** Категория, в которой лежат концепт-арты миров. */
export const CONCEPT_ART_CATEGORY = 'koncepty-mirov';

/**
 * Концепт-арт конкретного мира из категории «Концепты миров».
 *
 * id работ этой категории следует шаблону `koncepty-mirov-world-<slug>`.
 * Возвращает `GalleryWork | undefined` — данные берутся из того же манифеста,
 * что и галерея, без дублирующего слоя и без хардкода путей в UI.
 */
export function conceptArtFor(slug: string): GalleryWork | undefined {
	const id = `koncepty-mirov-world-${slug}`;
	return works.find((work) => work.id === id && work.category === CONCEPT_ART_CATEGORY);
}
