# C5 Should renderer integration plan (Codex)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate all Codex-owned Should presentation: day/night lighting, emotes, picket attachment and reading/reacting, preserving authoritative playback.

**Architecture:** Consume Claude's modules unchanged. Keep presentation time in the existing frame loop, route playback in the coordinator, and resource ownership in the town lifecycle. Reuse the existing character read pose and shared screenshot command.

**Tech stack:** Existing TypeScript, Three.js, DOM overlays, Vitest and Playwright capture tooling; no dependencies or new assets.

**Spec:** Overhaul design §§3, 6–9, 11–13; gameplay design §§9–10; presentation interface §5c at `ccf642c` (amendments acknowledged at `aff108b`, later constant-lantern/ticker rulings accepted here).

## Scope and prerequisites

- C5 support only, not D5. All five Should items remain in scope; Claude owns the ticker, palette/look definitions and props. Could items remain cut by the user's recorded decision.
- Separate branch `codex/c5-shoulds`, worktree `.worktrees/codex-c5-shoulds`, base `main` `6f5d37e`. D4 passed at `e9e101d`; fallback fix `0cc08e7` accepted and on main.
- Claude delivery `ccf642c` is available locally; its handoff reports 882 tests plus typecheck/lint/build passing. This is counterpart evidence, not an independently run combined-tree result.
- **Before implementation:** user integrates Claude's delivery through the merge workflow; counterpart reviews this plan's ownership and additive TownView method; user approves Claude's six day/night preview looks. No approval record was found in the delivered handoff. Promised approvals do not pass a gate.
- Current clean base: `npm test` passes 121 files / 852 tests. Dependencies reused through an ignored node_modules symlink; nothing installed.

## Global constraints

- Never change shared contracts, engine outcomes, map, fixtures, authoritative routes/destinations or server deadlines. No new gameplay clock.
- Existing movement remains 15–70% of the remaining reaction interval, including the existing final-node-to-slot segment. Read prelude is `min(1200 ms, 0.15 * remainingMs)`; react/emotes follow arrival.
- At most eight emotes, independent of six speech bubbles. All user text remains text. Theme colors come from the supplied palette.
- Preserve tone mapping, exposure, shadows and static-outline batching. Lamp updates change pool opacity only; lantern glow remains constant. No point lights.
- Reduced motion snaps to stable destination/pose/icons/signs without prelude or sway. Existing no-WebGL explanation and playable UI remain intact.
- Direct edits only in Codex renderer/tests and the Codex plan/handoff/request docs. Inherited Claude files must match their delivered commits. Root config, scripts, visual harness, UI, architecture, props and shared files are not edited by Codex.

## Review focus

1. Reload near deadline, zero/short interval and tab suspension must not add a delayed reading sequence or extend playback.
2. Round changes in the same phase, duplicate snapshots, session reset and context recovery must not leave stale lighting or restart active playback.
3. Turning reduced motion on during travel must settle actors and retain stable signs/emotes, without restarting or leaking playback.
4. More than eight eligible actors across destinations must produce deterministic fair selection, with no stale decorations next phase.
5. Repeated rounds and teardown must not accumulate sign clones, overlays, observers or GPU resources; sign outlines must fit the hardware budget.

## Owned files and interfaces

Modify `src/client/town/{scene,index,view,mount,playback}.ts` and mirrored tests (`tests/town/{scene,mount,playback}.test.ts`, plus existing town lifecycle test files located during execution).

New Codex-owned modules with mirrored tests:
- `src/client/town/daylight.ts`, `tests/town/daylight.test.ts`: interpolate supplied lighting looks and lamp level in frame time.
- `src/client/town/emotes.ts`, `tests/town/emotes.test.ts`: deterministic selection and camera-projected text glyph overlay (anger mark, not the word "anger").
- `src/client/town/reaction-props.ts`, `tests/town/reaction-props.test.ts`: bounded per-citizen sign reuse and arrival/clear lifecycle.
- `docs/visual-overhaul/handoffs/C5-codex-shoulds.md`: resulting evidence and remaining gates.

Additive presentation API: `TownView.setTimeOfDay(time: TimeOfDay): void`, implemented by the town and as a no-op by the fallback. `mountTown` calls it using `timeOfDay(snapshot.round, snapshot.phase)` on authoritative updates and `'midday'` without a snapshot. No shared or store shape changes. Existing `setPhase(phase)` and playback signatures stay stable. Counterpart must acknowledge this addition before code.

Internal module exports (Codex-owned): `createDaylight(scene: TownScene, buildings: TownBuildings, palette: PresentationPalette)` returns `{ setTime(time: TimeOfDay, immediate: boolean): void; update(deltaSeconds: number): void }`; `selectEmoteActors(plan: ReactionPlan): readonly number[]`; `createEmoteManager(container: HTMLElement, camera: THREE.PerspectiveCamera, palette: PresentationPalette)` returns `{ show(id: number, emote: Emote, anchor: () => THREE.Vector3): void; update(): void; clear(): void; dispose(): void }`; `createReactionProps(ctx: ArchitectureContext, citizens: CitizenManager)` returns `{ showSign(id: number): void; clear(): void; dispose(): void }`. These are local presentation helpers, not data-export/gameplay interfaces.

## Task 1 — Day/night integration

