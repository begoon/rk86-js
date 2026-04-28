import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// Dev server: rewrite directory-style URLs under static/ subdirs (e.g. /asm/)
// to their index.html. Production (static adapter) lets the serving webserver
// handle this natively, but Vite/SvelteKit dev doesn't.
const staticIndexFallback = {
	name: 'static-index-fallback',
	configureServer(server: { middlewares: { use: (fn: any) => void } }) {
		server.middlewares.use((req: any, _res: any, next: any) => {
			if (req.url === '/asm' || req.url === '/asm/') req.url = '/asm/index.html';
			if (req.url === '/c8080' || req.url === '/c8080/') req.url = '/c8080/index.html';
			if (req.url === '/plm80' || req.url === '/plm80/') req.url = '/plm80/index.html';
			if (req.url === '/tape' || req.url === '/tape/') req.url = '/tape/index.html';
			next();
		});
	},
};

export default defineConfig({
	plugins: [staticIndexFallback, tailwindcss(), sveltekit()]
});
