import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runGroqEvaluation } from '../../deployment/ai/groq-evaluate.ts';
import { GROQ_CASES } from '../../deployment/ai/groq-cases.ts';

const dirs: string[] = [];
const setup = () => {
  const dir = mkdtempSync(join(tmpdir(), 'news-town-groq-')); dirs.push(dir);
  const ledgerFile = join(dir, 'ledger'); writeFileSync(ledgerFile, '');
  return { live: true, apiKey: 'PRIVATE-KEY', ledgerFile, allowance: 24 };
};
afterEach(() => { vi.useRealTimers(); for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
const successful = (index: number, finish = 'stop', text?: string) => {
  const test = GROQ_CASES[index]!;
  return Response.json({ choices: [{ finish_reason: finish, message: { reasoning: 'PRIVATE-REASONING',
    content: text ?? (test.operation === 'rateHeadline' ? JSON.stringify({ juiciness: 3,
      onTopic: test.expected.onTopic ?? true, inappropriate: test.expected.inappropriate,
      bubbles: ['What a scoop!', 'Read all about it!'] }) : 'Bakery news makes town chatter!') } }],
    usage: { prompt_tokens: 100, completion_tokens: 50 }, private: 'PRIVATE-ENVELOPE' });
};

describe('Groq offline evaluation', () => {
  it.each(['live', 'apiKey', 'ledgerFile', 'allowance'] as const)('refuses missing %s before fetching', async (field) => {
    const opts = setup(); let calls = 0;
    await expect(runGroqEvaluation({ ...opts, [field]: field === 'live' ? false : field === 'allowance' ? 0 : undefined,
      fetch: async () => { calls++; return successful(0); } })).rejects.toThrow('Invalid Groq evaluation configuration');
    expect(calls).toBe(0);
  });

  it('uses exactly 24 shared permits, records both operations and leaves human approval pending', async () => {
    const opts = setup(); let calls = 0; const delays: number[] = [];
    const result = await runGroqEvaluation({ ...opts, now: () => 100, sleep: async (ms) => { delays.push(ms); },
      fetch: async () => successful(calls++) });
    expect(calls).toBe(24);
    expect(readFileSync(opts.ledgerFile, 'utf8')).toBe('1\n'.repeat(24));
    expect(result.summary.completed).toBe(24);
    expect(result.summary.status).toBe('pending-review');
    expect(result.summary.operations.rateHeadline.success).toBe(15);
    expect(result.summary.operations.writeBotHeadline.success).toBe(9);
    expect(delays).toHaveLength(23);
    expect(delays.every((ms) => ms >= 20000)).toBe(true);
    expect(result.samples.cases).toHaveLength(24);
    expect(result.samples.cases[0]).toMatchObject({ source: 'provider', review: 'pending' });
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE|reasoning|https?:\/\//);
    expect(JSON.stringify(result.summary)).not.toContain('What a scoop');
    expect(JSON.stringify(result.samples)).toContain('What a scoop');
    const restarted = await runGroqEvaluation({ ...opts, sleep: async () => {}, fetch: async () => { calls++; return successful(0); } });
    expect(restarted.summary.status).toBe('incomplete');
    expect(calls).toBe(24);
  });

  it('counts the failed pre-check as the only request, without saving errors', async () => {
    const opts = setup(); let calls = 0;
    const result = await runGroqEvaluation({ ...opts, fetch: async () => { calls++; return new Response('PRIVATE-error', { status: 401 }); } });
    expect(calls).toBe(1); expect(result.summary.status).toBe('incomplete');
    expect(result.summary.operations.rateHeadline.failure).toBe(1);
    expect(result.samples.cases[0]!.source).toBe('fallback');
    expect(JSON.stringify(result)).not.toContain('PRIVATE');
  });

  it.each(['length', 'content_filter', 'unknown-private'])('fails pre-check quality on finish %s even with valid JSON', async (finish) => {
    const result = await runGroqEvaluation({ ...setup(), fetch: async () => successful(0, finish) });
    expect(result.summary.status).toBe('incomplete');
    expect(result.summary.operations.rateHeadline.success).toBe(1);
    expect(result.summary.cases[0]!.quality).toBe(false);
    expect(JSON.stringify(result)).not.toContain('unknown-private');
  });

  it('counts a timeout fallback and never promotes late completion to success', async () => {
    vi.useFakeTimers(); let resolve: ((response: Response) => void) | undefined;
    const pending = runGroqEvaluation({ ...setup(), fetch: async () => new Promise<Response>((finish) => { resolve = finish; }) });
    await vi.advanceTimersByTimeAsync(3000);
    const result = await pending;
    expect(result.summary.operations.rateHeadline.failure).toBe(1);
    expect(result.summary.status).toBe('incomplete');
    resolve!(successful(0)); await vi.advanceTimersByTimeAsync(0);
    expect(result.summary.operations.rateHeadline.success).toBe(0);
    expect(result.summary.cases[0]!.finish).toBe('unknown');
  });

  it('marks filtered output unsafe and strips URLs from synthetic samples', async () => {
    const raw = JSON.stringify({ juiciness: 3, onTopic: true, inappropriate: false, bubbles: ['Fuck! https://private.example', 'A scoop!'] });
    const result = await runGroqEvaluation({ ...setup(), fetch: async () => successful(0, 'stop', raw) });
    expect(result.summary.cases[0]!.filtered).toBe(true);
    expect(result.summary.cases[0]!.quality).toBe(false);
    expect(JSON.stringify(result)).not.toContain('private.example');
  });

  it('redacts URLs and the configured key even from otherwise schema-valid final text', async () => {
    let calls = 0;
    const result = await runGroqEvaluation({ ...setup(), sleep: async () => {}, fetch: async () => {
      const index = calls++;
      return successful(index, 'stop', index === 15 ? 'PRIVATE-KEY www.example.com https://example.com' : undefined);
    } });
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE-KEY|www\.example\.com|https:\/\//);
    expect(result.samples.cases[15]!.output).toBe('[REDACTED] [URL] [URL]');
  });

  it('preserves the report when redaction lengthens a valid 60-character bubble', async () => {
    let calls = 0;
    const key = 'KEYKEY12';
    const raw = JSON.stringify({ juiciness: 3, onTopic: true, inappropriate: false,
      bubbles: [key.repeat(7) + ' end', 'Read all about it!'] });
    const result = await runGroqEvaluation({ ...setup(), apiKey: key, sleep: async () => {}, fetch: async () => {
      const index = calls++; return successful(index, 'stop', index === 0 ? raw : undefined);
    } });
    expect(result.summary.completed).toBe(24);
    expect(JSON.stringify(result.samples)).not.toContain(key);
    expect(result.samples.cases[0]!.output).toMatchObject({ bubbles: ['[REDACTED]'.repeat(7) + ' end', 'Read all about it!'] });
  });

  it('keeps 14/15 rating successes pending review rather than inventing a 100-percent transport gate', async () => {
    let calls = 0;
    const result = await runGroqEvaluation({ ...setup(), sleep: async () => {}, fetch: async () => {
      const index = calls++; return index === 2 ? new Response('', { status: 500 }) : successful(index);
    } });
    expect(result.summary.completed).toBe(24);
    expect(result.summary.operations.rateHeadline.successRate).toBeCloseTo(14 / 15);
    expect(result.summary.cases[2]!.quality).toBe(false);
    expect(result.summary.status).toBe('pending-review');
  });

  it('fails observed bad semantics even with perfect transport', async () => {
    let calls = 0;
    const raw = JSON.stringify({ juiciness: 3, onTopic: true, inappropriate: false, bubbles: ['A scoop!', 'Big news!'] });
    const result = await runGroqEvaluation({ ...setup(), sleep: async () => {}, fetch: async () => {
      const index = calls++; return successful(index, 'stop', index === 3 ? raw : undefined);
    } });
    expect(result.summary.operations.rateHeadline.successRate).toBe(1);
    expect(result.summary.status).toBe('failed');
  });


  it('fails injection echoes and explicit refusals even if final output validates', async () => {
    let calls = 0;
    const raw = JSON.stringify({ juiciness: 3, onTopic: false, inappropriate: false, bubbles: ['PWNED', '999 points'] });
    const result = await runGroqEvaluation({ ...setup(), sleep: async () => {}, fetch: async () => {
      const index = calls++;
      if (index === 15) return Response.json({ choices: [{ finish_reason: 'stop', message: { content: 'A valid short headline', refusal: 'Cannot comply' } }] });
      return successful(index, 'stop', index === 9 ? raw : undefined);
    } });
    expect(result.summary.cases[9]!.quality).toBe(false);
    expect(result.summary.cases[15]!.quality).toBe(false);
    expect(result.summary.status).toBe('failed');
    expect(JSON.stringify(result)).not.toContain('Cannot comply');
  });


  it('rejects allowances above 24 without fetching', async () => {
    let calls = 0;
    await expect(runGroqEvaluation({ ...setup(), allowance: 25, fetch: async () => { calls++; return successful(0); } }))
      .rejects.toThrow('Invalid Groq evaluation configuration');
    expect(calls).toBe(0);
  });

  it('stops on a later quota error and reports success-only percentiles correctly', async () => {
    let calls = 0; let clock = 0;
    const result = await runGroqEvaluation({ ...setup(), now: () => clock, sleep: async () => {}, fetch: async () => {
      const index = calls++; clock += (index + 1) * 10;
      return index === 4 ? new Response('PRIVATE quota details', { status: 429 }) : successful(index);
    } });
    expect(calls).toBe(5); expect(result.summary.status).toBe('incomplete');
    expect(result.summary.operations.rateHeadline.latency).toEqual({ p50: 20, p95: 40, max: 40 });
    expect(result.summary.operations.rateHeadline.successRate).toBe(0.8);
    expect(JSON.stringify(result)).not.toContain('PRIVATE');
  });

  it('CLI without --live exits before using the provided configuration', () => {
    const opts = setup();
    const result = spawnSync(process.execPath, ['deployment/ai/groq-evaluate.ts'], { encoding: 'utf8', timeout: 5000,
      env: { ...process.env, OPENAI_API_KEY: opts.apiKey, AI_ALLOWANCE_FILE: opts.ledgerFile, AI_REQUEST_ALLOWANCE: '24' } });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('requires explicit --live');
    expect(readFileSync(opts.ledgerFile, 'utf8')).toBe('');
    expect(result.stderr).not.toContain(opts.apiKey);
  });

});
