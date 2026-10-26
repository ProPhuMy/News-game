# Codex: smoke compatibility for60s Write

Base: Claude27c178451211195bbf3da521134e5c702f10c2a9. User selected60s Write plus10s warning instead of deadline drafts. Draft design/contract is shelved on codex/deadline-drafts (history only, no implementation). User merge remains a prerequisite for production deployment.

Scope/ownership: only Codex deployment/D4-smoke-options.ts, deployment/D3-production-smoke.mjs, tests/server/deployment-smoke.test.ts and this record. Add a named Codex-owned smoke timeout constant consumed by the probe and boundary tests; no new dependency, root/shared/gameplay/UI edits. Keep all existing smoke/privacy/recovery/renderer checks.

- Reproduce the55s bound failing in a local real browser when another human lets the60s Write phase expire. Confirm real engine deadline and10s warning, not a simulated timer.
- Give both probe wait sites a shared bound derived from the longest configured phase (including firstRoundInvestigateMs) plus10s operational slack. Current required bound70s; no copied60s gameplay literal. Cover the bound with a test. Do not extend the60s game timer or weaken completion checks.
- Run focused smoke-option tests, full tests/typecheck/lint/build and a complete local production-mode five-round smoke with AI off. Open home/final PNGs; record any environmental issue instead of weakening gates.
- Counterpart/user review and merge; afterwards pin actual merged source for a quiet-window single-image server/client replacement. Preserve current recovery image, Groq Free endpoint/model/concurrency4/30000total allowance, same existing ledger, proxy/publication/log settings. No reset/refill, paid upgrade or deployment before merge. Capture real production smoke and fresh operation success after authorized deployment.

## Observed RED/GREEN and local validation

The existing55000ms phase bound fails the new regression: expected a bound at least70000ms for the configured60000ms phase plus10000ms browser slack. Real idle-writer browser RED also observed the old55s wait expire while the engine remained in Write. The corrected shared `SMOKE_PHASE_TIMEOUT_MS` is derived from all phaseMs values plus firstRoundInvestigateMs, with10000ms operational slack; it is currently70000ms. Both probe wait sites consume it. No gameplay tuning literal was copied into the probe and no game duration changed by Codex.

Focused smoke options/decoding suite:20/20 GREEN after the bound change (1new regression). Full npm test145files/1037tests passed; typecheck, lint and build exited0, existing large-client-bundle warning only. No source outside the named Codex-owned scope changed.

Separate real-time local production browser GREEN left a solo writer completely idle: old55000ms wait expired before Write ended; the delivered warning was visible at5s remaining; the real phase transitioned to Reveal after60375ms within the new70000ms bound. AI none, no clock or engine deadline mutation. Initial real-time RED ran while the old bound was still configured; its attempted warning diagnostic used a nonexistent test ID and is not evidence about warning visibility. GREEN used the actual role=alert/text locator and asserted visibility. No product test IDs or UI were added by Codex.

Full local production-mode five-round smoke completed with passed=true, remote=false, Nodev26.12.1, Chromium153.0.8010.12,26assets/17models/1font/4sounds,2isolated sessions, restoredSeat=true and results=true. No renderer/privacy/asset/recovery assertion was weakened. Home and final PNGs in .superpowers/shots/write-time-smoke were opened directly; both sidecars have overflowX=[], unreachable=[], consoleErrors=[]. This is local AI-off evidence, not a production rerun.

After the final import grouping, focused20tests, typecheck and lint were checked again and passed. Full145files/1037tests and build evidence remains above; no gameplay source changed. All Claude-owned runtime/harness/UI/engine/test paths remain byte-identical to27c1784. git diff --check clean.

The deadline-drafts proposal/contract is explicitly shelved on its own branch atc05bb88 and is not integrated here. Ready for counterpart review/user merge; any production rollout remains pending that merge and preserves current Groq Free settings and the same30000-total ledger with all prior consumption. No new contract request, actual provider call, paid service, host mutation or production restart occurred during this task. Genuine unfamiliar-player comprehension remains untested.
