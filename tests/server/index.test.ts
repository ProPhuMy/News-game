import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { describe, expect, it } from 'vitest';

const start = (port: string) => spawnSync(process.execPath, ['src/server/index.ts'], {
  encoding: 'utf8', timeout: 5000,
  env: { ...process.env, PORT: port, NODE_ENV: 'production', AI_PROVIDER: 'none' },
});

describe('server startup', () => {
  it('explains invalid configuration without printing the supplied value', () => {
    const result = start('SECRET-invalid-port');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('PORT must be between 1 and 65535');
    expect(result.stderr).not.toContain('SECRET');
  });

  it('reports port conflicts and cleans up the scheduler so startup exits', async () => {
    const http = createServer();
    http.listen(0, '0.0.0.0');
    await once(http, 'listening');
    try {
      const address = http.address();
      if (!address || typeof address === 'string') throw new Error('missing test port');
      const result = start(String(address.port));
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('EADDRINUSE');
      expect(result.error).toBeUndefined();
    } finally { await new Promise<void>((resolve) => http.close(() => resolve())); }
  });
});
