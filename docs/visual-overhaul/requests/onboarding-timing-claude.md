# Onboarding timing investigation and joint proposal — Codex to Claude

Base main8a3815a,2026-10-26. User requested a coordinated proposal first, then a genuine first-time-player test. This is a proposal and change request, not an implemented fix or mutual agreement.

## Observed mechanics

- src/engine/match.ts creates intro deadline immediately from startMatch; src/shared/tuning.ts specifies20s. src/engine/phases.ts tick advances on deadline OR phaseDone (all connected human seats acted). Bot seats act instantly. No waiting for reading/render/fonts/user acknowledgement.
- src/server/matches.ts publishes the created match and ticks the engine; after accepted commands it calls advance immediately. Thus a solo Skip Intro starts15s investigation immediately; selecting a location or Skip Investigation can immediately start45s writing; locking/skipping writing can immediately start20s reveal. Multiplayer waits only for other connected humans, until the fixed deadline.
- A late engine tick gives a newly entered phase a fresh deadline; there is no evidence here of catch-up skipping its entire15s window. CountdownTimer only displays the server epoch; it is not advancing the game.
- IntroScreen renders3 rule cards (~111 body words) and a countdown plus Skip Intro. It receives neither private acted nor pending/error props from AppRouter, so there is no acknowledged-ready/waiting presentation, and repeated clicks can send duplicate actions. AppRouter already has privateSnapshot.acted for investigate/write.
- Investigation provides certain evidence immediately in the engine, but the solo screen may transition straight to writing. InvestigateScreen's locked text says waiting for report, while the result/evidence is already server data; clarify copy/context in editor rather than adding a new timed result stage.
- No help/rules entry point was found in src/client/ui. Complex investigation/expose and scoring rules are frontloaded into the intro. Final/ended both render FinalEditionScreen, so ending the40s final phase does not itself dismiss results.

These mechanisms plausibly explain the playtest symptom; we have not observed the reported players or measured their reading/comprehension. Do not label every phase length defective from this report alone.

## Options and recommendation

1. Copy/help only with existing timers: no timing-contract change, but a slow reader still loses the intro after20s. Useful UI improvement, insufficient guarantee.
2. **Recommended: one untimed shared intro, then current paced rounds.** Briefly preview the next actions (read tip → choose one location → choose location/claim, write and lock), with a Ready to investigate button. Only acknowledgements from every connected human release round1; bots never block. Keep current15/45/20s round timing and early-completion rules. Add visible, phase-specific action prompts and always-available full rules; opening help during an active round does not pause other players or the shared server timer. Tell the player that.
3. Manual Continue at every stage: protects reading but makes recurring rounds wait repeatedly and changes the game much more. Not recommended without first-time testing showing the simpler option fails.

Read docs/contract-requests/2026-10-26-codex-onboarding-ready.md for the exact unapproved timing/snapshot proposal and disconnect behavior. Idle connected players can hold the initial briefing indefinitely under option2: show waiting status and allow leaving/recreating the room, with no hidden timeout, host override or automatic consent. The existing no-humans cleanup remains. This is the principal tradeoff to approve.

## Claude requested response and ownership

Please review option2 and acknowledge/amend the proposed contract before dependent implementation. Coordinate your shorter copy, immediate next-action hierarchy and persistent detailed rules around it. Avoid showing scoring/exposure detail as required reading before the first click. Draft exact teaching copy yourself; this request does not edit Claude UI/content.

For the intro, use private acted for own Ready/wait state and proposed public onboardingReadySeatIds only for the group readiness display; no local success assumption before acknowledgement/snapshot. Cover pending, rejected/lost acknowledgement, reconnect and errors. Help must be keyboard/touch accessible, focus-safe, usable on390px and not hide the primary action; avoid reopening an initial tutorial automatically each round. Preserve form state when help opens/closes and as same-phase snapshots arrive.

Codex will update server/net integration and deployment probe expectations after user-controlled contract delivery. Claude owns engine implementation only after the user explicitly extends the narrow current ownership scope; shared changes cannot be done by either agent by default. No implementation has begun.

## First-time-player acceptance test (not yet run)

User reports no unfamiliar tester available yet. Automated browser/agent walkthroughs can check timing and usability mechanics but do not prove a novice understands the next action. Keep this acceptance item open; do not substitute an AI agent as an unfamiliar human.

Once available, use a local AI-off candidate and one novice plus a facilitator in separate seats. No advance coaching beyond the game. Ask the novice to think aloud before first Ready, first investigation selection and first headline lock: what will you do next, and which control does it? Record correctness before revealing explanations, time until comprehension, unprompted actions, help use, unsolicited skips, and any transition before comprehension. Facilitator presses Ready first; verify the novice can read longer than20s without advancement, and that a solo novice can also take their own time. Check a later round without reopening the briefing, plus a disconnect/reconnect mechanical run. Do not count rereading memorized test runs as independent novice evidence.

Pass: the novice identifies and performs the first investigation and lock actions without facilitator instruction, understands Ready releases timed play, and comprehends the next action before each tested transition; multiplayer fast-reader readiness cannot move the novice ahead alone. Recurring rounds retain current pacing with no forced instruction replay. If timer expiry or immediate transitions still outrun comprehension, record the failure and revise the joint proposal; do not silently extend tuning or declare success from button clicks alone.

## Investigation verification

Ran npm run test -- tests/engine/phases.test.ts tests/server/matches.test.ts tests/ui/IntroScreen.test.tsx against base main8a3815a:3files/27tests passed. Existing tests explicitly cover the20s intro deadline, early completion, deadline rejection, server match advancement and current Skip Intro rendering. This establishes current mechanics, not proposed readiness behavior or novice comprehension. No runtime source changed; no full-suite/build or new visual captures were run for these investigation documents. No AI calls, production action or spending change.
