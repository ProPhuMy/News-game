import { createServer } from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Server } from 'socket.io';
import { ContentSchema, type GameContent } from '../shared/content-schema.ts';
import { createRoomManager } from './rooms.ts';
import { createMatchRunner } from './matches.ts';
import { registerSocketHandlers } from './socket.ts';
import { createStaticHandler } from './static.ts';
import { createAiAdapter } from '../ai/adapter.ts';
import type { ProviderOptions } from '../ai/providers.ts';

export async function createGameServer(options: { content: GameContent; distDirectory?: string; dev?: boolean; ai?: ProviderOptions }) {
  const content = ContentSchema.parse(options.content);
  const ai = createAiAdapter({ ...(options.ai ?? { provider: 'none' }), content });
  const http = createServer();
  const vite = options.dev ? await (await import('vite')).createServer({ server: { middlewareMode: true, hmr: { server: http } } }) : null;
  if (vite) http.on('request', vite.middlewares);
  else http.on('request', createStaticHandler(options.distDirectory ?? fileURLToPath(new URL('../../dist/client/', import.meta.url))));
  const io = new Server(http, { maxHttpBufferSize: 16_384 });
  const rooms = createRoomManager();
  const runner = createMatchRunner(rooms, content, (socket, event, payload) => io.to(socket).emit(event, payload), ai);
  registerSocketHandlers(io, rooms, runner);
  const timer = setInterval(() => runner.tick(Date.now()), 100);
  return {
    http, rooms, runner,
    listen(port: number) {
      return new Promise<void>((resolve, reject) => {
        http.once('error', reject);
        http.listen(port, '0.0.0.0', () => { http.off('error', reject); resolve(); });
      });
    },
    async close() {
      clearInterval(timer);
      runner.dispose();
      await vite?.close();
      await new Promise<void>((resolve) => io.close(() => resolve()));
    },
  };
}

async function main() {
  const module: unknown = await import(new URL('../content/index.ts', import.meta.url).href);
  if (!module || typeof module !== 'object' || !('content' in module)) throw new Error('Validated src/content/index.ts is required');
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535');
  const provider = process.env.AI_PROVIDER ?? 'none';
  if (provider !== 'none' && provider !== 'openai' && provider !== 'anthropic') throw new Error('Invalid AI_PROVIDER');
  const key = provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY;
  const game = await createGameServer({ content: ContentSchema.parse(module.content), dev: process.env.NODE_ENV !== 'production',
    ai: { provider, ...(process.env.AI_MODEL ? { model: process.env.AI_MODEL } : {}), ...(key ? { apiKey: key } : {}) } });
  await game.listen(port);
  const shutdown = () => { void game.close().then(() => { process.exitCode = 0; }); };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch(() => { console.error('News Town startup failed. Check content and server configuration.'); process.exitCode = 1; });
}
