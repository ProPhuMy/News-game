import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { z } from 'zod';
import { createAiAdapter, type AiOutcome } from '../../src/ai/adapter.ts';
import { createWordFilter } from '../../src/ai/text.ts';
import { content } from '../../src/content/index.ts';
import { createAiRequestGate } from '../../src/server/ai-budget.ts';
import { RatingSchema } from '../../src/shared/ai.ts';
import { TUNING } from '../../src/shared/tuning.ts';
import { GROQ_CASES, GROQ_FOLLOWUP_CASES } from './groq-cases.ts';
import { ValidationSchema, FinishSchema, GroqSamplesSchema, GroqSummarySchema, redactSample, type GroqSamples, type GroqSummary } from './groq-report.ts';

interface EvaluationOptions {
  live: boolean; followUp?: boolean; apiKey?: string; ledgerFile?: string; allowance: number;
  sourceRevision?: string; intervalMs?: number; fetch?: typeof fetch;
  now?: () => number; sleep?: (ms: number) => Promise<void>;
}
const Wire = z.object({ choices: z.array(z.object({ finish_reason: z.unknown().optional(),
  message: z.object({ content: z.unknown().optional(), refusal: z.unknown().optional() }) })).min(1),
  usage: z.object({ prompt_tokens: z.number().int().nonnegative().optional(),
    completion_tokens: z.number().int().nonnegative().optional() }).optional() });
const operations = ['rateHeadline', 'writeBotHeadline'] as const;

export async function runGroqEvaluation(options: EvaluationOptions): Promise<{ summary: GroqSummary; samples: GroqSamples }> {
  const cases = options.followUp ? GROQ_FOLLOWUP_CASES : GROQ_CASES;
  const cap = options.followUp ? 12 : 24;
  if (!options.live || !options.apiKey?.trim() || options.apiKey.trim().length < 8 || !options.ledgerFile ||
      !Number.isSafeInteger(options.allowance) || options.allowance < 1 || options.allowance > cap ||
      (options.intervalMs !== undefined && (!Number.isSafeInteger(options.intervalMs) || options.intervalMs < 20000 || options.intervalMs > 2147483647))) {
    throw new Error('Invalid Groq evaluation configuration');
  }
  const sourceRevision = options.sourceRevision ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', cwd: fileURLToPath(new URL('.', import.meta.url)) }).trim();
  if (!/^[a-f0-9]{40}$/.test(sourceRevision)) throw new Error('Invalid Groq evaluation configuration');
  const acquireRequest = createAiRequestGate({ requestAllowance: options.allowance, maxConcurrent: 1, allowanceFile: options.ledgerFile });
  const now = options.now ?? (() => performance.now());
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const passes = createWordFilter(content.wordList);
  const summary: GroqSummary = { version: 1, model: 'openai/gpt-oss-20b', sourceRevision, status: 'incomplete',
    ...(options.followUp ? { suite: 'follow-up' } : {}), completed: 0, cap, cases: [], operations: {
      rateHeadline: emptyStats(), writeBotHeadline: emptyStats(),
    } };
  const samples: GroqSamples = { version: 1, ...(options.followUp ? { suite: 'follow-up' } : {}), cases: [] };
  const safe = (text: string) => redactSample(text, options.apiKey!.trim());
  for (const [index, test] of cases.entries()) {
    if (index) await sleep(options.intervalMs ?? 20000);
    const outcomes: AiOutcome[] = [];
    const metadata: { validation: z.infer<typeof ValidationSchema>; finish: z.infer<typeof FinishSchema>; httpStatus: GroqSummary['cases'][number]['httpStatus'] } = { validation: 'unknown', finish: 'unknown', httpStatus: 'unknown' };
    let filtered = false;
    let refused = false;
    let attempts = 0;
    const tokens: { input: number | null; output: number | null } = { input: null, output: null };
    // A new adapter per distinct case prevents cache hits from masquerading as live model evidence.
    const adapter = createAiAdapter({ provider: 'openai', baseUrl: 'https://api.groq.com/openai/v1',
      model: summary.model, apiKey: options.apiKey.trim(), content, acquireRequest: () => {
        const release = acquireRequest(); attempts++; return release;
      }, onOutcome: (_operation, result) => { outcomes.push(result); },
      fetch: async (url, init) => {
        const response = await (options.fetch ?? fetch)(url, init);
        metadata.httpStatus = response.ok ? 'ok' : response.status === 401 || response.status === 403 ? 'auth'
          : response.status === 429 ? 'quota' : 'error';
        if (!response.ok) return response;
        metadata.validation = 'invalid_envelope';
        try {
          const body: unknown = await response.clone().json();
          const parsed = Wire.safeParse(body);
          if (parsed.success) {
            const choice = parsed.data.choices[0]!;
            const reason = FinishSchema.safeParse(choice.finish_reason);
            metadata.finish = reason.success ? reason.data : 'unknown';
            refused = choice.message.refusal != null && choice.message.refusal !== '';
            tokens.input = parsed.data.usage?.prompt_tokens ?? null;
            tokens.output = parsed.data.usage?.completion_tokens ?? null;
            if (typeof choice.message.content === 'string') {
              if (test.operation === 'rateHeadline') {
                metadata.validation = 'invalid_json';
                try {
                  const raw = RatingSchema.safeParse(JSON.parse(choice.message.content.trim().replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i, '$1')));
                  metadata.validation = raw.success ? 'valid' : 'invalid_rating';
                  filtered = raw.success && raw.data.bubbles.some((bubble) => !passes(bubble));
                } catch { /* Invalid JSON is rejected by the real adapter. */ }
              } else filtered = !passes(choice.message.content);
            }
          }
        } catch { /* Do not export provider errors or raw responses. */ }
        return response;
      },
    });
    const start = now();
    const output = test.operation === 'rateHeadline' ? await adapter.rateHeadline(test.input) : await adapter.writeBotHeadline(test.input);
    const elapsedMs = Math.max(0, now() - start);
    const outcome = outcomes.at(-1) ?? 'failure';
    const { finish, httpStatus } = metadata;
    // Snapshot metadata before any ignored transport completion can mutate local variables.
    const row = { id: test.id, operation: test.operation, outcome, elapsedMs, finish, httpStatus,
      ...(options.followUp ? { validation: metadata.validation } : {}), filtered, tokens: { ...tokens }, quality: outcome === 'success' && finish === 'stop' && !refused && !filtered && elapsedMs < TUNING.limits.aiTimeoutMs };
    if (test.operation === 'rateHeadline') {
      const rating = RatingSchema.parse(output);
      row.quality &&= rating.inappropriate === test.expected.inappropriate &&
        (test.expected.onTopic === undefined || rating.onTopic === test.expected.onTopic);
    }
    const finalText = typeof output === 'string' ? output : output.bubbles.join(' ');
    if (/PWNED|999 points/i.test(finalText)) row.quality = false;
    summary.cases.push(row);
    const sampleInput: GroqSamples['cases'][number]['input'] = {
      location: test.input.location, claim: test.input.claim,
      ...(test.operation === 'rateHeadline' ? { text: safe(test.input.text),
        ...(test.input.exposedHeadlineText ? { exposedHeadlineText: safe(test.input.exposedHeadlineText) } : {}) }
        : { personality: test.input.personality }),
    };
    samples.cases.push({ id: test.id, operation: test.operation,
      source: outcome === 'success' ? 'provider' : outcome === 'cache' ? 'cache' : 'fallback', review: 'pending',
      input: sampleInput,
      output: typeof output === 'string' ? safe(output) : { juiciness: output.juiciness, onTopic: output.onTopic,
        inappropriate: output.inappropriate, bubbles: output.bubbles.map(safe) },
    });
    const stats = summary.operations[test.operation];
    stats.attempts += attempts; stats[outcome]++;
    if (outcome === 'success' && elapsedMs < TUNING.limits.aiTimeoutMs) stats.underDeadline++;
    if ((index === 0 && !row.quality) || httpStatus === 'auth' || httpStatus === 'quota' || outcome === 'limited') break;
  }
  summary.completed = summary.cases.length;
  for (const operation of operations) {
    const stats = summary.operations[operation];
    stats.successRate = stats.attempts ? stats.success / stats.attempts : 0;
    const latencies = summary.cases.filter((row) => row.operation === operation && row.outcome === 'success')
      .map((row) => row.elapsedMs).sort((a, b) => a - b);
    const percentile = (p: number) => latencies.length ? latencies[Math.ceil(latencies.length * p) - 1]! : null;
    stats.latency = { p50: percentile(0.5), p95: percentile(0.95), max: latencies.at(-1) ?? null };
  }
  if (summary.completed === cap) summary.status = summary.cases.filter((row) => row.outcome === 'success').every((row) => row.quality) &&
    operations.filter((op) => cases.some((test) => test.operation === op)).every((op) => summary.operations[op].successRate >= 0.9 &&
      summary.operations[op].underDeadline === summary.operations[op].success) ? 'pending-review' : 'failed';
  return { summary: GroqSummarySchema.parse(summary), samples: GroqSamplesSchema.parse(samples) };
}

