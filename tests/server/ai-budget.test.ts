import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createAiRequestGate, parseAiLimits } from '../../src/server/ai-budget.ts';

const paths: string[] = [];
const ledger = () => {
  const dir = mkdtempSync(join(tmpdir(), 'news-town-ai-')); paths.push(dir);
  const file = join(dir, 'requests'); writeFileSync(file, '', { mode: 0o600 }); return file;
};
afterEach(() => { for (const path of paths.splice(0)) rmSync(path, { recursive: true, force: true }); });

describe('AI request allowance', () => {
  it('defaults to no outbound requests', () => {
    const limits = parseAiLimits({});
    expect(limits.requestAllowance).toBe(0);
    expect(() => createAiRequestGate(limits)()).toThrow();
  });

  it.each(['-1', '1.5', '', 'NaN', 'Infinity', '9007199254740992'])('rejects invalid allowance %s', (value) => {
    expect(() => parseAiLimits({ AI_REQUEST_ALLOWANCE: value })).toThrow('Invalid AI request configuration');
  });

  it.each(['0', '-1', '1.5'])('rejects invalid concurrency %s', (value) => {
    expect(() => parseAiLimits({ AI_MAX_CONCURRENT: value })).toThrow('Invalid AI request configuration');
  });

  it('requires an absolute existing valid ledger when positive', () => {
    expect(() => parseAiLimits({ AI_REQUEST_ALLOWANCE: '1' })).toThrow();
    expect(() => parseAiLimits({ AI_REQUEST_ALLOWANCE: '1', AI_ALLOWANCE_FILE: 'relative' })).toThrow();
    const file = ledger(); rmSync(file);
    expect(() => createAiRequestGate({ requestAllowance: 1, maxConcurrent: 1, allowanceFile: file })).toThrow();
    writeFileSync(file, '1\nbroken');
    expect(() => createAiRequestGate({ requestAllowance: 1, maxConcurrent: 1, allowanceFile: file })).toThrow();
  });

  it('counts reservations durably across restarts without refunds', () => {
    const file = ledger();
    const limits = { requestAllowance: 2, maxConcurrent: 1, allowanceFile: file };
    const acquire = createAiRequestGate(limits);
    acquire()();
    expect(readFileSync(file, 'utf8')).toBe('1\n');
    const restarted = createAiRequestGate(limits);
    restarted()();
    expect(() => restarted()).toThrow();
    expect(readFileSync(file, 'utf8')).toBe('1\n1\n');
  });

  it('rejects concurrency overflow without consuming allowance and releases once', () => {
    const file = ledger();
    const acquire = createAiRequestGate({ requestAllowance: 3, maxConcurrent: 1, allowanceFile: file });
    const release = acquire();
    expect(() => acquire()).toThrow();
    expect(readFileSync(file, 'utf8')).toBe('1\n');
    release(); release();
    const next = acquire();
    expect(() => acquire()).toThrow();
    next();
  });

  it('fails closed without recreating a removed ledger', () => {
    const file = ledger();
    const acquire = createAiRequestGate({ requestAllowance: 2, maxConcurrent: 1, allowanceFile: file });
    rmSync(file);
    expect(() => acquire()).toThrow();
    expect(() => readFileSync(file)).toThrow();
  });
});