- [ ] Write failing daylight/mount tests for all supplied look fields, intensities `1.1 * lightScale` / `2.4 * lightScale`, pool level, repeated target without tween restart, interruption, and exact destination after 1 second. Test immediate reduced-motion changes, no-snapshot midday reset and same-phase round changes.
- [ ] Run `npm run test -- tests/town/daylight.test.ts tests/town/mount.test.ts` and record expected failures before implementation.
- [ ] Implement the above helper/API in daylight, scene/index/view/mount. Use Three Color interpolation in linear color space, no duplicate tint constants. Initial look is immediate; subsequent changes tween for 1 second via the existing RAF loop. Reuse current displayed values if interrupted. Restore current snapshot look after context restoration; avoid replaying reactions on duplicate snapshots.
- [ ] Rerun focused tests; verify context disposal and fallback remain safe. Capture/view morning, dusk and final-night via the shared command with matched framing; inspect hat colors, fog, labels and pools.
- [ ] Audit ownership and commit `town: apply authoritative day progression`.

## Task 2 — Arrival emotes and signs

- [ ] Write failing tests: non-null actors grouped by last prescribed destination node, first eligible per destination then round-robin in plan order, cap 8, null behavior omitted, empty/degenerate routes deterministic. Test text-only glyphs, behind-camera hiding and overlay disposal.
- [ ] Write failing arrival tests for protest/angry_mob signs only; reuse one clone per citizen/slogan rather than creating clones every round (Claude's kit retains references until teardown). Detach at phase change, reattach on later arrival, dispose kit once before material kit. Test selected actor receives one emote after arrival; signs are not capped at eight.
- [ ] Run `npm run test -- tests/town/emotes.test.ts tests/town/reaction-props.test.ts tests/town/playback.test.ts`; record RED.
- [ ] Implement managers and wire coordinator/index. Use canonical resolved destination for empty/invalid-route resilience without changing route semantics. Signs attach at a fixed root-local grip offset sized for 1.8-unit citizens; choose slogans deterministically from supplied texts by citizen id. Reuse the existing overlay projection pattern without changing speech bubbles. Keep new emotes visually separate from labels/bubbles.
- [ ] Preserve visible decorations when a plan naturally completes; clear on explicit phase/session reset, replacement plan or disposal. Do not let coordinator completion cleanup erase arrival feedback. Test reduced motion, short-plan snap, repeat clear/dispose, context recovery and no-WebGL safety.
- [ ] Run focused tests and capture/view late-reveal town/app desktop and phone, plus reduced motion. Confirm all eligible protesters carry readable signs and emotes are distinct from speech bubbles.
- [ ] Audit ownership and commit `town: show prescribed arrival emotes and pickets`.

## Task 3 — Read/pause/react playback

- [ ] Add failing coordinator tests at 0, 1200 ms, 15%, just before/at 70%, and completion; include intervals shorter than 1200 ms, zero/0.3 s reconnect snaps, repeated plans and mid-flight reduced-motion changes.
- [ ] Run `npm run test -- tests/town/playback.test.ts`; record RED.
- [ ] Use existing `setCitizenPose(id, 'read', seconds)` during bounded prelude; neutral pause until travel, existing walk/run during 15–70%, prescribed behavior gesture after arrival. No new character assets or arbitrary behavior choices. Keep paper changes and bubbles tied to existing authoritative arrival path. If remaining interval expires, snap; never queue a new prelude.
- [ ] Ensure toggling reduced motion changes the coordinator's active policy (currently its dependencies capture the initial option); add only the internal setter needed, with tests. Keep lifecycle semantics from Task 2.
- [ ] Run tests; capture/view prelude, movement and arrival timestamps with identical scenario inputs; verify routes and final hats match before/after expectations.
- [ ] Audit ownership and commit `town: fit reading poses inside reaction lead-in`.

## Task 4 — Integrated evidence and counterpart handoff

- [ ] Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`; all must exit 0. Audit direct ownership and byte-identical inherited Claude files. No unrelated cleanup.
- [ ] Capture sequentially with `npm run capture -- --target app --screen match --fixture solo-honest --round N --phase PHASE --reaction-ms MS --timeout-ms 400000 --out PATH`: all available day/round looks plus final night; round-3 reveal at 0, 1200, 6000, 15000 ms; late reveal at 1280x720, 390x844 and 844x390; reduced motion; intro/investigate/write/reveal/final no-WebGL desktop/phone to guard the notice/ticker interaction. Town views use `--target town`. Open every PNG; require readiness, clean app layout and zero console errors. Save under `.superpowers/shots/C5-codex-shoulds/`.
- [ ] Repeat an identical app capture and compare PNG bytes with `cmp`; ticker capture freezing must remain deterministic. Test actual live ticker motion separately, since frozen screenshots cannot prove it.
- [ ] Request an updated reference-laptop busy-reveal recording using the existing realtime harness. Record hardware/browser/settings, FPS and additional unbatched sign outlines. Software-rendered screenshots do not establish hardware FPS. Performance failure stays open; do not cut effects to declare success.
- [ ] Save Codex handoff with exact source SHA, checks, captures, resource lifetime results, known limitations and Claude review request. Claude reviews integration/presentation; C5 closes only through its remaining review gates.
- [ ] Once an approved candidate exists, carry out the existing user-operated EC2 deployment/smoke workflow: retain current image as rollback, verify source digest/image, remote two-seat full match/recovery/assets plus home/final shared evidence. No paid upgrade or new billable resources; Render fallback unchanged. Deployment restarts lose in-memory rooms. Do not claim deployed or close this verification without host evidence.

## Expected delivery and stop condition

A committed Codex branch with all renderer Should features, no gameplay changes, passing checks, viewed screenshots and explicit performance/production evidence status. User controls merge and art approval. D5 and its cover remain separate and wait for C5; no new contract requests are anticipated.
