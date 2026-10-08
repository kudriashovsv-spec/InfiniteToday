// Реестр канонических музыкальных версий (production v1.1).
//
// Phase 4: перенесены все 40 версий. Это ЕДИНЫЙ источник правды для:
//   • GlobalPlayer L1 (список библиотеки, порядок = num);
//   • WorldView/TrackPlayer (getWorldTracks(slug));
//   • Butterchurn и будущего Audio DNA (активный источник знает свой id/world).
//
// `src` — путь ОТНОСИТЕЛЬНО static/; к нему всегда применяется asset().
// `world` — slug мира песни или null, если версия живёт только в библиотеке L1.
// `num` — порядок в общей библиотеке L1 (авторский порядок из
// WorkingFiles/Порядок песен; НЕ алфавитный).
// `worldOrder` — порядок версий внутри мира, как на страницах миров v1.1
// (он НЕ совпадает с алфавитным порядком библиотеки); null для остальных.
//
// id: для 14 версий миров сохранён проектный id Phase 2 (без переименований);
// для остальных 26 — version_id из production vendor/butterchurn/version-registry.js.

export interface Track {
	id: string;
	/** slug мира песни или null, если версия живёт только в библиотеке L1 */
	world: string | null;
	title: string;
	genre: string;
	/** путь относительно static/ (к нему всегда применяется asset()) */
	src: string;
	/** длительность в секундах (build-time, из реального MP3) */
	durationSec: number;
	/** порядок в общей библиотеке L1 (авторский порядок, НЕ алфавитный) */
	num: number;
	/** порядок версий внутри мира (не совпадает с алфавитным); null для остальных */
	worldOrder: number | null;
}

