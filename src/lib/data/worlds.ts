// Каталог миров (production-материал).
//
// Phase 2: перенесены все 7 миров v1.1; позже добавлены ещё три
// (Бешеная, Дота виновата, Здравствуй в первый раз) — всего 10. Один и тот же
// WorldView рисует любой из них по данным — отдельных страниц под мир нет.
//
// Чтобы добавить новый мир, достаточно: добавить запись сюда, версии в
// music.js, текст в lyrics.js и artwork в static/images/worlds/. UI не меняется.
//
// Координаты hotspot — РЕАЛЬНЫЕ desktop-значения production v1.1
// (итоговые блоки «L2 DESKTOP: ручная настройка входов»). Это проценты
// от изображения карты PaigLvl2.webp (1672×941); они вручную выверены
// и НЕ пересчитываются.
//
// `artwork` — путь ОТНОСИТЕЛЬНО static/. В v1.1 сцену L3 рисует визуализатор
// (Butterchurn), отдельного desktop-артворка у миров нет; поэтому сценой и
// мобильной карточкой служит реальный artwork мира (mobile WebP).
//
// Пилот TypeScript: JSDoc-typedefs перенесены в настоящие типы. Публичный
// рантайм-API модуля не изменился (`worlds`, `getWorld`).

export interface WorldHotspot {
	/** процент от ширины изображения карты */
	left: string;
	/** процент от высоты изображения карты */
	top: string;
	/** ширина зоны (desktop) */
	width: string;
	/** высота зоны (desktop) */
	height: string;
}

/** положение подписи на карте */
export type WorldLabelSide = 'below' | 'above' | 'left';

export interface World {
	slug: string;
	title: string;
	artwork: string;
	labelSide: WorldLabelSide;
	/** сдвиг панели вниз (длинный заголовок мира) */
	panelShift: boolean;
	/**
	 * Дополнительный сдвиг song-panel вниз ТОЛЬКО на desktop (+2 cm).
	 * Нужен там, где раскрытая DNA иначе заходит в область заголовка мира.
	 * На mobile не влияет (там своя композиция).
	 */
	panelShiftDesktop?: boolean;
	/** необязательный сдвиг заголовка L3 вниз на Desktop (CSS length) */
	titleShift?: string;
	/** необязательное ограничение ширины заголовка L3 на Mobile (CSS length) */
	titleMobileMaxWidth?: string;
	hotspot: WorldHotspot;
}

