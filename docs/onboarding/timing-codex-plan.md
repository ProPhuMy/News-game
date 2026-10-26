# Codex timing integration plan

Base: Claude c98d456e295a69fd564a13cc5f69cfd1f14d0224; user approved60s intro and25s first investigation, assigned shared tuning to Claude. Consumes existing numeric deadlines, skipIntro command and private acted; no new contracts. Codex owns all files edited here. No Claude path, root config, shared/engine/runtime game-rule edits.

- [x] Read Claude's timing request and reproduce old-timing failures in tests/server/matches.test.ts and tests/net/fixtures.test.ts.
- [x] Replace assumptions about initial intro deadline with TUNING.phaseMs.intro; preserve meaningful fixture pause/resume coverage relative to that duration, without hand-editing recordings.
- [x] Reproduce the smoke's old intro-label failure with a real browser, then minimally accept both I'm ready and Skip Intro in deployment/D3-production-smoke.mjs. Preserve real-match, recovery, asset, private-recipient and renderer gates; do not weaken assertions to make the environment pass.
- [x] Validate recurring55s waits against the new25s round1 and45s write. Distinguish the initial ready gate from the driver; if any supported path can wait through the60s intro, give that path a sufficient bound rather than extending unrelated waits blindly.
- [x] Run focused tests, local production build/smoke with AI off, full test/typecheck/lint/build. View produced evidence if available and report environment blockers faithfully. Keep exact RED/GREEN evidence and counterpart request in this document.
- [ ] Commit on codex/onboarding-smoke; counterpart reviews Codex changes and preserved source boundaries. User merges. Only AFTER user merge, pin the merged revision for one quiet-window server+client deployment, preserving Groq Free model/endpoint/concurrency4/30000-total cap and the same persistent ledger, current recovery image, proxy/publication/log settings. No ledger reset or AI allowance increase is authorized. Production restart requires the applicable user authorization; no deployment occurs during local verification.

Static recording caveat: existing Claude recordings intentionally retain their historic timestamps. Tests that build new recordings from the live engine must follow current tuning; historical playback must follow each file's recorded deadlines. No rerecording is needed merely to test player timing. Genuine novice comprehension remains untested.

## Implementation and observed checks

Four failures reproduced before edits: generated fixture expected120000 but actual intro deadline160000; remaining intro60000 versus expected20000; both server isolation cases incorrectly ticked at20000. After importing shared TUNING and replacing only intro-duration assumptions, focused suites2files/16tests pass. Fixture pause/resume now tests around half the current intro rather than a stale20s total; current first-round remaining budget is asserted against TUNING.firstRoundInvestigateMs. Claude's historical JSON recordings were not edited.

Real browser RED: the unchanged smoke failed at line151 after30000ms waiting for getByRole(button,name='Skip Intro'). GREEN implementation is two label-only edits: initial ready locator accepts exact I'm ready or Skip Intro, and the existing driver action list includes both. No room/recovery/privacy/asset/result/renderer assertion was removed. No helper, dependency or root configuration was added.

The55s driver bounds need no increase for the approved timings. The initial probe explicitly clicks BOTH humans' ready buttons, then submits a guest investigation before entering the driver, so its driver never waits through an unacknowledged60s intro. Within the timed loop, the maximum clicked action-phase wait is Write45s (10s margin); first investigation25s (30s margin), later investigation15s, or reveal20s until a new action/results appears. This bound is scoped to the existing two-human drive, not a guarantee for an arbitrary unready intro. Initial locator's timeout bounds finding/clicking the Ready button, not waiting for the intro backstop.

Additional real-time Chromium check deliberately took NO investigation action in a local production-mode solo match. Round1 automatically entered Write after25019ms, within the probe's unchanged55000ms wait. Observed shared firstRoundInvestigateMs25000; AI none; no clock/deadline mutation. Local production smoke still requires its complete pass before handoff.

Full automated checks:144files/1033tests passed; npm run typecheck, npm run lint and npm run build exited0. Existing large-bundle warning only. No shared/engine/client/UI file edits by Codex. No production action or authenticated provider calls made during these checks.


## Final local smoke and handoff

The unchanged55s waits passed the complete local production-mode smoke against the new60/25s engine/UI build, AI disabled. Actual summary: passed=true, remote=false, Nodev26.12.1, Chromium153.0.8010.12,26assets including17models/1font/4sounds,2isolated browser sessions, restoredSeat=true, results=true. Probe retains polling/WebSocket recovery acknowledgements, private-recipient and rival-token checks, asset-byte/MIME checks, literal hostile name, five real rounds and final results. No fallback/renderer assertion was relaxed; this run rendered WebGL successfully.

Home and final screenshots/sidecars at `.superpowers/shots/onboarding-smoke/` were opened directly; both have overflowX=[], unreachable=[], consoleErrors=[]. These local synthetic captures are ignored, not committed and are not new remote production evidence. Logs: `/tmp/news-town-onboarding-{timing-red,timing-green,smoke-red,smoke-green,first-round-wait,full-test,typecheck,lint,build}.log`.

Codex edits: deployment/D3-production-smoke.mjs (2label-only edits), tests/server/matches.test.ts, tests/net/fixtures.test.ts and this plan/evidence document. All Claude runtime, shared, engine, UI, harness and asset paths byte-match deliveredc98d456. git diff --check clean. No new dependency, contract request, AI attempt or production mutation.

Counterpart request: review the minimal probe label compatibility and unchanged55s loop assumptions, plus the fixture tests following shared tuning. User merges the reviewed candidate; Codex then pins the actual merged commit and prepares a single server/client image for the separately authorized quiet-window deployment. Keep current recovery image and existing production AI environment/ledger (Groq Free, concurrency4,30000total, no reset or increase). Runtime checks after that deployment remain pending: source/image identity, served UI, running settings/ledger continuity, production smoke and new successes for both AI operations. Human novice comprehension remains untested.
