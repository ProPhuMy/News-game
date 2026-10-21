import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GROQ_FOLLOWUP_CASES } from '../../deployment/ai/groq-cases.ts';
import { groqOutputFiles, parseGroqEvaluationArgs, runGroqEvaluation } from '../../deployment/ai/groq-evaluate.ts';
import { GroqSamplesSchema, GroqSummarySchema } from '../../deployment/ai/groq-report.ts';

const dirs: string[] = [];
const setup = () => {
  const dir = mkdtempSync(join(tmpdir(), 'news-town-groq-followup-')); dirs.push(dir);
  const ledgerFile = join(dir, 'ledger'); writeFileSync(ledgerFile, '');
  return { live: true, followUp: true, apiKey: 'PRIVATE-KEY', ledgerFile, allowance: 12, sleep: async () => {} };
};
afterEach(() => { vi.useRealTimers(); for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
const good = (index: number) => Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({
  juiciness: 3, onTopic: GROQ_FOLLOWUP_CASES[index]!.expected.onTopic ?? true,
  inappropriate: GROQ_FOLLOWUP_CASES[index]!.expected.inappropriate, bubbles: ['Read all about it!', 'A big scoop!'],
}) } }], usage: { prompt_tokens: 100, completion_tokens: 50 } });

describe('Groq fixed follow-up suite', () => {
  it('requires live opt-in and selects separate output paths', () => {
    expect(parseGroqEvaluationArgs(['--live', '--follow-up'])).toEqual({ live: true, followUp: true });
    expect(parseGroqEvaluationArgs(['--live'])).toEqual({ live: true, followUp: false });
    for (const args of [[], ['--follow-up'], ['--live', '--live'], ['--live', 'unknown']]) {
      expect(() => parseGroqEvaluationArgs(args)).toThrow();
    }
    expect(groqOutputFiles(true)).toEqual({ summary: 'groq-followup-result.json', samples: 'groq-followup-samples.json' });
    expect(groqOutputFiles(false)).toEqual({ summary: 'groq-result.json', samples: 'groq-samples.json' });
  });

  it('uses exactly12 rating permits and preserves the legacy pilot schema', async () => {
    const opts = setup(); let calls = 0;
    const result = await runGroqEvaluation({ ...opts, fetch: async () => good(calls++) });
    expect(calls).toBe(12); expect(readFileSync(opts.ledgerFile, 'utf8')).toBe('1\n'.repeat(12));
    expect(result.summary).toMatchObject({ version: 1, suite: 'follow-up', cap: 12, completed: 12, status: 'pending-review' });
    expect(result.summary.operations.rateHeadline.success).toBe(12);
    expect(result.summary.operations.writeBotHeadline.attempts).toBe(0);
    expect(result.summary.cases.every((row) => row.validation === 'valid')).toBe(true);
    expect(result.samples.cases).toHaveLength(12);
    expect(GroqSamplesSchema.parse(result.samples).suite).toBe('follow-up');
    const original: unknown = JSON.parse(readFileSync('deployment/ai/groq-result.json', 'utf8'));
    expect(GroqSummarySchema.parse(original)).toMatchObject({ cap: 24, status: 'failed', completed: 24 });
    const exhausted = await runGroqEvaluation({ ...opts, fetch: async () => { calls++; return good(0); } });
    expect(exhausted.summary.status).toBe('incomplete'); expect(calls).toBe(12);
    expect(() => GroqSummarySchema.parse({ ...result.summary, cap: 24 })).toThrow();
    expect(() => GroqSamplesSchema.parse({ ...result.samples, extra: 'PRIVATE' })).toThrow();
  });

  it('rejects allowance13 before any request', async () => {
    let calls = 0;
    await expect(runGroqEvaluation({ ...setup(), allowance: 13, fetch: async () => { calls++; return good(0); } })).rejects.toThrow();
    expect(calls).toBe(0);
  });

  it.each([
    ['invalid_envelope', { choices: [] }],
    ['invalid_json', { choices: [{ finish_reason: 'stop', message: { content: 'PRIVATE invalid JSON' } }] }],
    ['invalid_rating', { choices: [{ finish_reason: 'stop', message: { content: '{"juiciness":99,"PRIVATE":"SECRET"}' } }] }],
  ])('counts a failed pre-check once with fixed category %s', async (expected, body) => {
    let calls = 0;
    const result = await runGroqEvaluation({ ...setup(), fetch: async () => { calls++; return Response.json(body); } });
    expect(calls).toBe(1); expect(result.summary.status).toBe('incomplete');
    expect(result.summary.cases[0]!.validation).toBe(expected);
    expect(result.samples.cases[0]!.source).toBe('fallback');
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE|SECRET/);
  });

  it('records unknown validation on timeout and ignores late metadata', async () => {
    vi.useFakeTimers(); let finish: ((response: Response) => void) | undefined;
    const pending = runGroqEvaluation({ ...setup(), fetch: async () => new Promise<Response>((resolve) => { finish = resolve; }) });
    await vi.advanceTimersByTimeAsync(3000);
    const result = await pending;
    expect(result.summary.cases[0]!.validation).toBe('unknown');
    finish!(good(0)); await vi.advanceTimersByTimeAsync(0);
    expect(result.summary.cases[0]!.validation).toBe('unknown');
    expect(result.summary.operations.rateHeadline.success).toBe(0);
  });

  it.each([1, 2])('allows at most one failure in12 requests; observed %i remain unassessed', async (failures) => {
    let calls = 0;
    const result = await runGroqEvaluation({ ...setup(), fetch: async () => {
      const index = calls++; return index >= 6 && index < 6 + failures ? new Response('', { status: 500 }) : good(index);
    } });
    expect(calls).toBe(12);
    expect(result.summary.operations.rateHeadline.failure).toBe(failures);
    expect(result.summary.cases[6]!.quality).toBe(false);
    expect(result.samples.cases[6]!.source).toBe('fallback');
    expect(result.summary.status).toBe(failures === 1 ? 'pending-review' : 'failed');
  });
});
