import { createWordFilter } from '../ai/text.ts';
import { createServer } from 'node:http';
import { isIP } from 'node:net';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Server } from 'socket.io';
import { ContentSchema, type GameContent } from '../shared/content-schema.ts';
import { createRoomManager } from './rooms.ts';
import { createMatchRunner } from './matches.ts';
import { registerSocketHandlers } from './socket.ts';
import { createStaticHandler } from './static.ts';
import type { AiOutcome } from '../ai/adapter.ts';
import { createAiRequestGate, parseAiLimits, type AiLimits } from './ai-budget.ts';
import { createAiAdapter } from '../ai/adapter.ts';
import type { ProviderOptions } from '../ai/providers.ts';

export async function createGameServer(options: { content: GameContent; distDirectory?: string; dev?: boolean; ai?: ProviderOptions; aiLimits?: AiLimits; trustRenderProxy?: boolean; trustedProxyAddress?: string }) {
  if (options.trustedProxyAddress !== undefined && !isIP(options.trustedProxyAddress)) throw new Error('Invalid TRUSTED_PROXY_ADDRESS');
  if (options.trustRenderProxy && options.trustedProxyAddress) throw new Error('Proxy trust modes must not be combined');
  const content = ContentSchema.parse(options.content);
  const acquireRequest = createAiRequestGate(options.aiLimits ?? parseAiLimits({}));
  const counts: Record<AiOutcome, number> = { success: 0, cache: 0, disabled: 0, failure: 0, limited: 0 };
  const ai = createAiAdapter({ ...(options.ai ?? { provider: 'none' }), content, acquireRequest,
    onOutcome(operation, outcome) {
      counts[outcome]++;
      if (options.ai?.provider && options.ai.provider !== 'none') {
        console.info(JSON.stringify({ event: 'ai_outcome', operation, outcome, counts }));
      }
    },
  });
  const http = createServer();
  const vite = options.dev ? await (await import('vite')).createServer({ server: { middlewareMode: true, hmr: { server: http } } }) : null;
  if (vite) http.on('request', vite.middlewares);
  else http.on('request', createStaticHandler(options.distDirectory ?? fileURLToPath(new URL('../../dist/client/', import.meta.url))));
  const io = new Server(http, { maxHttpBufferSize: 16_384 });
  const rooms = createRoomManager(createWordFilter(content.wordList));
  const runner = createMatchRunner(rooms, content, (socket, event, payload) => io.to(socket).emit(event, payload), ai,
    (socketId) => { queueMicrotask(() => io.sockets.sockets.get(socketId)?.disconnect(true)); });
  registerSocketHandlers(io, rooms, runner, options.trustRenderProxy, options.trustedProxyAddress);
  const timer = setInterval(() => {
    try { runner.tick(Date.now()); }
    catch { console.error('News Town scheduler failed.'); }
  }, 100);
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
  if (process.env.TRUST_RENDER_PROXY && !['true', 'false'].includes(process.env.TRUST_RENDER_PROXY)) throw new Error('Invalid TRUST_RENDER_PROXY');
  const game = await createGameServer({ content: ContentSchema.parse(module.content), dev: process.env.NODE_ENV !== 'production',
    trustRenderProxy: process.env.TRUST_RENDER_PROXY === 'true',
    ...(process.env.TRUSTED_PROXY_ADDRESS ? { trustedProxyAddress: process.env.TRUSTED_PROXY_ADDRESS } : {}),
    aiLimits: parseAiLimits(process.env),
    ai: { provider, ...(process.env.AI_BASE_URL ? { baseUrl: process.env.AI_BASE_URL } : {}), ...(process.env.AI_MODEL ? { model: process.env.AI_MODEL } : {}), ...(key ? { apiKey: key } : {}) } });
  try { await game.listen(port); }
  catch (error) {
    await game.close();
    throw error;
  }
  const shutdown = () => { void game.close().then(() => { process.exitCode = 0; }); };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error: unknown) => {
    const safeMessages = [
      'Validated src/content/index.ts is required', 'PORT must be between 1 and 65535',
      'Invalid AI request configuration', 'Invalid AI_BASE_URL',
      'Invalid AI_PROVIDER', 'Invalid TRUST_RENDER_PROXY', 'Invalid TRUSTED_PROXY_ADDRESS',
      'Proxy trust modes must not be combined', 'AI_MODEL and provider API key are required',
      'Content must provide safe headline and bubble fallbacks',
    ];
    const detail = error instanceof Error && safeMessages.includes(error.message) ? error.message
      : error && typeof error === 'object' && 'code' in error &&
        (error.code === 'EADDRINUSE' || error.code === 'EACCES') ? error.code
      : 'Check content and server configuration';
    console.error(`News Town startup failed: ${detail}.`);
    process.exitCode = 1;
  });
}
