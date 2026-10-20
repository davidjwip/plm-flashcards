// Minimal static server for the built app, used by Playwright.
// Deliberately dumb: no bundler, no shell, no npx. One process, one port, so a
// CI runner has nothing to resolve or race against.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const ROOT = new URL('../dist/', import.meta.url).pathname;
const PORT = Number(process.env.PORT ?? 4174);
const HOST = '127.0.0.1';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2',
};

if (!existsSync(join(ROOT, 'index.html'))) {
  console.error(`serve-dist: no build at ${ROOT} — run npm run build first`);
  process.exit(1);
}

const server = createServer((req, res) => {
  const path = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/');
  const safe = normalize(path).replace(/^(\.\.[/\\])+/, '');
  let file = join(ROOT, safe);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(ROOT, 'index.html');

  res.writeHead(200, {
    'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`serve-dist: http://${HOST}:${PORT}/`);
});
