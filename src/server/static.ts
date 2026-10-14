import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { RoomCodeSchema } from '../shared/protocol.ts';

const MIME: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2',
};

export function createStaticHandler(directory: string) {
  return async (request: IncomingMessage, response: ServerResponse) => {
    const missing = () => { response.writeHead(404); response.end('Not found'); };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return;
    }
    try {
      const path = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
      const roomLink = path.startsWith('/r/') && RoomCodeSchema.safeParse(path.slice(3)).success;
      const file = path === '/' || roomLink ? 'index.html' : path.slice(1);
      if (file.includes('\\') || file.split('/').some((part) => part.startsWith('.'))) { missing(); return; }
      const type = MIME[extname(file)];
      if (!type) { missing(); return; }
      const root = await realpath(directory);
      const resolved = await realpath(resolve(root, file));
      if (!resolved.startsWith(root + sep)) { missing(); return; }
      const data = await readFile(resolved);
      response.writeHead(200, { 'Content-Type': type, 'Content-Length': data.length, 'X-Content-Type-Options': 'nosniff' });
      response.end(request.method === 'HEAD' ? undefined : data);
    } catch { missing(); }
  };
}
