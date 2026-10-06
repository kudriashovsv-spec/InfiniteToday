import { error } from '@sveltejs/kit';
import { getWorld, worlds } from '#lib/data/worlds.js';
import { getWorldTracks } from '#lib/data/music.js';
import { getLyrics } from '#lib/data/lyrics.js';

// Для статического билда SvelteKit должен знать, какие slug пререндерить.
// Список берётся из каталога миров — восьмой мир появится здесь автоматически.
export function entries() {
	return worlds.map((world) => ({ slug: world.slug }));
}

export function load({ params }) {
	const world = getWorld(params.slug);
	if (!world) error(404, 'Мир не найден');

	return {
		world,
		tracks: getWorldTracks(world.slug),
		lyrics: getLyrics(world.slug) ?? ''
	};
}
