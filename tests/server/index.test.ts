import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { describe, expect, it } from 'vitest';

const start = (port: string, environment: Record<string, string> = {}) => spawnSync(process.execPath, ['src/server/index.ts'], {
  encoding: 'utf8', timeout: 5000,
  env: { ...process.env, PORT: port, NODE_ENV: 'production', AI_PROVIDER: 'none', TRUST_RENDER_PROXY: 'false', ...environment },
});

describe('server startup', () => {
  it('explains invalid configuration without printing the supplied value', () => {
    const result = start('SECRET-invalid-port');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('PORT must be between 1 and 65535');
    expect(result.stderr).not.toContain('SECRET');
  });

  it.each([
    [{ AI_REQUEST_ALLOWANCE: 'SECRET-invalid-allowance' }, 'Invalid AI request configuration'],
    [{ AI_REQUEST_ALLOWANCE: '1', AI_ALLOWANCE_FILE: '/SECRET/missing-ledger' }, 'Invalid AI request configuration'],
    [{ AI_PROVIDER: 'SECRET-invalid-provider' }, 'Invalid AI_PROVIDER'],
    [{ TRUST_RENDER_PROXY: 'SECRET-invalid-proxy' }, 'Invalid TRUST_RENDER_PROXY'],
    [{ TRUSTED_PROXY_ADDRESS: 'SECRET-invalid-address' }, 'Invalid TRUSTED_PROXY_ADDRESS'],
    [{ TRUSTED_PROXY_ADDRESS: '127.0.0.1', TRUST_RENDER_PROXY: 'true' }, 'Proxy trust modes must not be combined'],
    [{ AI_PROVIDER: 'openai', AI_MODEL: '', OPENAI_API_KEY: 'SECRET-test-key' }, 'AI_MODEL and provider API key are required'],
    [{ AI_PROVIDER: 'anthropic', AI_MODEL: 'test-model', ANTHROPIC_API_KEY: '' }, 'AI_MODEL and provider API key are required'],
  ] as const)('fails closed for invalid startup configuration %j', (environment, expected) => {
    const result = start('3000', environment);
    expect(result.status).toBe(1);
    expect(result.error).toBeUndefined();
    expect(result.stderr).toContain(expected);
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
