// Данные пресетов Butterchurn — «золотая десятка» из production v1.1
// (vendor/butterchurn/preset-library.json).
//
// Здесь только метаданные: id, короткое и полное имя и путь к payload-скрипту
// ОТНОСИТЕЛЬНО static/. Сами тяжёлые payload'ы и runtime лежат в
// static/vendor/butterchurn/ и подгружаются лениво, по одному, только когда
// реально понадобились (см. src/lib/audio/butterchurn.js).
//
// Пресеты не привязаны к мирам: как в v1.1, это общий shuffle-bag на все версии.

export interface ButterchurnPreset {
	id: string;
	short: string;
	name: string;
	/** путь относительно static/ */
	src: string;
}

export const presets: ButterchurnPreset[] = [
	{ id: '3layers', short: '3 layers', name: 'Geiss - 3 layers (Tunnel Mix)', src: 'vendor/butterchurn/presets/3layers.js' },
	{ id: 'planet1', short: 'Planet 1', name: 'Geiss - Planet 1', src: 'vendor/butterchurn/presets/planet1.js' },
	{ id: 'starornament', short: 'Star Ornament', name: 'Zylot - Star Ornament', src: 'vendor/butterchurn/presets/starornament.js' },
	{
		id: 'mandala',
		short: 'Mandala Chasers',
		name: 'Phat+fiShbRaiN+Eo.S_Mandala_Chasers_remix',
		src: 'vendor/butterchurn/presets/mandala.js'
	},
	{
		id: 'fractaldrop',
		short: 'FractalDrop 7c',
		name: 'Rovastar + Loadus + Geiss - Tone-mapped FractalDrop 7c',
		src: 'vendor/butterchurn/presets/fractaldrop.js'
	},
	{ id: 'infinity', short: 'Infinity', name: 'martin - infinity (2010 update)', src: 'vendor/butterchurn/presets/infinity.js' },
	{ id: 'ludicrous', short: 'Ludicrous Speed', name: 'martin - ludicrous speed', src: 'vendor/butterchurn/presets/ludicrous.js' },
	{ id: 'angel', short: 'Angel Flight', name: 'martin - angel flight', src: 'vendor/butterchurn/presets/angel.js' },
	{
		id: 'skylight',
		short: 'Skylight',
		name: 'Eo.S. + Zylot - skylight (Stained Glass Majesty mix)',
		src: 'vendor/butterchurn/presets/skylight.js'
	},
	{
		id: 'hyperkaleido',
		short: 'Hyperkaleidoscope Glow',
		name: 'Rovastar + Geiss - Hyperkaleidoscope Glow 2 motion blur (Jelly)',
		src: 'vendor/butterchurn/presets/hyperkaleido.js'
	}
];