export const worlds: World[] = [
	{
		slug: 'posik',
		title: 'Поиск',
		artwork: 'images/worlds/posik.webp',
		labelSide: 'below',
		panelShift: false,
		panelShiftDesktop: true,
		hotspot: { left: '49.25%', top: '45.47%', width: '4%', height: '7.1%' }
	},
	{
		slug: 'dream',
		title: 'Мечтай',
		artwork: 'images/worlds/dream.webp',
		labelSide: 'above',
		panelShift: false,
		panelShiftDesktop: true,
		hotspot: { left: '16.05%', top: '51.69%', width: '3%', height: '5.33%' }
	},
	{
		slug: 'suns',
		title: 'Дети Солнц',
		artwork: 'images/worlds/suns.webp',
		labelSide: 'below',
		panelShift: false,
		panelShiftDesktop: true,
		hotspot: { left: '17.46%', top: '20.51%', width: '4.3333%', height: '7.7%' }
	},
	{
		slug: 'hope',
		title: 'Оправданная надежда',
		artwork: 'images/worlds/hope.webp',
		labelSide: 'below',
		panelShift: true,
		titleMobileMaxWidth: '10em',
		hotspot: { left: '58.08%', top: '31.22%', width: '3%', height: '5.33%' }
	},
	{
		slug: 'time',
		title: 'Время не торопи',
		artwork: 'images/worlds/time.webp',
		labelSide: 'left',
		panelShift: true,
		hotspot: { left: '90.91%', top: '46.68%', width: '3%', height: '5.3333%' }
	},
	{
		slug: 'brothers',
		title: 'Братья',
		artwork: 'images/worlds/brothers.webp',
		labelSide: 'below',
		panelShift: false,
		panelShiftDesktop: true,
		hotspot: { left: '21.54%', top: '62.61%', width: '4%', height: '7.1%' }
	},
	{
		slug: 'turn',
		title: 'Поворот туда',
		artwork: 'images/worlds/turn.webp',
		labelSide: 'below',
		panelShift: true,
		hotspot: { left: '63.73%', top: '76.62%', width: '4%', height: '7.1%' }
	},
	// Новые миры (Desktop L2). left/top — центр входа (MapHotspot использует
	// translate: -50% -50%), в процентах от карты PaigLvl2.webp (1672×941).
	{
		slug: 'beshenaya',
		title: 'Бешеная',
		artwork: 'images/worlds/beshenaya.webp',
		labelSide: 'below',
		panelShift: false,
		panelShiftDesktop: true,
		hotspot: { left: '26.25%', top: '41.39%', width: '4%', height: '7.1%' }
	},
	{
		slug: 'dota-vinovata',
		title: 'Дота виновата',
		artwork: 'images/worlds/dota-vinovata.webp',
		labelSide: 'above',
		panelShift: true,
		hotspot: { left: '34.6%', top: '37.74%', width: '4%', height: '7.1%' }
	},
	{
		slug: 'zdravstvuy-v-pervyy-raz',
		title: 'Здравствуй в первый раз',
		artwork: 'images/worlds/zdravstvuy-v-pervyy-raz.webp',
		labelSide: 'above',
		panelShift: true,
		titleShift: '19px',
		titleMobileMaxWidth: '8.55em',
		hotspot: { left: '53.8%', top: '65.45%', width: '4%', height: '7.1%' }
	},
	// «Спуск»: координаты из ручной калибровки desktop L2 (`?calibrate`).
	{
		slug: 'spusk',
		title: 'Спуск',
		artwork: 'images/worlds/spusk.webp',
		labelSide: 'below',
		panelShift: false,
		hotspot: { left: '40.96%', top: '70.91%', width: '4%', height: '7.1%' }
	},
	// «Потерять себя»: финальные desktop-координаты, заданные Сергеем
	// (подпись над входом). Не перекалибровывать без отдельного решения.
	{
		slug: 'poteryat-sebya',
		title: 'Потерять себя',
		artwork: 'images/worlds/poteryat-sebya.webp',
		labelSide: 'above',
		panelShift: true,
		hotspot: { left: '69.52%', top: '76.06%', width: '4%', height: '7.1%' }
	},
	// «Антисага»: финальные desktop-координаты, заданные Сергеем через
	// `/space?calibrate` (подпись над входом). Не перекалибровывать без
	// отдельного решения.
	{
		slug: 'antisaga',
		title: 'Антисага',
		artwork: 'images/worlds/antisaga.webp',
		labelSide: 'above',
		panelShift: false,
		hotspot: { left: '42.42%', top: '58.62%', width: '4%', height: '7.1%' }
	},
	// «Теория всего»: финальные desktop-координаты, заданные Сергеем.
	// Не перекалибровывать без отдельного решения.
	{
		slug: 'teoriya-vsego',
		title: 'Теория всего',
		artwork: 'images/worlds/teoriya-vsego.webp',
		labelSide: 'above',
		panelShift: true,
		hotspot: { left: '41.36%', top: '23.6%', width: '4%', height: '7.1%' }
	}
];

export function getWorld(slug: string): World | undefined {
	return worlds.find((world) => world.slug === slug);
}

// Постоянный порядок миров для Mobile L2 (список карточек).
//
// Это отдельная конфигурация ТОЛЬКО для мобильного списка: Desktop L2,
// sitemap, route entries и остальные потребители продолжают использовать
// порядок массива `worlds`. Здесь хранятся только slug'и, а объекты миров
// берутся из `worlds` — единственного источника правды.
export const mobileWorldOrder: readonly string[] = [
	'zdravstvuy-v-pervyy-raz',
	'posik',
	'dota-vinovata',
	'spusk',
	'time',
	'beshenaya',
	'brothers',
	'poteryat-sebya',
	'turn',
	'antisaga',
	'dream',
	'suns',
	'teoriya-vsego',
	'hope'
];

/** Миры в фиксированном Mobile-порядке (для карточек на узких экранах). */
export function getMobileWorlds(): World[] {
	const bySlug = new Map(worlds.map((world) => [world.slug, world]));
	return mobileWorldOrder
		.map((slug) => bySlug.get(slug))
		.filter((world): world is World => world !== undefined);
}
