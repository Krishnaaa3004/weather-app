import type { IncomingMessage, ServerResponse } from 'node:http';
import react from '@vitejs/plugin-react';
import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * Serves the Netlify Function at /api/weather during `vite dev`, so local
 * development needs no Netlify CLI. In production Netlify runs the same file.
 */
function netlifyFunctionDev(): Plugin {
  return {
    name: 'netlify-function-dev',
    configureServer(server) {
      server.middlewares.use('/api/weather', async (req: IncomingMessage, res: ServerResponse) => {
        try {
          const mod = await server.ssrLoadModule('/netlify/functions/weather.ts');
          const handler = mod.default as (request: Request) => Promise<Response>;
          const response = await handler(new Request(`http://localhost/api/weather${req.url ?? ''}`));
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(await response.text());
        } catch (error) {
          server.ssrFixStacktrace(error as Error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'upstream', message: 'Function crashed in dev.' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Expose non-VITE_ variables (the API key) to the dev-only function runner.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));

  return {
    plugins: [react(), netlifyFunctionDev()],
    // Source maps ship on purpose: the code is public, and they make production errors readable.
    // three.js alone is ~540 kB minified; it is a lazy chunk, so the default 500 kB warning is noise.
    build: { target: 'es2022', sourcemap: true, chunkSizeWarningLimit: 700 },
    test: { environment: 'node' },
  };
});
