import type { PageWatch } from '../scripts/visual/evidence.ts';

export interface SmokeOptions {
  origin: string;
  remote: boolean;
  out: string | null;
}

export function parseSmokeOptions(args: readonly string[]): SmokeOptions {
  let rawTarget: string | undefined;
  let remote = false;
  let out: string | null = null;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]!;
    if (arg === '--remote' && !remote) remote = true;
    else if (arg === '--out' && out === null) {
      const value = args[++index];
      if (!value || value.startsWith('--') || !value.endsWith('.json') || value.includes('\0')) {
        throw new Error('--out requires a JSON file path');
      }
      out = value;
    } else if (!arg.startsWith('-') && rawTarget === undefined) rawTarget = arg;
    else throw new Error('Unexpected smoke argument');
  }
  if (remote && rawTarget === undefined) throw new Error('Explicit remote target required');
  let target: URL;
  try { target = new URL(rawTarget ?? 'http://127.0.0.1:3000'); }
  catch { throw new Error('Invalid target URL'); }
  if (target.pathname !== '/' || target.search || target.hash || target.username || target.password) {
    throw new Error('Root URL without credentials, query or fragment required');
  }
  if (remote) {
    if (target.protocol !== 'https:') throw new Error('HTTPS target required');
  } else if (target.protocol !== 'http:' || !['127.0.0.1', '[::1]'].includes(target.hostname)) {
    throw new Error('Local HTTP target required');
  }
  return { origin: target.origin, remote, out };
}

export function fetchSmokeResource(url: string): Promise<Response> {
  return fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30_000) });
}

export function requireCleanWatch(watch: PageWatch): PageWatch {
  return {
    async snapshot() {
      const evidence = await watch.snapshot();
      if (evidence.consoleErrors.length > 0) throw new Error('Browser errors occurred');
      return evidence;
    },
  };
}
