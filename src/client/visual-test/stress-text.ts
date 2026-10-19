// Harness-only long-text check (--stress-text). Works on a copy; fixture files and live state never change.
import type { Fixture } from '../../shared/fixture.ts';
import { TUNING } from '../../shared/tuning.ts';

const { displayNameChars, paperNameChars, headlineChars, bubbleChars } = TUNING.limits;

/** Exactly `length` characters: spaced words when `spaced`, else one unbroken run of wide letters. */
export function stressText(label: string, length: number, spaced: boolean): string {
  if (!spaced) return `${label.replace(/\s/g, '')}${'W'.repeat(length)}`.slice(0, length);
  return `${label} ${'Wonderfully wide words '.repeat(Math.ceil(length / 10))}`.slice(0, length).trimEnd().padEnd(length, 'x');
}

/** A deep copy of the fixture with every name, headline and bubble at its schema maximum. Ids and numbers stay. */
export function stressFixture(fixture: Fixture): Fixture {
  const copy = structuredClone(fixture);
  const displayName = (seatId: number) => stressText(`Editor${seatId}`, displayNameChars, seatId % 2 === 0);
  const paperName = (seatId: number) => stressText(`Paper${seatId}`, paperNameChars, seatId % 2 === 0);
  const headline = (id: string, round: number, seatId: number) => stressText(id, headlineChars, (round + seatId) % 2 === 0);

  for (const seat of copy.room.seats) {
    if (seat.displayName !== null) seat.displayName = displayName(seat.seatId);
    if (seat.paperName !== null) seat.paperName = paperName(seat.seatId);
  }
  for (const frame of copy.frames) {
    const rounds = new Map<string, [number, number]>();
    for (const paper of frame.public.papers) {
      paper.displayName = displayName(paper.seatId);
      paper.paperName = paperName(paper.seatId);
    }
    for (const h of frame.public.headlines) {
      rounds.set(h.id, [h.round, h.seatId]);
      h.text = headline(h.id, h.round, h.seatId);
    }
    const locked = frame.private.lockedHeadline;
    if (locked) {
      const [round, seatId] = rounds.get(locked.id) ?? [frame.public.round, frame.private.seatId];
      locked.text = headline(locked.id, round, seatId);
    }
    for (const citizen of frame.public.reactionPlan?.citizens ?? []) {
      if (citizen.bubble !== null) citizen.bubble = stressText(`Citizen${citizen.citizenId}`, bubbleChars, citizen.citizenId % 2 === 0);
    }
  }
  return copy;
}
