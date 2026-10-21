import { fsyncSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';
import { createAiRequestGate } from '../../src/server/ai-budget.ts';

vi.mock('node:fs', async (original) => {
  const fs = await original<typeof import('node:fs')>();
  return { ...fs, fsyncSync: vi.fn(fs.fsyncSync) };
});

it('disables further attempts if flushing a reserved request fails', () => {
  const dir = mkdtempSync(join(tmpdir(), 'news-town-ai-flush-'));
  const file = join(dir, 'requests'); writeFileSync(file, '');
  try {
    const acquire = createAiRequestGate({ requestAllowance: 3, maxConcurrent: 1, allowanceFile: file });
    vi.mocked(fsyncSync).mockImplementationOnce(() => { throw new Error('Disk unavailable'); });
    expect(() => acquire()).toThrow();
    // Even though two permits remain numerically, this process must stop trying after the failed flush.
    expect(() => acquire()).toThrow();
    expect(readFileSync(file, 'utf8')).toBe('1\n');
  } finally { vi.mocked(fsyncSync).mockReset(); rmSync(dir, { recursive: true, force: true }); }
});
