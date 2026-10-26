# Request: untimed, once-per-match onboarding readiness

Status: proposed for user/Claude review, NOT approved for implementation. Owner: Codex request; shared-contract edits remain user-controlled. Base main8a3815a. No runtime changes made.

## Why

Gameplay spec§4.2 requires a20-second intro. TUNING.phaseMs.intro and createMatch enforce it. An untimed Ready step therefore changes the frozen timing contract, even if the existing skipIntro command is reused. Hiding the countdown, extending timestamps in the server or keeping a local help overlay open while the engine advances cannot solve this correctly.

## Exact proposed contract change

- Amend spec§4.2: Intro is an untimed once-per-match briefing, ending when at least one human is connected and every connected human explicitly acknowledges readiness. Remove the fixed460-second total bound: timed gameplay remains440seconds maximum after onboarding, excluding elapsed briefing time. Never promise a fixed overall duration with an untimed intro.
- TUNING.phaseMs.intro becomes null; recurring phase durations remain investigate15000/write45000/reveal20000/final40000 milliseconds.
- PublicSnapshot.deadlineMs becomes number|null with validation invariant: null exactly in intro, finite numeric epoch milliseconds in all other phases. Internal MatchState.deadlineMs follows the same semantics. No artificial far-future deadline or duplicated local timing constants. Consumers must narrow before arithmetic.
- Add public `onboardingReadySeatIds: SeatId[]`, unique IDs of human-origin seats that explicitly acknowledged this match's intro, empty outside intro. It exposes no private acted/investigation/headline state. Do not expose generic per-seat acted flags during other phases. PrivateSnapshot.acted continues representing this seat's acknowledgement during intro.
- Reuse existing skipIntro wire command as explicit Ready acknowledgement, still with round0/phaseintro and actionId. UI labels it "Ready to investigate" and after acknowledgement "Ready — waiting for the other editors". It never skips anyone else's briefing. No new client-selectable deadline or host force-start command.
- In intro, a disconnect must not manufacture readiness through Caretaker runBotTurns. Preserve earlier explicit acknowledgement over reconnect; a seat that has not acknowledged and reconnects while still in intro must acknowledge itself. Nonhuman seats never block. Disconnecting nonready humans no longer block remaining ready humans. If zero humans are connected, do not advance; retain the existing no-humans room cleanup. Once gameplay begins, existing Caretaker/timer rules remain unchanged, and reconnect never replays onboarding.

## Ownership needed before implementation

User controls approval and shared-contract delivery/assignment (src/shared/tuning.ts and snapshots.ts and derived types/tests). Claude implements engine match/state/phases/commands/views and their tests only with explicit user authorization for this onboarding timing change beyond the current narrow engine-ownership exceptions. Claude also owns UI/content/help and fixtures/harness changes. Codex owns server integration/net store, their tests and deployment probes. Shared interface acknowledgements and a phase-sized implementation plan follow approval, before either coder builds dependent code.

## Verification required

Engine tests: no intro timeout after long elapsed time; solo Ready starts round1 with a fresh full investigation deadline; first of2 Ready does not advance, last does; duplicate/stale commands safe; bot seats excluded; nonready disconnect/reconnect cannot turn Caretaker action into readiness; already-ready reconnect preserved; no humans never advances and room cleanup still works. Existing per-round early-finish/deadline/late-action behavior stays unchanged.

Boundary tests: nullable deadline invariants, invalid/duplicate ready IDs rejected, stale messages/reconnect and safe readiness publication; no truth/tips/evidence/other private acted data exposed. UI/store/countdown/mount/harness/smoke consumers handle untimed intro without client-only clocks. AI disabled in local checks; production smoke only after separate deployment approval. Old client/server combinations must not be deployed independently: use existing single-version replacement procedure in a quiet window.
