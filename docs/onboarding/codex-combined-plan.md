# Combined onboarding proposal — Codex review of Claude154b558

Owner: Codex review/coordination. Base main8a3815a; reviewed Claude proposal and intro-backstop request at154b558. Status: combined proposal for Claude acknowledgement and user approval; no implementation or gameplay-contract approval implied.

## Decisions proposed together

1. Accept Claude's shorter rule cards, "I'm ready" label, contextual next-action lines, round1-only hints and accessible in-play How to play dialog. Preserve the score formula accurately: total readers × (trust/50); a shortened "readers × trust" description must not be presented as the exact numeric formula. Persistent help does not pause the shared timer and must say so. Preserve editor selections/text when opening help and across same-phase snapshots.
2. Adopt60seconds intro as a backstop for solo AND multiplayer; existing early completion stays. User's relayed decision rejects the earlier indefinite solo recommendation. This supersedes Codex's untimed/null-deadline proposal; retain numeric deadlines and the existing skipIntro command.
3. Recommend25seconds Investigate in round1 only; later rounds15seconds, Write45, Reveal20 and Final40 unchanged. This gives an additional10seconds to interpret the first tip and map it to a first action. It is a provisional usability choice, not evidence of improved comprehension. No extra mandatory tutorial screen, first-round result pause or instruction replay in later rounds. Investigating still completes the player's action and can immediately advance when all eligible humans acted; put their result/evidence clearly in the editor context.
4. Omit the proposed public ready count for this iteration. Current public snapshots do not support it, and a count is not necessary to solve the reading problem. Use privateSnapshot.acted, pending and error state for own acknowledgement plus "Waiting for the other editors…". Before acknowledgement, say everyone can continue early, or play starts when the visible countdown ends. Do not promise waiting indefinitely or "nobody advances until everyone understands" because the60s backstop intentionally advances.

## Verified gate and disconnect semantics

`src/engine/phases.ts:phaseDone` selects controller=human seats, requires at least one, and checks acted for each. Thus one fast multiplayer player cannot advance while another connected unacted player remains, until the backstop. Solo Ready advances immediately. Bot/caretaker seats never block. `matches.ts` advances immediately after commands/connections; it does not wait for a future tick. Every new phase gets its full duration from actual entry time.

A disconnect changes controller to caretaker and runs runBotTurns, which sets acted even in intro. If the seat reconnects before intro ends, acted remains true. This is the shipped rule, not a fresh explicit Ready acknowledgement. Keep it for this minimal proposal, document the consequence and test it; don't call generic acted a literal human-readiness record. Requiring fresh acknowledgement after such a reconnect would be an additional engine rule, outside this combined proposal.

With zero connected humans, no early completion occurs, but the60s deadline still advances the intro; existing no-human room cleanup continues. A disconnected unready player can stop blocking other ready players immediately. During timed rounds Caretaker behavior and remaining timers remain unchanged.

No public readiness field exists: papers exposes controller/personality and write-only lockedVisibleAtMs; intro lockedVisibleAtMs is null. Own acted is private only. Never derive a count from controller, lock timestamps, local clicks, acknowledgements for other sockets or a parallel server state. Never expose generic acted in later phases. If a count is required after review, file a separate intro-only snapshot contract request first; this plan needs no such field.

## Exact timing contract approvals

- Claude request docs/contract-requests/2026-10-26-claude-intro-backstop.md: phaseMs.intro20000→60000, spec§4.2 updated accordingly.
- Codex companion request docs/contract-requests/2026-10-26-codex-first-investigate.md: new TUNING.firstRoundInvestigateMs=25000, selected by the engine for investigate in round1. No server/client duplicate timing literals.
- Combined worst-case nominal total:60+25+4×15+5×45+5×20+40=510seconds (8minutes30seconds), plus scheduling delay. This is50seconds above the original460; the intro-only total500 in Claude's request becomes510 if both requests are approved. Early completion still shortens play.
- Existing UI proposal assertion that multiplayer "rarely waits" is not established: code confirms it does wait for all currently connected unacted humans until the deadline. Avoid claiming measured reading times or comprehension from word count alone.

## Ownership and sequence after approval

1. User approves the combined timing changes and authorizes/assigns the frozen shared edits. User also explicitly authorizes Claude to modify engine transitions for this onboarding timing work, beyond the current narrow engine-ownership exceptions. Both coders acknowledge the approved delivery before dependent work. No shared edits by Codex by default.
2. Claude writes the requested UI implementation plan, covering src/content/rule-cards.ts, IntroScreen/AppRouter, phase panels/top bar/help dialog, UI/styles tests and relevant screenshot harness/fixtures. The plan must use current protocol/private acted; no public ready count. Claude also owns engine changes/tests if authorized:60s initial deadline, first-round investigation duration selection, views and timing cases. No content tuning outside the approved timing changes.
3. Codex writes a separate concise implementation plan against the delivered contract for server/net regressions and any deployment probe timing assumptions. Likely areas: tests/server/matches.test.ts, tests/net and server reconnection integration. No server override of engine deadlines; no new readiness socket message. Determine actual required changes rather than modifying every listed file automatically.
4. Tests-first engine/server/UI coverage, full npm test/typecheck/lint/build and shared desktop/phone/reduced-motion/no-WebGL captures viewed by their respective owner. Re-record fixtures only via Claude's approved command if necessary. Counterpart review before integration, user merge; deployment/restart is a separate approval. Do not consume production AI quota for local tests.

## Required verification

- Actual60s contract: before deadline stays intro, at deadline advances, solo Ready advances early, one of2 human acknowledgements waits, last releases, bot/caretaker excluded, zero-human backstop/cleanup preserved. Lost/rejected/duplicate acknowledgements and reconnect retain authoritative state.
- Explicit regression for nonready disconnect→Caretaker→reconnect (acted=true), and disconnecting last unready human while another is ready. Test this instead of pretending every acted flag means explicit human consent.
- Round1 investigate entry deadline is entry+25000; later rounds entry+15000. Late ticks don't consume the new phase budget; exact-deadline rejection/early completion and all other durations unchanged.
- Intro owns pending/error/acknowledged state; no false ready count. Timer/How to play notice remains accurate, keyboard focus trapped/returned, Esc closes, field state preserved. First-round hints absent from later rounds; no-WebGL notice and action controls remain reachable at390×844 and844×390.
- Use existing public/private views and privacy suites. Reveal20s remains fixed; final results persist after ended. Automated smoke must handle the reviewed timings through server state rather than stale hardcoded limits.

## Novice acceptance — still open

User has no unfamiliar tester available yet. Once available, use AI-off local candidate with a novice and another player. Ask what action the novice intends and which control performs it before Intro Ready, first investigation and first lock; do not coach. Another player readies early to check waiting. Record comprehension time, automatic/early transitions, skips, help use, form continuity, and a later round with no forced tutorial replay. A60s backstop can still outrun a slow reader: record failure honestly rather than asserting a guarantee. If comprehension misses the stage transition, revise the joint proposal with the user. Browser automation cannot replace this human acceptance criterion.

## Investigation evidence

Ran a Node assert-based check using existing engine test helpers and views: two-human wait/last-ready release; disconnect exclusion; zero-human backstop; caretaker reconnect retains acted; no public ready flag. The60s check used a cloned test state deadline60000 only; repository tuning remains20000. All assertions passed. Prior focused tests:3files/27passed. No product code, fixture, shared or Claude-path edit. Full suites not repeated for proposal documents; no screenshots, deployment or new API calls. No claim of user comprehension or implemented60/25s behavior.