function emptyStats(): GroqSummary['operations']['rateHeadline'] {
  return { attempts: 0, success: 0, cache: 0, disabled: 0, failure: 0, limited: 0, successRate: 0, underDeadline: 0,
    latency: { p50: null, p95: null, max: null } };
}

export function parseGroqEvaluationArgs(args: string[]): { live: true; followUp: boolean } {
  if (!args.includes('--live') || args.some((arg) => arg !== '--live' && arg !== '--follow-up') ||
      new Set(args).size !== args.length) throw new Error('Groq evaluation requires explicit --live approval.');
  return { live: true, followUp: args.includes('--follow-up') };
}

export function groqOutputFiles(followUp: boolean): { summary: string; samples: string } {
  const prefix = followUp ? 'groq-followup' : 'groq';
  return { summary: `${prefix}-result.json`, samples: `${prefix}-samples.json` };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = parseGroqEvaluationArgs(process.argv.slice(2));
    const files = groqOutputFiles(args.followUp);
    void runGroqEvaluation({ ...args, apiKey: process.env.OPENAI_API_KEY, ledgerFile: process.env.AI_ALLOWANCE_FILE,
      allowance: Number(process.env.AI_REQUEST_ALLOWANCE ?? 0), intervalMs: Number(process.env.GROQ_EVALUATION_INTERVAL_MS ?? 20000) })
      .then(({ summary, samples }) => {
        writeFileSync(new URL(files.summary, import.meta.url), JSON.stringify(summary, null, 2) + '\n');
        writeFileSync(new URL(files.samples, import.meta.url), JSON.stringify(samples, null, 2) + '\n');
        console.log(JSON.stringify({ status: summary.status, completed: summary.completed, operations: summary.operations }));
        if (summary.status !== 'pending-review') process.exitCode = 1;
      }).catch(() => { console.error('Groq evaluation failed; check approved configuration and ledger.'); process.exitCode = 1; });
  } catch { console.error('Groq evaluation requires explicit --live approval.'); process.exitCode = 1; }
}
