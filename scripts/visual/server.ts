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

export interface GameServer {
  stop(): void;
  logTail(): string;
  /** Resolves with the exit code (null when killed by a signal) once the server process ends. */
  exited: Promise<number | null>;
}

/** Starts the game server (default src/server/index.ts) in its own process group so stop() also ends Vite's children. */
export function startGameServer(options: { port: number; prod: boolean; entry?: string }): GameServer {
  const log: string[] = [];
  const child = spawn(process.execPath, [options.entry ?? 'src/server/index.ts'], {
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
  const exited = new Promise<number | null>((resolve) => child.once('exit', (code) => resolve(code)));
  return {
    exited,
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

/** Waits for the server to answer, failing at once (with its log) if the process exits first. */
export async function waitForServer(server: GameServer, url: string, timeoutMs: number): Promise<void> {
  const died = server.exited.then((code) => {
    throw new Error(`server exited with code ${code} before answering ${url}\n--- server log ---\n${server.logTail()}`);
  });
  try {
    await Promise.race([waitForHttp(url, timeoutMs), died]);
  } catch (error) {
    if ((error as Error).message.startsWith('server exited')) throw error;
    throw new Error(`${(error as Error).message}\n--- server log ---\n${server.logTail()}`, { cause: error });
  } finally {
    died.catch(() => {});
  }
}
