/** Every balance number in one place (spec §6). Tuned with `npm run sim` (see docs/contract-requests/2026-10-13-claude-tuning.md). */
export const TUNING = {
  seats: 4,
  citizens: 30,
  rounds: 5,
  eventsPerRound: 3,
  // Intro 60 s is a backstop; it ends early once every connected human is ready. Write 60 s (was 45). User-approved 2026-10-26.
  phaseMs: { intro: 60_000, investigate: 15_000, write: 60_000, reveal: 20_000, final: 40_000 },
  /** Round 1 only: time to read the first tip (user-approved 2026-10-26). Later rounds use phaseMs.investigate. */
  firstRoundInvestigateMs: 25_000,
  botLockDelayMs: { min: 3_000, max: 15_000 },
  trust: {
    start: 50, min: 0, max: 100,
    exposedBase: 3, exposedPerJuice: 1,
    exposeBonus: 8, evidenceBonus: 3, unevidencedTruthBonus: 2,
  },
  townExposure: { base: 0.02, perJuice: 0.02, perRoundSurvived: 0.02, finalMultiplier: 2, finalCap: 0.9 },
  investigation: { proofChance: 0.4, proofChanceTipMatch: 0.85 },
  baseHype: { danger: 4, health_scare: 4, scandal: 3, great_deal: 2, weird_sighting: 5, all_clear: 1, expose: 4 },
  allClearJuiceCap: 2,
  juiceMin: 1,
  juiceMax: 5,
  appeal: {
    relevanceFavorite: 10, relevanceOther: 3, juicePerPoint: 6, trustDivisor: 5, evidence: 2, loyalty: 6,
    repeatPenalty: 10, repeatMin: -20, stayNoHeadline: 6, subscribeMin: 15, reactMin: 12,
  },
  gullibility: { min: 0.1, max: 1 },
  scoreTrustDivisor: 50,
  bots: {
    tabloidInvestigate: 0.3, tabloidHighHype: 0.3, gazetteInvestigateRival: 0.5, gazetteLie: 0.1, wildcardExpose: 0.5,
    fallbackJuice: { tabloid: 4, gazette: 2 },
  },
  limits: {
    headlineChars: 100, displayNameChars: 20, paperNameChars: 24, bubbleChars: 60, maxBubbles: 6,
    roomCodeLength: 5, roomCodeAlphabet: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
    aiTimeoutMs: 3_000, createRoomPerMinute: 10, maxRooms: 200,
  },
  roomLifetimeMs: { emptyLobby: 300_000, noHumans: 120_000, finished: 900_000 },
} as const;
