// Minimal static server for local preview. Usage: node scripts/dev-server.mjs [port]
import { createServer } from 'node:http';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { resolve, join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2] || 8080);
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp',
};

createServer(async (req, res) => {
  try {
    // dev-only: POST /__save?name=foo.png with a PNG body -> assets/foo.png (used by scripts/ogp.html)
    if (req.method === 'POST' && req.url.startsWith('/__save')) {
      const name = new URL(req.url, 'http://x').searchParams.get('name') || '';
      if (!/^[a-z0-9._-]+\.png$/i.test(name)) { res.writeHead(400); return res.end('bad name'); }
      const chunks = [];
      for await (const ch of req) chunks.push(ch);
      await writeFile(join(root, 'assets', name), Buffer.concat(chunks));
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end('saved assets/' + name);
    }
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = join(root, p);
    if (!file.startsWith(root)) throw new Error('forbidden');
    const s = await stat(file);
    if (s.isDirectory()) { res.writeHead(302, { Location: p + '/' }); return res.end(); }
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404); res.end('not found');
  }
}).listen(port, () => console.log(`http://localhost:${port}/`));
