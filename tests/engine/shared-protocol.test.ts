import { describe, expect, it } from 'vitest';
import { AckSchema, ClientMessageSchema, DisplayNameSchema, HeadlineTextSchema, RoomCodeSchema, cleanText } from '../../src/shared/protocol.ts';

describe('protocol', () => {
  it('cleans text: control chars, repeated whitespace, edges', () => {
    expect(cleanText('  Big\u0007  news\n\ttoday  ')).toBe('Big news today');
  });

  it('rejects headlines that are blank after cleanup or too long', () => {
    expect(HeadlineTextSchema.safeParse('   \u0007  ').success).toBe(false);
    expect(HeadlineTextSchema.safeParse('x'.repeat(101)).success).toBe(false);
    expect(HeadlineTextSchema.parse(`  ${'x'.repeat(100)}  `)).toHaveLength(100);
  });

  it('accepts lowercase room codes and rejects ambiguous characters', () => {
    expect(RoomCodeSchema.parse(' abcde ')).toBe('ABCDE');
    expect(RoomCodeSchema.safeParse('ABC0E').success).toBe(false);
    expect(RoomCodeSchema.safeParse('ABCDEF').success).toBe(false);
  });

  it('parses a lock with a cleaned headline', () => {
    const msg = ClientMessageSchema.parse({
      type: 'lockHeadline', actionId: 'a1', round: 2, phase: 'write',
      story: { kind: 'claim', location: 'bank', claim: 'scandal', attachEvidence: false },
      text: '  Bank   boss  ',
    });
    expect(msg.type === 'lockHeadline' && msg.text).toBe('Bank boss');
  });

  it('rejects unknown types, missing action ids and bad stories', () => {
    expect(ClientMessageSchema.safeParse({ type: 'hack', actionId: 'a' }).success).toBe(false);
    expect(ClientMessageSchema.safeParse({ type: 'startMatch' }).success).toBe(false);
    expect(ClientMessageSchema.safeParse({
      type: 'lockHeadline', actionId: 'a', round: 1, phase: 'write',
      story: { kind: 'claim', location: 'bank', claim: 'expose', attachEvidence: false }, text: 'x',
    }).success).toBe(false);
  });

  it('strips invisible format characters so blank-looking text is rejected', () => {
    expect(HeadlineTextSchema.safeParse('\u200b\u2060\u200b').success).toBe(false);
    expect(DisplayNameSchema.safeParse('\u202e\u200b').success).toBe(false);
    expect(HeadlineTextSchema.parse('Bank\u202e boss')).toBe('Bank boss');
  });

  it('acks carry server time and, on COLOR_TAKEN, the taken colors', () => {
    expect(AckSchema.safeParse({ actionId: 'a', ok: true }).success).toBe(false);
    expect(AckSchema.parse({ actionId: 'a', ok: false, error: 'COLOR_TAKEN', serverNowMs: 5, takenColors: ['red'] }).takenColors).toEqual(['red']);
  });
});
