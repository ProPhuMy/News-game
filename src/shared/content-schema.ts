import { z } from 'zod';
import { CLAIMS, EVENT_CLAIMS, LOCATIONS, LOCATION_NAMES, PERSONALITIES } from './ids.ts';
import { TUNING } from './tuning.ts';

const text = (max: number) => z.string().min(1).max(max).refine((s) => s.trim() === s, 'no leading or trailing spaces');

const PLACEHOLDER = /\{([a-z]+)\}/g;
const LONGEST_LOCATION = Math.max(...Object.values(LOCATION_NAMES).map((n) => n.length));

/** Fill `{location}` and `{paper}` in a bot headline template. */
export function fillTemplate(template: string, values: { location: string; paper: string }): string {
  return template.replace(PLACEHOLDER, (whole: string, key: string) =>
    key === 'location' ? values.location : key === 'paper' ? values.paper : whole);
}

const botHeadline = text(TUNING.limits.headlineChars)
  .refine((t) => [...t.matchAll(PLACEHOLDER)].every((m) => m[1] === 'location' || m[1] === 'paper'),
    'only {location} and {paper} placeholders are allowed')
  .refine((t) => fillTemplate(t, { location: 'x'.repeat(LONGEST_LOCATION), paper: 'x'.repeat(TUNING.limits.paperNameChars) })
    .length <= TUNING.limits.headlineChars, 'too long once filled');

export const EventTemplateSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  location: z.enum(LOCATIONS),
  realClaim: z.enum(EVENT_CLAIMS),
  pReal: z.number().min(0.35).max(0.6),
  /** Must fit both outcomes: a tip alone never reveals the truth. */
  tipVariants: z.array(text(120)).min(2),
  evidenceReal: text(160),
  evidenceInnocent: text(160),
  explanationReal: text(200),
  explanationInnocent: text(200),
});
export type EventTemplate = z.infer<typeof EventTemplateSchema>;

export const SOUND_KEYS = ['paperSlap', 'gasp', 'murmur', 'poof'] as const;

export const ContentSchema = z.object({
  eventTemplates: z.array(EventTemplateSchema).min(10).superRefine((templates, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
    const ids = templates.map((t) => t.id);
    if (new Set(ids).size !== ids.length) issue('duplicate template id');
    const tips = templates.flatMap((t) => t.tipVariants);
    if (new Set(tips).size !== tips.length) issue('duplicate tip text');
    for (const l of LOCATIONS) if (!templates.some((t) => t.location === l)) issue(`no template at ${l}`);
    for (const c of EVENT_CLAIMS) if (!templates.some((t) => t.realClaim === c)) issue(`no template with claim ${c}`);
  }),
  /** Used for evidence and explanations at a location with no event that round. */
  quietDays: z.record(z.enum(LOCATIONS), z.object({ evidence: text(160), explanation: text(200) })),
  /** Fallback citizen speech per claim. */
  bubbles: z.record(z.enum(CLAIMS), z.array(text(TUNING.limits.bubbleChars)).min(3)),
  /** Fallback bot headlines per claim; may use {location} and {paper} (the exposed paper). */
  botHeadlines: z.record(z.enum(CLAIMS), z.array(botHeadline).min(2)),
  botPapers: z.record(z.enum(PERSONALITIES), text(TUNING.limits.paperNameChars)),
  ruleCards: z.array(z.object({ title: text(40), body: text(240) })).length(3),
  prompts: z.object({ rateHeadline: text(4_000), writeBotHeadline: text(4_000) }),
  /** Lowercase words and phrases for the lock-time filter. */
  wordList: z.array(z.string().regex(/^[a-z][a-z' -]*$/)).min(1),
  sounds: z.record(z.enum(SOUND_KEYS), z.string().regex(/^\/sounds\/[a-z0-9_-]+\.(ogg|mp3|wav)$/)),
});
export type GameContent = z.infer<typeof ContentSchema>;

/** The slice of content the engine reads. */
export type EngineContent = Pick<GameContent, 'eventTemplates' | 'quietDays' | 'bubbles' | 'botHeadlines' | 'botPapers'>;
