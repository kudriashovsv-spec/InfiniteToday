// ДНК песни — авторские визуальные отпечатки версий (8 осей, значения 0–100).
//
// Источник значений — ручной рабочий файл `WorkingFiles/ДНК/DNA.txt`
// (авторские оценки; НЕ вычисляются автоматически и НЕ анализируются из MP3).
//
// Ключ — `track.id` из `music.ts`, поэтому UI не содержит хардкода песен:
// он берёт ДНК по id версии через `getDna(trackId)`.
//
// Порядок значений совпадает с порядком `DNA_AXES`: Свет, Тепло, Глубина,
// Воздух, Движение, Напряжение, Интимность, Странность.

export interface DnaAxis {
	key: string;
	title: string;
	/** полюс «0» */
	low: string;
	/** полюс «100» */
	high: string;
}

export const DNA_AXES: readonly DnaAxis[] = [
	{ key: 'light', title: 'Свет', low: 'мрак', high: 'сияние' },
	{ key: 'warmth', title: 'Тепло', low: 'холод', high: 'тепло' },
	{ key: 'depth', title: 'Глубина', low: 'поверхность', high: 'бездна' },
	{ key: 'air', title: 'Воздух', low: 'плотность', high: 'простор' },
	{ key: 'motion', title: 'Движение', low: 'покой', high: 'поток' },
	{ key: 'tension', title: 'Напряжение', low: 'расслабленность', high: 'внутренний накал' },
	{ key: 'intimacy', title: 'Интимность', low: 'личное', high: 'масштабное' },
	{ key: 'strangeness', title: 'Странность', low: 'знакомое', high: 'необычное' }
];

/** 8 значений 0–100 в порядке DNA_AXES. */
export type DnaValues = readonly number[];

/**
 * Характер силуэта. Значения по-прежнему задают индивидуальную форму,
 * morphology — её базу: ширину/остроту/кривизну/асимметрию/закрутку/центр.
 */
export type DnaMorphology = 'bloom' | 'star' | 'crystal' | 'pulse' | 'spiral' | 'void';

/**
 * Метаданные морфологии — ЕДИНЫЙ источник названия, цвета и описания.
 *
 * Название и цвет использует UI (подпись над DNA на L3, дальше — фильтр L1);
 * описание зарезервировано для подсказок фильтра. Геометрия силуэта
 * (scale/hw/breath) живёт в `SongDna.svelte` и сюда не переносится.
 */
export interface MorphologyMeta {
	id: DnaMorphology;
	/** отображаемое название (Bloom … Void) */
	name: string;
	/** фирменный цвет сигнатуры */
	color: string;
	/** краткое описание для UI-подсказок */
	description: string;
}

/** Канонический порядок морфологий (для фильтров/списков). */
export const MORPHOLOGY_ORDER: readonly DnaMorphology[] = [
	'bloom',
	'star',
	'crystal',
	'pulse',
	'spiral',
	'void'
];

/** Метаданные шести морфологий по их id. */
export const MORPHOLOGIES: Record<DnaMorphology, MorphologyMeta> = {
	bloom: { id: 'bloom', name: 'Bloom', color: '#FFC98A', description: 'светлые' },
	star: { id: 'star', name: 'Star', color: '#9EDBFF', description: 'яркие, эпические' },
	crystal: { id: 'crystal', name: 'Crystal', color: '#C7BCFF', description: 'загадочные' },
	pulse: { id: 'pulse', name: 'Pulse', color: '#FF719C', description: 'быстрые, напряжённые' },
	spiral: { id: 'spiral', name: 'Spiral', color: '#73E6D5', description: 'текучие' },
	void: { id: 'void', name: 'Void', color: '#8C72FF', description: 'глубокие' }
};

/** Метаданные морфологии по её id. */
export function getMorphology(id: DnaMorphology): MorphologyMeta {
	return MORPHOLOGIES[id];
}

/** ДНК версии: 8 значений + ручной художественный выбор morphology. */
export interface TrackDna {
	values: DnaValues;
	morphology: DnaMorphology;
}

