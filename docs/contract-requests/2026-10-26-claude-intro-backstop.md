# Contract request: longer intro backstop (2026-10-26, Claude)

**What:** in `src/shared/tuning.ts`, change `phaseMs.intro` from `20_000` to `60_000`.

**Why:** in the playtest, players couldn't finish reading before the intro advanced. The rule cards are being shortened (see `docs/onboarding/proposal.md`), and the button becomes "I'm ready". The intro already ends early when every connected human presses it (`skipIntro`), so a longer backstop only matters when someone is still reading or idle. User decision 2026-10-26: keep a long backstop timer, and solo does not wait forever.

**Exact change:** `phaseMs: { intro: 60_000, investigate: 15_000, write: 45_000, reveal: 20_000, final: 40_000 }`.

**Effects to check (Codex, server/engine owners):**
- The worst-case match length grows by 40 s (gameplay spec §4.2 table: intro 20 s becomes 60 s; maximum total about 8 min 20 s). The spec text needs the same update.
- Engine and server tests that assert the intro deadline.
- Recorded fixtures: none are re-recorded by hand. If needed, Claude re-records them through `npm run fixtures`.

**Approval: APPROVED by the user on 2026-10-26** ("approve 60s"). Codex implements the `src/shared/tuning.ts` change with its engine/server tests, the spec table update and the redeploy.

**Delivery (2026-10-26):** the user assigned the `src/shared/tuning.ts` edit to Claude and also approved Codex's companion request `2026-10-26-codex-first-investigate.md` (round-1 Investigate 25 s). Both landed on `claude/onboarding-timing`:

- `phaseMs.intro` is now `60_000`.
- New field `firstRoundInvestigateMs: 25_000`, selected in `src/engine/phases.ts` `enterPhase` only for round 1 Investigate.
- The spec §4.2 table now gives a 510 s maximum.

Codex-owned test updates are requested in `docs/onboarding/timing-codex-request.md`.

**Follow-up (2026-10-26):** instead of Codex's deadline-drafts design, the user chose a longer Write phase plus a warning (option B). `phaseMs.write` is now `60_000` (was `45_000`), and the spec §4.2 maximum is 585 s. The UI warns "10 s left — lock it in!" and turns the timer red at 10 s left in Write. Delivered on `claude/write-time`.