export const tracks: Track[] = [
	{ id: 'luchshee-za-besplatno-dnb', world: null, title: "Лучшее за бесплатно", genre: "DnB", src: 'music/luchshee-za-besplatno-dnb.mp3', num: 1, durationSec: 243, worldOrder: null },
	{ id: 'turn-dnb', world: 'turn', title: "Поворот туда", genre: "DnB", src: 'music/turn-dnb.mp3', num: 2, durationSec: 245, worldOrder: 1 },
	{ id: 'brothers-aggressive-dnb', world: 'brothers', title: "Братья", genre: "Aggressive DnB", src: 'music/brothers-aggressive-dnb.mp3', num: 3, durationSec: 193, worldOrder: 1 },
	{ id: 'parabola-dnb', world: null, title: "Парабола", genre: "DnB", src: 'music/parabola-dnb.mp3', num: 4, durationSec: 190, worldOrder: null },
	{ id: 'hope-neurofunk', world: 'hope', title: "Оправданная надежда", genre: "Neurofunk", src: 'music/hope-neurofunk.mp3', num: 5, durationSec: 273, worldOrder: 1 },
	{ id: 'yunost-dnb', world: null, title: "Юность", genre: "DnB", src: 'music/yunost-dnb.mp3', num: 6, durationSec: 205, worldOrder: null },
	{ id: 'dream-dnb-deathcore', world: 'dream', title: "Мечтай", genre: "DnB Deathcore", src: 'music/dream-dnb-deathcore.mp3', num: 7, durationSec: 261, worldOrder: 1 },
	{ id: 'polovinki-dnb', world: null, title: "Половинки", genre: "DnB", src: 'music/polovinki-dnb.mp3', num: 8, durationSec: 274, worldOrder: null },
	{ id: 'poteryat-sebya-rock-infused-dnb', world: null, title: "Потерять себя", genre: "Rock-infused DnB", src: 'music/poteryat-sebya-rock-infused-dnb.mp3', num: 9, durationSec: 252, worldOrder: null },
	{ id: 'time-alternative-rock', world: 'time', title: "Время не торопи", genre: "Alternative Rock", src: 'music/time-alternative-rock.mp3', num: 10, durationSec: 264, worldOrder: 2 },
	{ id: 'dar-alternative-rock', world: null, title: "Дар", genre: "Alternative Rock", src: 'music/dar-alternative-rock.mp3', num: 11, durationSec: 298, worldOrder: null },
	{ id: 'luchshee-za-besplatno-metalcore', world: null, title: "Лучшее за бесплатно", genre: "Metalcore", src: 'music/luchshee-za-besplatno-metalcore.mp3', num: 12, durationSec: 306, worldOrder: null },
	{ id: 'turn-metalcore', world: 'turn', title: "Поворот туда", genre: "Metalcore", src: 'music/turn-metalcore.mp3', num: 13, durationSec: 261, worldOrder: 2 },
	{ id: 'posik-alternative-rock', world: 'posik', title: "Поиск", genre: "Alternative Rock", src: 'music/posik-alternative-rock.mp3', num: 14, durationSec: 282, worldOrder: 3 },
	{ id: 'polovinki-punk-rock', world: null, title: "Половинки", genre: "Punk Rock", src: 'music/polovinki-punk-rock.mp3', num: 15, durationSec: 150, worldOrder: null },
	{ id: 'yunost-alternative-rock', world: null, title: "Юность", genre: "Alternative Rock", src: 'music/yunost-alternative-rock.mp3', num: 16, durationSec: 230, worldOrder: null },
	{ id: 'zhzl-post-punk', world: null, title: "ЖЗЛ", genre: "Post-punk", src: 'music/zhzl-post-punk.mp3', num: 17, durationSec: 333, worldOrder: null },
	{ id: 'igra-rock-infused-electropop', world: null, title: "Игра", genre: "Rock-infused Electropop", src: 'music/igra-rock-infused-electropop.mp3', num: 18, durationSec: 192, worldOrder: null },
	{ id: 'beshenaya-electropop', world: 'beshenaya', title: "Бешеная", genre: "Electropop", src: 'music/beshenaya-electropop.mp3', num: 19, durationSec: 152, worldOrder: 1 },
	{ id: 'vse-vperedi-electropop', world: null, title: "Всё впереди", genre: "Electropop", src: 'music/vse-vperedi-electropop.mp3', num: 20, durationSec: 228, worldOrder: null },
	{ id: 'posik-psychedelic-electronic', world: 'posik', title: "Поиск", genre: "Psychedelic Electronic", src: 'music/posik-psychedelic-electronic.mp3', num: 21, durationSec: 300, worldOrder: 1 },
	{ id: 'dota-vinovata-breakbeat', world: 'dota-vinovata', title: "Дота виновата", genre: "BreakBeat", src: 'music/dota-vinovata-breakbeat.mp3', num: 22, durationSec: 230, worldOrder: 1 },
	{ id: 'antisaga-electronic', world: null, title: "Антисага", genre: "Electronic", src: 'music/antisaga-electronic.mp3', num: 23, durationSec: 358, worldOrder: null },
	{ id: 'spusk-dark-psybient', world: 'spusk', title: "Спуск", genre: "Dark Psybient", src: 'music/spusk-dark-psybient.mp3', num: 24, durationSec: 286, worldOrder: 1 },
	{ id: 'zdravstvuy-v-pervyy-raz-downtempo', world: 'zdravstvuy-v-pervyy-raz', title: "Здравствуй в первый раз", genre: "Downtempo", src: 'music/zdravstvuy-v-pervyy-raz-downtempo.mp3', num: 25, durationSec: 275, worldOrder: 1 },
	{ id: 'hope-downtempo', world: 'hope', title: "Оправданная надежда", genre: "Downtempo", src: 'music/hope-downtempo.mp3', num: 26, durationSec: 310, worldOrder: 2 },
	{ id: 'suns-psychill', world: 'suns', title: "Дети Солнц", genre: "Psychill", src: 'music/suns-psychill.mp3', num: 27, durationSec: 295, worldOrder: 1 },
	{ id: 'dar-lofi', world: null, title: "Дар", genre: "Lofi", src: 'music/dar-lofi.mp3', num: 28, durationSec: 301, worldOrder: null },
	{ id: 'zhzl-lofi', world: null, title: "ЖЗЛ", genre: "Lofi", src: 'music/zhzl-lofi.mp3', num: 29, durationSec: 184, worldOrder: null },
	{ id: 'time-lofi', world: 'time', title: "Время не торопи", genre: "Lofi", src: 'music/time-lofi.mp3', num: 30, durationSec: 188, worldOrder: 1 },
	{ id: 'brothers-indietronica', world: 'brothers', title: "Братья", genre: "Indietronica", src: 'music/brothers-indietronica.mp3', num: 31, durationSec: 227, worldOrder: 2 },
	{ id: 'poteryat-sebya-indietronica', world: null, title: "Потерять себя", genre: "Indietronica", src: 'music/poteryat-sebya-indietronica.mp3', num: 32, durationSec: 218, worldOrder: null },
	{ id: 'yunost-indietronica', world: null, title: "Юность", genre: "Indietronica", src: 'music/yunost-indietronica.mp3', num: 33, durationSec: 308, worldOrder: null },
	{ id: 'posik-alternative-electronic', world: 'posik', title: "Поиск", genre: "Alternative Electronic", src: 'music/posik-alternative-electronic.mp3', num: 34, durationSec: 335, worldOrder: 2 },
	{ id: 'suns-indietronica', world: 'suns', title: "Дети Солнц", genre: "Indietronica", src: 'music/suns-indietronica.mp3', num: 35, durationSec: 272, worldOrder: 2 },
	{ id: 'parabola-indietronica', world: null, title: "Парабола", genre: "Indietronica", src: 'music/parabola-indietronica.mp3', num: 36, durationSec: 325, worldOrder: null },
	{ id: 'teoriya-vsego-trip-hop', world: null, title: "Теория всего", genre: "Trip-Hop", src: 'music/teoriya-vsego-trip-hop.mp3', num: 37, durationSec: 269, worldOrder: null },
	{ id: 'zdravstvuy-v-pervyy-raz-ethno-hop', world: 'zdravstvuy-v-pervyy-raz', title: "Здравствуй в первый раз", genre: "Ethno-hop", src: 'music/zdravstvuy-v-pervyy-raz-ethno-hop.mp3', num: 38, durationSec: 228, worldOrder: 2 },
	{ id: 'ya-geroy-nashego-vremeni-trap', world: null, title: "Я герой нашего времени", genre: "Trap", src: 'music/ya-geroy-nashego-vremeni-trap.mp3', num: 39, durationSec: 123, worldOrder: null },
	{ id: 'bronya-trap', world: null, title: "Броня", genre: "Trap", src: 'music/bronya-trap.mp3', num: 40, durationSec: 130, worldOrder: null },
];

const byId = new Map<string, Track>(
	tracks.map((track): [string, Track] => [track.id, track])
);

export function getTrack(id: string): Track | undefined {
	return byId.get(id);
}

/**
 * Версии конкретного мира в порядке страниц v1.1 (worldOrder).
 */
export function getWorldTracks(slug: string): Track[] {
	return tracks
		.filter((track) => track.world === slug)
		.sort((a, b) => (a.worldOrder ?? 0) - (b.worldOrder ?? 0));
}

/**
 * Полная библиотека L1 в авторском порядке (по num).
 */
export function getLibraryTracks(): Track[] {
	return tracks;
}
