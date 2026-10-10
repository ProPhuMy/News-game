/** Every balance number in one place (spec §6). Starting values; tuned with `npm run sim`. */
export const TUNING = {
  seats: 4,
  citizens: 30,
  rounds: 5,
  eventsPerRound: 3,
  phaseMs: { intro: 20_000, investigate: 15_000, write: 45_000, reveal: 20_000, final: 40_000 },
  botLockDelayMs: { min: 3_000, max: 15_000 },
  trust: {
    start: 50, min: 0, max: 100,
    exposedBase: 10, exposedPerJuice: 2,
    exposeBonus: 8, evidenceBonus: 6, unevidencedTruthBonus: 2,
  },
  townExposure: { base: 0.05, perJuice: 0.05, perRoundSurvived: 0.1, finalMultiplier: 2, finalCap: 0.9 },
  investigation: { proofChance: 0.6, proofChanceTipMatch: 0.85 },
  baseHype: { danger: 4, health_scare: 4, scandal: 3, great_deal: 2, weird_sighting: 5, all_clear: 1, expose: 4 },
  allClearJuiceCap: 2,
  juiceMin: 1,
  juiceMax: 5,
  appeal: {
    relevanceFavorite: 10, relevanceOther: 3, juicePerPoint: 4, trustDivisor: 5, evidence: 8, loyalty: 6,
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
