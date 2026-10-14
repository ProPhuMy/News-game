# Contract request: balance tuning (Claude, 2026-10-13)

Status: approved by the user on 2026-10-13, applied on `claude/engine`.

## What

Change these values in `src/shared/tuning.ts`. No rule or formula changes; the Final Edition still doubles exposure odds.

| Setting | Before | After |
|---|---|---|
| `appeal.evidence` | 8 | 2 |
| `appeal.juicePerPoint` | 4 | 6 |
| `trust.evidenceBonus` | 6 | 3 |
| `trust.exposedBase` | 10 | 3 |
| `trust.exposedPerJuice` | 2 | 1 |
| `townExposure.base` | 0.05 | 0.02 |
| `townExposure.perJuice` | 0.05 | 0.025 |
| `townExposure.perRoundSurvived` | 0.10 | 0.02 |
| `investigation.proofChance` | 0.60 | 0.40 |

Spec §10 item 3 changes its acceptance bar from "each strategy wins at least 15%" to "always-honest wins at most 50%, mixed at least 20%, always-lying at least 10%".

## Why

At the spec's starting values, a 500-match sim (honest, liar, mixed and a Tabloid bot, rotating seats) gave honest 96.6%, mixed 3.6%, liar 0%, bot 0%.

- An always-liar had 4.4 of its 5 lies caught on average; its trust ended at 0, so its score was 0.
- Honest earned the evidence bonus every round and ended with trust 80 and 4–5× the readers.

A tuning search showed that the always-liar cannot reach 15% while the Final Edition keeps doubled odds; it reached 16.5% only with the multiplier at 1. The always-liar is a degenerate strategy under score = readers × trust, so the bar was lowered instead of removing doubled odds.

Two values differ from the first proposal shown to the user:
- `townExposure.base` 0.05 → 0.02 was part of the measured configuration but missing from the proposal table.
- `townExposure.perJuice` 0.03 → 0.025 was added after 500 matches put the liar at 9.8%.

## Result

`npm run sim -- --matches 500` (sample content): honest 0.390, mixed 0.304, bot 0.200, liar 0.112, 0 crashes, pass.