/** ДНК конкретных версий по `track.id`. Значения и morphology заданы вручную. */
export const trackDna: Record<string, TrackDna> = {
	'turn-dnb': { values: [87, 68, 79, 57, 88, 70, 63, 49], morphology: 'star' },
	'brothers-aggressive-dnb': { values: [50, 28, 91, 11, 79, 89, 91, 77], morphology: 'pulse' },
	'hope-neurofunk': { values: [74, 31, 74, 21, 88, 91, 93, 84], morphology: 'pulse' },
	'dream-dnb-deathcore': { values: [74, 79, 56, 29, 79, 88, 28, 79], morphology: 'pulse' },
	'time-alternative-rock': { values: [90, 84, 88, 53, 74, 47, 29, 33], morphology: 'star' },
	'turn-metalcore': { values: [87, 73, 79, 67, 75, 65, 63, 63], morphology: 'star' },
	'posik-alternative-rock': { values: [58, 38, 82, 32, 67, 78, 33, 49], morphology: 'star' },
	'beshenaya-electropop': { values: [28, 39, 43, 32, 88, 69, 38, 47], morphology: 'pulse' },
	'posik-psychedelic-electronic': { values: [79, 55, 74, 74, 56, 43, 44, 36], morphology: 'void' },
	'dota-vinovata-breakbeat': { values: [37, 51, 32, 29, 85, 90, 44, 36], morphology: 'pulse' },
	'spusk-dark-psybient': { values: [3, 7, 81, 19, 28, 97, 9, 79], morphology: 'pulse' },
	'zdravstvuy-v-pervyy-raz-downtempo': { values: [84, 64, 84, 63, 34, 11, 68, 71], morphology: 'crystal' },
	'hope-downtempo': { values: [84, 85, 74, 49, 33, 25, 93, 77], morphology: 'spiral' },
	'suns-psychill': { values: [98, 97, 86, 94, 5, 8, 87, 67], morphology: 'bloom' },
	'time-lofi': { values: [95, 91, 88, 84, 15, 22, 29, 41], morphology: 'bloom' },
	'brothers-indietronica': { values: [50, 58, 91, 44, 38, 55, 91, 63], morphology: 'crystal' },
	'posik-alternative-electronic': { values: [68, 43, 79, 43, 39, 63, 44, 57], morphology: 'bloom' },
	'suns-indietronica': { values: [88, 87, 89, 74, 35, 38, 87, 71], morphology: 'void' },
	'zdravstvuy-v-pervyy-raz-ethno-hop': { values: [89, 77, 84, 79, 66, 39, 68, 79], morphology: 'bloom' },
	'poteryat-sebya-rock-infused-dnb': { values: [61, 62, 86, 33, 86, 89, 44, 66], morphology: 'star' },
	'poteryat-sebya-indietronica': { values: [84, 82, 86, 74, 22, 17, 44, 48], morphology: 'bloom' }
};

/** ДНК версии по её `track.id` (или undefined, если для версии её ещё нет). */
export function getDna(trackId: string): TrackDna | undefined {
	return trackDna[trackId];
}

/**
 * Морфологии версий БЕЗ полных 8 осей: это треки, живущие только в каталоге L1.
 * Источник — авторский список морфологий в `DNA.txt`. Для версий с полной DNA
 * (мира L3) морфология НЕ дублируется — она берётся из `trackDna`.
 */
export const libraryMorphology: Record<string, DnaMorphology> = {
	'luchshee-za-besplatno-dnb': 'bloom',
	'parabola-dnb': 'pulse',
	'yunost-dnb': 'pulse',
	'polovinki-dnb': 'pulse',
	'dar-alternative-rock': 'void',
	'luchshee-za-besplatno-metalcore': 'star',
	'polovinki-punk-rock': 'pulse',
	'yunost-alternative-rock': 'star',
	'zhzl-post-punk': 'void',
	'igra-rock-infused-electropop': 'pulse',
	'vse-vperedi-electropop': 'pulse',
	'antisaga-electronic': 'void',
	'dar-lofi': 'spiral',
	'zhzl-lofi': 'spiral',
	'yunost-indietronica': 'spiral',
	'parabola-indietronica': 'void',
	'teoriya-vsego-trip-hop': 'spiral',
	'ya-geroy-nashego-vremeni-trap': 'star',
	'bronya-trap': 'star'
};

/**
 * Морфология ЛЮБОЙ версии каталога: сначала полная DNA (версии L3), затем
 * библиотечная запись. Единая точка входа, чтобы классификация не дублировалась.
 */
export function getMorphologyForTrack(trackId: string): DnaMorphology | undefined {
	return trackDna[trackId]?.morphology ?? libraryMorphology[trackId];
}
