import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ContentSchema, fillTemplate } from '../../src/shared/content-schema.ts';
import { SAMPLE_CONTENT } from '../../src/sim/sample-content.ts';
import { createWordFilter } from '../../src/ai/text.ts';
import { NAME_FILTER_EXAMPLES, WORD_LIST } from '../../src/content/word-filter.ts';
import { DisplayNameSchema, PaperNameSchema, cleanText } from '../../src/shared/protocol.ts';

const real = import.meta.glob<{ content?: unknown }>('../../src/content/index.ts', { eager: true });
const hasReal = Object.keys(real).length > 0;

const errorsOf = (value: unknown): string => {
  const r = ContentSchema.safeParse(value);
  return r.success ? '' : z.prettifyError(r.error);
};
const sample = () => structuredClone(SAMPLE_CONTENT);

describe('content schema', () => {
  it('accepts the sample content', () => {
    expect(errorsOf(SAMPLE_CONTENT)).toBe('');
  });

  it.skipIf(!hasReal)('accepts src/content/index.ts (export const content)', () => {
    expect(errorsOf(Object.values(real)[0]?.content)).toBe('');
  });

  it('needs at least 10 templates', () => {
    const c = sample();
    c.eventTemplates = c.eventTemplates.slice(0, 9);
    expect(errorsOf(c)).not.toBe('');
  });

  it('needs every location and every event claim covered', () => {
    const c = sample();
    c.eventTemplates = c.eventTemplates.map((t) => (t.location === 'clinic' ? { ...t, location: 'bank' } : t));
    expect(errorsOf(c)).toMatch(/clinic/);
    const d = sample();
    d.eventTemplates = d.eventTemplates.map((t) => (t.realClaim === 'great_deal' ? { ...t, realClaim: 'scandal' } : t));
    expect(errorsOf(d)).toMatch(/great_deal/);
  });

  it('rejects duplicate tip text, out-of-range pReal and oversized bubbles', () => {
    const c = sample();
    c.eventTemplates[1]!.tipVariants[0] = c.eventTemplates[0]!.tipVariants[0]!;
    expect(errorsOf(c)).toMatch(/duplicate tip/);
    const d = sample();
    d.eventTemplates[0]!.pReal = 0.7;
    expect(errorsOf(d)).not.toBe('');
    const e = sample();
    e.bubbles.danger[0] = 'x'.repeat(61);
    expect(errorsOf(e)).not.toBe('');
  });

  it('rejects bot headlines that overflow once filled or use unknown placeholders', () => {
    const c = sample();
    c.botHeadlines.expose[0] = `${'x'.repeat(80)} {paper}`;
    expect(errorsOf(c)).toMatch(/too long once filled/);
    const d = sample();
    d.botHeadlines.scandal[0] = '{mayor} did it';
    expect(errorsOf(d)).toMatch(/placeholders/);
  });

  it('fills both placeholders', () => {
    expect(fillTemplate('{paper} lies about the {location}', { paper: 'The Daily Gasp', location: 'Bank' }))
      .toBe('The Daily Gasp lies about the Bank');
  });
});

describe('name filter policy', () => {
  const filter = createWordFilter(WORD_LIST);
  // Rule: every example must parse under both DisplayNameSchema (max 20) and PaperNameSchema (max 24).
  const schemaOk = (name: string) => DisplayNameSchema.safeParse(name).success && PaperNameSchema.safeParse(name).success;

  it('accepted examples pass both name schemas, the filter, and stay unchanged', () => {
    for (const name of NAME_FILTER_EXAMPLES.accepted) {
      expect(schemaOk(name), name).toBe(true);
      expect(cleanText(name), name).toBe(name);
      expect(filter(name), name).toBe(true);
    }
  });

  it('rejected examples pass both name schemas and stay unchanged, but fail the filter', () => {
    for (const name of NAME_FILTER_EXAMPLES.rejected) {
      expect(schemaOk(name), name).toBe(true);
      expect(cleanText(name), name).toBe(name);
      expect(filter(name), name).toBe(false);
    }
  });
});
