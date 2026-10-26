# Contract request: longer intro backstop (2026-10-26, Claude)

**What:** in `src/shared/tuning.ts`, change `phaseMs.intro` from `20_000` to `60_000`.

**Why:** in the playtest, players couldn't finish reading before the intro advanced. The rule cards are being shortened (see `docs/onboarding/proposal.md`), and the button becomes "I'm ready". The intro already ends early when every connected human presses it (`skipIntro`), so a longer backstop only matters when someone is still reading or idle. User decision 2026-10-26: keep a long backstop timer, and solo does not wait forever.

**Exact change:** `phaseMs: { intro: 60_000, investigate: 15_000, write: 45_000, reveal: 20_000, final: 40_000 }`.

**Effects to check (Codex, server/engine owners):**
- The worst-case match length grows by 40 s (gameplay spec §4.2 table: intro 20 s becomes 60 s; maximum total about 8 min 20 s). The spec text needs the same update.
- Engine and server tests that assert the intro deadline.
- Recorded fixtures: none are re-recorded by hand. If needed, Claude re-records them through `npm run fixtures`.

**Approval:** user approval required before `src/shared/` changes (AGENTS.md Hard rule 1).
