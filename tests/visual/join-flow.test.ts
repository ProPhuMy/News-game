import { describe, expect, it } from 'vitest';
import { bannerOutcome, correctedJoinResult, JOIN_ERROR, LOBBY, type JoinPage } from '../../scripts/visual/join-flow.ts';

/** Stub page: each selector has a list of timed events that set its presence; waitFor polls virtually via real short timers. */
function stub(script: { at: number; selector: string; present: boolean }[], text = 'Name not allowed'): JoinPage {
  const present = new Map<string, boolean>([[JOIN_ERROR, true], [LOBBY, false]]);
  const start = Date.now();
  const sync = (): void => { for (const e of script) if (Date.now() - start >= e.at) present.set(e.selector, e.present); };
  return {
    async waitFor(selector, state, timeoutMs) {
      const deadline = Date.now() + timeoutMs;
      for (;;) {
        sync();
        if (present.get(selector) === (state === 'attached')) return;
        if (Date.now() > deadline) throw new Error('timeout');
        await new Promise((r) => setTimeout(r, 5));
      }
    },
    async count(selector) { sync(); return present.get(selector) ? 1 : 0; },
    async text() { return text; },
  };
}

describe('correctedJoinResult', () => {
  it('lobby wins while the old banner lingers', async () => {
    const page = stub([{ at: 30, selector: LOBBY, present: true }]);
    await expect(correctedJoinResult(page, 500)).resolves.toEqual({ lobby: true, error: null });
  });

  it('reports a fresh banner after the old one detaches', async () => {
    const page = stub([
      { at: 20, selector: JOIN_ERROR, present: false },
      { at: 60, selector: JOIN_ERROR, present: true },
    ], 'Still not allowed');
    await expect(correctedJoinResult(page, 500)).resolves.toEqual({ lobby: false, error: 'Still not allowed' });
  });

  it('fails clearly when nothing changes', async () => {
    await expect(correctedJoinResult(stub([]), 60)).rejects.toThrow(/old banner stayed and the lobby never appeared/);
  });
});

describe('bannerOutcome', () => {
  it('is only an error without an expectation', () => {
    expect(bannerOutcome('No server acknowledgment.', null)).toBe('error');
  });

  it('is rejected when the banner contains the expected text', () => {
    expect(bannerOutcome('That name is not allowed here', 'not allowed')).toBe('rejected');
  });

  it('fails when the banner does not match', () => {
    expect(() => bannerOutcome('No server acknowledgment.', 'not allowed'))
      .toThrow('join error did not match: expected "not allowed", got "No server acknowledgment."');
  });
});
