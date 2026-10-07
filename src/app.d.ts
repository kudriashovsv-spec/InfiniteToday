// Типы уровня приложения SvelteKit.
// https://svelte.dev/docs/kit/types#app.d.ts

declare global {
	namespace App {
		/**
		 * Shallow-состояние страницы. Галерея хранит здесь id открытого lightbox,
		 * поэтому Back закрывает просмотр, а не уходит из галереи (поведение v1.1).
		 */
		interface PageState {
			lightbox?: string;
		}
	}
}

export {};
