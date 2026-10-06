import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// Production hosting: https://kudriashovsv-spec.github.io/InfiniteToday/
// The site is therefore never served from the domain root, so the base path is
// part of the architecture rather than a deploy-time afterthought.
// Apply it in dev too, so that absolute-path mistakes surface immediately.
const base = '/InfiniteToday';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Fully static output: no Node server in production.
			adapter: adapter({
				pages: 'build',
				assets: 'build',
				fallback: undefined,
				precompress: false,
				strict: true
			}),

			paths: {
				base
			}
			// `prerender = true` is declared in src/routes/+layout.js
		})
	]
});
