// Реестр канонических музыкальных версий (production v1.1).
//
// Phase 4: перенесены все 40 версий. Это ЕДИНЫЙ источник правды для:
//   • GlobalPlayer L1 (список библиотеки, порядок = num);
//   • WorldView/TrackPlayer (getWorldTracks(slug));
//   • Butterchurn и будущего Audio DNA (активный источник знает свой id/world).
//
// `src` — путь ОТНОСИТЕЛЬНО static/; к нему всегда применяется asset().
// `world` — slug мира песни или null, если версия живёт только в библиотеке L1.
// `num` — порядок в общей библиотеке L1 (как в разметке v1.1, по алфавиту).
// `worldOrder` — порядок версий внутри мира, как на страницах миров v1.1
// (он НЕ совпадает с алфавитным порядком библиотеки); null для остальных.
//
// id: для 14 версий миров сохранён проектный id Phase 2 (без переименований);
// для остальных 26 — version_id из production vendor/butterchurn/version-registry.js.

/**
 * @typedef {object} Track
 * @property {string} id
 * @property {string | null} world
 * @property {string} title
 * @property {string} genre
 * @property {string} src
 * @property {number} num
 * @property {number | null} worldOrder
 */

/** @type {Track[]} */
export const tracks = [
	{ id: 'antisaga-electronic', world: null, title: "Антисага", genre: "Electronic", src: 'music/antisaga-electronic.mp3', num: 1, worldOrder: null },
	{ id: 'beshenaya-electropop', world: null, title: "Бешеная", genre: "Electropop", src: 'music/beshenaya-electropop.mp3', num: 2, worldOrder: null },
	{ id: 'brothers-aggressive-dnb', world: 'brothers', title: "Братья", genre: "Aggressive DnB", src: 'music/brothers-aggressive-dnb.mp3', num: 3, worldOrder: 1 },
	{ id: 'brothers-indietronica', world: 'brothers', title: "Братья", genre: "Indietronica", src: 'music/brothers-indietronica.mp3', num: 4, worldOrder: 2 },
	{ id: 'bronya-trap', world: null, title: "Броня", genre: "Trap", src: 'music/bronya-trap.mp3', num: 5, worldOrder: null },
	{ id: 'time-alternative-rock', world: 'time', title: "Время не торопи", genre: "Alternative Rock", src: 'music/time-alternative-rock.mp3', num: 6, worldOrder: 2 },
	{ id: 'time-lofi', world: 'time', title: "Время не торопи", genre: "Lofi", src: 'music/time-lofi.mp3', num: 7, worldOrder: 1 },
	{ id: 'vse-vperedi-electropop', world: null, title: "Всё впереди", genre: "Electropop", src: 'music/vse-vperedi-electropop.mp3', num: 8, worldOrder: null },
	{ id: 'dar-alternative-rock', world: null, title: "Дар", genre: "Alternative Rock", src: 'music/dar-alternative-rock.mp3', num: 9, worldOrder: null },
	{ id: 'dar-lofi', world: null, title: "Дар", genre: "Lofi", src: 'music/dar-lofi.mp3', num: 10, worldOrder: null },
	{ id: 'suns-indietronica', world: 'suns', title: "Дети Солнц", genre: "Indietronica", src: 'music/suns-indietronica.mp3', num: 11, worldOrder: 2 },
	{ id: 'suns-psychill', world: 'suns', title: "Дети Солнц", genre: "Psychill", src: 'music/suns-psychill.mp3', num: 12, worldOrder: 1 },
	{ id: 'dota-vinovata-breakbeat', world: null, title: "Дота виновата", genre: "BreakBeat", src: 'music/dota-vinovata-breakbeat.mp3', num: 13, worldOrder: null },
	{ id: 'zhzl-lofi', world: null, title: "ЖЗЛ", genre: "Lofi", src: 'music/zhzl-lofi.mp3', num: 14, worldOrder: null },
	{ id: 'zhzl-post-punk', world: null, title: "ЖЗЛ", genre: "Post-punk", src: 'music/zhzl-post-punk.mp3', num: 15, worldOrder: null },
	{ id: 'zdravstvuy-v-pervyy-raz-downtempo', world: null, title: "Здравствуй в первый раз", genre: "Downtempo", src: 'music/zdravstvuy-v-pervyy-raz-downtempo.mp3', num: 16, worldOrder: null },
	{ id: 'zdravstvuy-v-pervyy-raz-ethno-hop', world: null, title: "Здравствуй в первый раз", genre: "Ethno-hop", src: 'music/zdravstvuy-v-pervyy-raz-ethno-hop.mp3', num: 17, worldOrder: null },
	{ id: 'igra-rock-infused-electropop', world: null, title: "Игра", genre: "Rock-infused Electropop", src: 'music/igra-rock-infused-electropop.mp3', num: 18, worldOrder: null },
	{ id: 'luchshee-za-besplatno-dnb', world: null, title: "Лучшее за бесплатно", genre: "DnB", src: 'music/luchshee-za-besplatno-dnb.mp3', num: 19, worldOrder: null },
	{ id: 'luchshee-za-besplatno-metalcore', world: null, title: "Лучшее за бесплатно", genre: "Metalcore", src: 'music/luchshee-za-besplatno-metalcore.mp3', num: 20, worldOrder: null },
	{ id: 'dream-dnb-deathcore', world: 'dream', title: "Мечтай", genre: "DnB Deathcore", src: 'music/dream-dnb-deathcore.mp3', num: 21, worldOrder: 1 },
	{ id: 'hope-downtempo', world: 'hope', title: "Оправданная надежда", genre: "Downtempo", src: 'music/hope-downtempo.mp3', num: 22, worldOrder: 2 },
	{ id: 'hope-neurofunk', world: 'hope', title: "Оправданная надежда", genre: "Neurofunk", src: 'music/hope-neurofunk.mp3', num: 23, worldOrder: 1 },
	{ id: 'parabola-dnb', world: null, title: "Парабола", genre: "DnB", src: 'music/parabola-dnb.mp3', num: 24, worldOrder: null },
	{ id: 'parabola-indietronica', world: null, title: "Парабола", genre: "Indietronica", src: 'music/parabola-indietronica.mp3', num: 25, worldOrder: null },
	{ id: 'turn-dnb', world: 'turn', title: "Поворот туда", genre: "DnB", src: 'music/turn-dnb.mp3', num: 26, worldOrder: 1 },
	{ id: 'turn-metalcore', world: 'turn', title: "Поворот туда", genre: "Metalcore", src: 'music/turn-metalcore.mp3', num: 27, worldOrder: 2 },
	{ id: 'posik-alternative-electronic', world: 'posik', title: "Поиск", genre: "Alternative Electronic", src: 'music/posik-alternative-electronic.mp3', num: 28, worldOrder: 2 },
	{ id: 'posik-alternative-rock', world: 'posik', title: "Поиск", genre: "Alternative Rock", src: 'music/posik-alternative-rock.mp3', num: 29, worldOrder: 3 },
	{ id: 'posik-psychedelic-electronic', world: 'posik', title: "Поиск", genre: "Psychedelic Electronic", src: 'music/posik-psychedelic-electronic.mp3', num: 30, worldOrder: 1 },
	{ id: 'polovinki-dnb', world: null, title: "Половинки", genre: "DnB", src: 'music/polovinki-dnb.mp3', num: 31, worldOrder: null },
	{ id: 'polovinki-punk-rock', world: null, title: "Половинки", genre: "Punk Rock", src: 'music/polovinki-punk-rock.mp3', num: 32, worldOrder: null },
	{ id: 'poteryat-sebya-indietronica', world: null, title: "Потерять себя", genre: "Indietronica", src: 'music/poteryat-sebya-indietronica.mp3', num: 33, worldOrder: null },
	{ id: 'poteryat-sebya-rock-infused-dnb', world: null, title: "Потерять себя", genre: "Rock-infused DnB", src: 'music/poteryat-sebya-rock-infused-dnb.mp3', num: 34, worldOrder: null },
	{ id: 'spusk-dark-psybient', world: null, title: "Спуск", genre: "Dark Psybient", src: 'music/spusk-dark-psybient.mp3', num: 35, worldOrder: null },
	{ id: 'teoriya-vsego-trip-hop', world: null, title: "Теория всего", genre: "Trip-Hop", src: 'music/teoriya-vsego-trip-hop.mp3', num: 36, worldOrder: null },
	{ id: 'yunost-alternative-rock', world: null, title: "Юность", genre: "Alternative Rock", src: 'music/yunost-alternative-rock.mp3', num: 37, worldOrder: null },
	{ id: 'yunost-dnb', world: null, title: "Юность", genre: "DnB", src: 'music/yunost-dnb.mp3', num: 38, worldOrder: null },
	{ id: 'yunost-indietronica', world: null, title: "Юность", genre: "Indietronica", src: 'music/yunost-indietronica.mp3', num: 39, worldOrder: null },
	{ id: 'ya-geroy-nashego-vremeni-trap', world: null, title: "Я герой нашего времени", genre: "Trap", src: 'music/ya-geroy-nashego-vremeni-trap.mp3', num: 40, worldOrder: null },
];

/** @type {Map<string, Track>} */
const byId = new Map(tracks.map((track) => [track.id, track]));

/**
 * @param {string} id
 * @returns {Track | undefined}
 */
export function getTrack(id) {
	return byId.get(id);
}

/**
 * Версии конкретного мира в порядке страниц v1.1 (worldOrder).
 * @param {string} slug
 * @returns {Track[]}
 */
export function getWorldTracks(slug) {
	return tracks
		.filter((track) => track.world === slug)
		.sort((a, b) => (a.worldOrder ?? 0) - (b.worldOrder ?? 0));
}

/**
 * Полная библиотека L1 в порядке v1.1 (num).
 * @returns {Track[]}
 */
export function getLibraryTracks() {
	return tracks;
}
