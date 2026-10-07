// Каталог миров (production-материал).
//
// Phase 2: перенесены все 7 миров v1.1. Один и тот же WorldView рисует любой
// из них по данным — отдельных страниц/условных веток под мир нет.
//
// Чтобы добавить восьмой мир, достаточно: добавить запись сюда, версии в
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
	hotspot: WorldHotspot;
}

export const worlds: World[] = [
	{
		slug: 'posik',
		title: 'Поиск',
		artwork: 'images/worlds/posik.webp',
		labelSide: 'below',
		panelShift: false,
		hotspot: { left: '53.83%', top: '65.36%', width: '4%', height: '7.1%' }
	},
	{
		slug: 'dream',
		title: 'Мечтай',
		artwork: 'images/worlds/dream.webp',
		labelSide: 'above',
		panelShift: false,
		hotspot: { left: '63.7%', top: '76.4%', width: '3%', height: '5.3333%' }
	},
	{
		slug: 'suns',
		title: 'Дети Солнц',
		artwork: 'images/worlds/suns.webp',
		labelSide: 'below',
		panelShift: false,
		hotspot: { left: '17.46%', top: '20.51%', width: '4.3333%', height: '7.7%' }
	},
	{
		slug: 'hope',
		title: 'Оправданная надежда',
		artwork: 'images/worlds/hope.webp',
		labelSide: 'below',
		panelShift: true,
		hotspot: { left: '58.13%', top: '31.03%', width: '3%', height: '5.3333%' }
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
		hotspot: { left: '15.9667%', top: '51.5%', width: '4%', height: '7.1%' }
	},
	{
		slug: 'turn',
		title: 'Поворот туда',
		artwork: 'images/worlds/turn.webp',
		labelSide: 'below',
		panelShift: true,
		hotspot: { left: '49.3%', top: '45.8%', width: '4%', height: '7.1%' }
	}
];

export function getWorld(slug: string): World | undefined {
	return worlds.find((world) => world.slug === slug);
}
