import { mkdirSync, writeFileSync } from 'node:fs';
import { applyCommand, applyRating, privateView, publicView, type MatchState } from '../engine/index.ts';
import type { EngineContent } from '../shared/content-schema.ts';
import { FixtureSchema, type Fixture, type FixtureFrame } from '../shared/fixture.ts';
import type { RoomSnapshot } from '../shared/protocol.ts';
import { loadContent } from './load-content.ts';
import { runMatch, type RunOptions } from './runner.ts';
import { HONEST, MIXED } from './strategies.ts';

const THINK_MS = 4_000;

function roomOf(s: MatchState): RoomSnapshot {
  return {
    code: 'NEWS2', status: 'finished', hostSeatId: 0, you: 0,
    seats: s.seats.map((seat) => ({
      seatId: seat.seatId, occupant: seat.personality ? 'ai' : 'human', displayName: seat.displayName,
      paperName: seat.paperName, color: seat.color, connected: true,
    })),
  };
}

function record(name: string, description: string, opts: Omit<RunOptions, 'onFrame' | 'thinkMs'>): Fixture {
  const frames: FixtureFrame[] = [];
  const end = runMatch({ ...opts, thinkMs: THINK_MS, onFrame: (s, atMs) => frames.push({ atMs, public: publicView(s), private: privateView(s, 0) }) });
  return FixtureSchema.parse({ name, description, room: roomOf(end), frames });
}

/** Seat 0 drops in round 2 and returns in round 3; its round-1 headline gets pulled by the AI. */
const caretakerHook = (s: MatchState, now: number): MatchState => {
  const seat = s.seats[0]!;
  if (s.phase === 'investigate' && s.round === 2 && seat.controller === 'human') return applyCommand(s, 0, { type: 'connection', connected: false }, now).state;
  if (s.phase === 'investigate' && s.round === 3 && seat.controller === 'caretaker') return applyCommand(s, 0, { type: 'connection', connected: true }, now).state;
  const mine = s.headlines.find((h) => h.seatId === 0 && h.round === 1 && !h.revealed && h.rating === null);
  if (mine) return applyRating(s, mine.id, { juiciness: 5, onTopic: true, inappropriate: true, bubbles: ['Who wrote this?', 'Yikes.'] });
  return s;
};

function findExposureSeed(content: EngineContent): number {
  for (let seed = 1; seed <= 5_000; seed++) {
    const end = runMatch({ seed, content, lineup: [MIXED, null, null, null] });
    const sources = new Set(end.exposures.map((e) => e.source));
    if (sources.has('player') && sources.has('town') && sources.has('final')) return seed;
  }
  throw new Error('no seed in 1..5000 has player, town and final exposures');
}

const { content, source } = await loadContent();
const fixtures = [
  record('solo-honest', 'Seat 0 plays honestly against three AI papers.', { seed: 1, content, lineup: [HONEST, null, null, null] }),
  record('exposures', 'Player, town and Final Edition exposures all happen.', { seed: findExposureSeed(content), content, lineup: [MIXED, null, null, null] }),
  record('caretaker-pulled', 'Seat 0 disconnects in round 2 (Caretaker), returns in round 3; its round-1 headline is pulled.',
    { seed: 2, content, lineup: [HONEST, null, null, null], hook: caretakerHook }),
];

const dir = new URL('./fixtures/', import.meta.url);
mkdirSync(dir, { recursive: true });
for (const f of fixtures) writeFileSync(new URL(`${f.name}.json`, dir), `${JSON.stringify(f)}\n`);
console.log(`wrote ${fixtures.length} fixtures using ${source} content`);
