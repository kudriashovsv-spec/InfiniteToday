// Production sitemap.xml для статического GitHub Pages deployment.
//
// Список публичных страниц строится из данных проекта (главная, space, gallery
// и все миры из каталога), поэтому восьмой мир появится здесь автоматически.
// Внутренние/fragment-состояния (lightbox, query-UI) в sitemap не попадают.
import { worlds } from '#lib/data/worlds.js';
import { absoluteUrl } from '#lib/seo.js';

export const prerender = true;

export function GET(): Response {
	const paths = ['/', '/space', '/gallery', ...worlds.map((world) => `/world/${world.slug}`)];
	const urls = paths.map((path) => `\t<url><loc>${absoluteUrl(path)}</loc></url>`).join('\n');
	const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

	return new Response(body, {
		headers: { 'content-type': 'application/xml; charset=utf-8' }
	});
}
