import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

export function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

export async function waitForHttp(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // not listening yet
    }
    await delay(100);
  }
  throw new Error(`${url} did not answer within ${timeoutMs} ms`);
}

/** Starts src/server/index.ts in its own process group so stop() also ends Vite's children. */
export function startGameServer(options: { port: number; prod: boolean }): { stop(): void; logTail(): string } {
  const log: string[] = [];
  const child = spawn(process.execPath, ['src/server/index.ts'], {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(options.port), AI_PROVIDER: 'none', NODE_ENV: options.prod ? 'production' : 'development' },
  });
  const keep = (chunk: Buffer) => {
    log.push(chunk.toString());
    if (log.length > 200) log.shift();
  };
  child.stdout.on('data', keep);
  child.stderr.on('data', keep);
  let stopped = false;
  return {
    stop() {
      if (stopped || child.pid === undefined) return;
      stopped = true;
      try {
        process.kill(-child.pid, 'SIGTERM');
      } catch {
        // already exited
      }
    },
    logTail: () => log.join('').split('\n').slice(-20).join('\n'),
  };
}
