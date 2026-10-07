// Production robots.txt. Все публичные страницы открыты, указан абсолютный
// sitemap с production base path (без localhost/dev URL).
import { absoluteUrl } from '#lib/seo.js';

export const prerender = true;

export function GET(): Response {
	const body = `User-agent: *\nAllow: /\n\nSitemap: ${absoluteUrl('/sitemap.xml')}\n`;
	return new Response(body, {
		headers: { 'content-type': 'text/plain; charset=utf-8' }
	});
}
