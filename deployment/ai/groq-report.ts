import { z } from 'zod';
import { RatingSchema } from '../../src/shared/ai.ts';
import { CLAIMS, LOCATIONS, PERSONALITIES } from '../../src/shared/ids.ts';
import { GROQ_CASES, GROQ_FOLLOWUP_CASES } from './groq-cases.ts';

const id = z.enum([...GROQ_CASES, ...GROQ_FOLLOWUP_CASES].map((test) => test.id));
export const ValidationSchema = z.enum(['valid', 'invalid_envelope', 'invalid_json', 'invalid_rating', 'unknown']);
export const FinishSchema = z.enum(['stop', 'length', 'content_filter', 'tool_calls', 'unknown']);
const outcome = z.enum(['success', 'cache', 'disabled', 'failure', 'limited']);
const count = z.number().int().nonnegative();
const elapsed = z.number().finite().nonnegative();
const stats = z.object({ attempts: count, success: count, cache: count, disabled: count, failure: count, limited: count,
  successRate: z.number().min(0).max(1), underDeadline: count,
  latency: z.object({ p50: elapsed.nullable(), p95: elapsed.nullable(), max: elapsed.nullable() }).strict() }).strict();
export const GroqSummarySchema = z.object({
  version: z.literal(1), suite: z.literal('follow-up').optional(), model: z.literal('openai/gpt-oss-20b'), sourceRevision: z.string().regex(/^[a-f0-9]{40}$/),
  status: z.enum(['incomplete', 'failed', 'pending-review']), completed: count.max(24), cap: z.union([z.literal(24), z.literal(12)]),
  cases: z.array(z.object({ id, operation: z.enum(['rateHeadline', 'writeBotHeadline']), outcome,
    elapsedMs: elapsed, finish: FinishSchema, validation: ValidationSchema.optional(), filtered: z.boolean(), quality: z.boolean(),
    httpStatus: z.enum(['ok', 'auth', 'quota', 'error', 'unknown']),
    tokens: z.object({ input: count.nullable(), output: count.nullable() }).strict(),
  }).strict()).max(24),
  operations: z.object({ rateHeadline: stats, writeBotHeadline: stats }).strict(),
}).strict().superRefine((report, ctx) => {
  const cases = report.suite === 'follow-up' ? GROQ_FOLLOWUP_CASES : GROQ_CASES;
  if (report.cap !== cases.length || report.completed > cases.length || report.cases.length > cases.length ||
      report.cases.some((row) => !cases.some((test) => test.id === row.id && test.operation === row.operation)) ||
      (report.suite === 'follow-up' && report.cases.some((row) => row.validation === undefined))) {
    ctx.addIssue({ code: 'custom', message: 'Invalid evaluation suite' });
  }
});
export const GroqSamplesSchema = z.object({ version: z.literal(1), suite: z.literal('follow-up').optional(),
  cases: z.array(z.object({ id, operation: z.enum(['rateHeadline', 'writeBotHeadline']),
    source: z.enum(['provider', 'fallback', 'cache']), review: z.literal('pending'),
    input: z.object({ text: z.string().optional(), location: z.enum(LOCATIONS), claim: z.enum(CLAIMS),
      personality: z.enum(PERSONALITIES).optional(), exposedHeadlineText: z.string().optional() }).strict(),
    // Redaction may lengthen text; the actual rating was validated before sanitizing.
    output: z.union([RatingSchema.extend({ bubbles: z.array(z.string()).min(2).max(3) }), z.string()]),
  }).strict()).max(24),
}).strict().superRefine((report, ctx) => {
  const cases = report.suite === 'follow-up' ? GROQ_FOLLOWUP_CASES : GROQ_CASES;
  if (report.cases.length > cases.length ||
      report.cases.some((row) => !cases.some((test) => test.id === row.id && test.operation === row.operation))) {
    ctx.addIssue({ code: 'custom', message: 'Invalid evaluation suite' });
  }
});
export type GroqSummary = z.infer<typeof GroqSummarySchema>;
export type GroqSamples = z.infer<typeof GroqSamplesSchema>;

/** Only final synthetic text reaches samples; never stringify a provider envelope. */
export function redactSample(text: string, key: string): string {
  return text.split(key).join('[REDACTED]').replace(/(?:[a-z][a-z0-9+.-]*:\S+|www\.\S+)/gi, '[URL]');
}
