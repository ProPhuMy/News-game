# D2 Claude integration delivery: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Deliver the Claude-owned work in `requests/D2-claude-integration.md` (on `codex/visual-d2` `41c40e3`). That covers four items:
- Remove the primitive building path.
- Forward the capture palette into the real town.
- Add capture support for the no-WebGL fallback, the rejected-name join and the thirty-citizen crowd comparison.
- Let the screenshot step use `--timeout-ms`.

**Architecture:** Each change stays in Claude files.
- `buildings.ts` becomes a thin required-context entry that delegates to `architecture/town.ts`.
- The shared harness passes the scenario palette through `TownViewOptions.palette` and reports the palette the factory actually received.
- New capture flags plug into the existing `args.ts`, `capture.ts` and harness modules. There is no second screenshot stack.

**Tech stack:** TypeScript, Three.js, Vitest, `playwright-core` (already installed). No new dependencies.

**Spec:** overhaul design §5, §6, §7, §9, §13 (D2 row) and the presentation interface §3–§5. The request file is authoritative for the asks.

**Branch:** `claude/d2-integration` from `codex/visual-d2` `41c40e3`, in worktree `.worktrees/claude-d2`. The user merges the combined delivery.

## Global constraints

- Claude paths only:
  - `src/client/town/buildings.ts`, `src/client/town/architecture/`, `src/client/town/props/`
  - `src/client/visual-test/`, `scripts/visual/`
  - `tests/town/buildings.test.ts`, `tests/town/architecture/`, `tests/town/props/`
  - `tests/visual/`
  - `docs/visual-overhaul/presentation-interface.md`, this plan
- Codex files are import-only (`index.ts`, `mount.ts`, `camera.ts`, `crowd-sample.ts`, `view.ts`, `webgl.ts`, `citizens.ts`, server, net).
- No change to `src/shared/`, fixtures, routes, scoring, the production palette (B) or the production citizen scale (3.29).
- A capture never reports what did not happen:
  - The palette in the sidecar is the one the town factory received.
  - `--no-webgl` fails if WebGL is still available.
  - The crowd target fails unless `instances === 30`.
  - A rejected-name capture fails unless the join error banner appears.
- Untrusted text: names typed by the harness are test inputs, rendered by the existing UI. No `innerHTML`.

## Review focus

1. Only callers that pass a context remain. Typecheck proves it, and no test imports `PAPER_COLOR_HEX` from `buildings.ts`.
2. With `--palette a`, the town renders palette A, not the default B. Pin this with a test on the factory options.
3. `--no-webgl` really disables WebGL in Chromium, and the capture shows the fallback status element.
4. A slow software frame does not trip the 30000 ms Playwright screenshot default.
5. A crowd module returning fewer than 30 instances fails the capture.

---

### Task 1: Required context and primitive removal

**Files:** modify `src/client/town/buildings.ts` and `tests/town/buildings.test.ts`.

**Interfaces:**
- Signature: `createTownBuildings(layout: TownLayout, ctx: ArchitectureContext): TownBuildings`.
- `TownBuildings` keeps every member: `group`, `getLocationAnchor`, `getOfficeAnchor`, `setOfficeHighlight`, `syncOffices`, `getOfficeBannerColor`, `ready`, `dispose`.

- [ ] Rewrite `tests/town/buildings.test.ts` to use `fakeContext('b')` only:
  - Anchors are node x/z at `LABEL_ANCHOR_HEIGHT`.
  - Banners start at the palette B paper hexes.
  - `ready` resolves.
  - `dispose` is idempotent.
  - Delete the primitive-only cases.
- [ ] Delete the primitive builders, `SEAT_HEX_COLORS`, `disposePrimitives` and the `PAPER_COLOR_HEX` import. Make `ctx` required.
- [ ] Run `npm run typecheck` (every caller passes a context) and `npm run test -- tests/town`. Commit `town: require ArchitectureContext and remove primitive buildings`.

### Task 2: Palette forwarding and production framing in the harness

**Files:** modify `src/client/visual-test/town-mount.ts`, `main.ts`, `app-scene.tsx`, `architecture-town.ts` and `scripts/visual/capture.ts` (live screens). Tests go in `tests/visual/`.

**Interfaces:**
- `mountAndSettleTown(container, store, clock, scenario: { reducedMotion; reactionMs; palette: PaletteId })`.
- It passes `palette: getPalette(scenario.palette)` through `mountTown` options and records the received palette in the `viewFactory` wrapper.
- `TownCapture` ready gains `palette: PaletteId`, taken from `options.palette.id` as the factory saw it. The town and app states publish it.

- [ ] Tests:
  - A unit test of the factory-options recording. Extract `recordingFactory()` if needed.
  - The architecture-town framing helper produces the same bounds as production for the same group.
- [ ] Live screens (`home`, `join`, `lobby`) run the production app, whose town always uses `APPROVED_PALETTE`. With `--palette` other than the approved palette, `parseCaptureArgs` throws: `live screens render the production palette (b); --palette a applies only to harness screens`. The CSS-only `applyPalette` call goes for live screens.
- [ ] `architecture-town.ts` `town` view: use `camera.frame(bounds)` and `camera.resize(w, h)`.
  - Bounds: expand by every target-building root (names `bakery`, `bank`, `town-hall`, `clinic`, `fountain-square`) and every `office` root, add each street node at y 4, then `expandByScalar(1)`.
  - Those are the same rules as `src/client/town/index.ts`. Note in a comment that it mirrors production.
- [ ] Run `npm run test -- tests/visual`. Capture `--target town --palette a` and `--palette b`. The sidecar `state.palette` must match each, and the PNGs must differ. Commit `visual-test: forward the capture palette into the real town`.

### Task 3: Screenshot timeout, `--no-webgl`, crowd target

**Files:**
- Modify `scripts/visual/args.ts`, `capture.ts`, `src/client/visual-test/main.ts`, `town-mount.ts`, `app-scene.tsx` and `scenario.ts`/`app-scenario.ts` (`noWebgl` param).
- Create `src/client/visual-test/crowd.ts`.
- Tests go in `tests/visual/`.

**Interfaces:**
- `page.screenshot({ path, timeout: options.timeoutMs })`.
- `--no-webgl` (targets `town` and `app` only):
  - Chromium launches without the ANGLE/SwiftShader args, with `--disable-webgl` and `--disable-3d-apis`. The harness URL gets `noWebgl=true`.
  - `mountAndSettleTown` then creates no renderer. It mounts with `mountTown(container, store, { reducedMotion, palette })`.
  - It requires `view.isWebGLSupported() === false` and a `.town-fallback-container[role="status"]` element in the container. Otherwise it returns `{ status: 'error', error: 'no-webgl: ...' }`.
  - Ready state: `{ status: 'ready', renderer: 'fallback', webgl: false, palette, width, height }`. The pixel count is skipped.
- `--target crowd --citizen-height <n> [--palette] [--reaction-ms]`:
  - URL `?scene=crowd&height=…&palette=…&reactionMs=…&seed=…`. Height must be a finite number with 0.5 ≤ h ≤ 6.
  - `runCrowd(search, container)` does the following in order:
    1. Installs the virtual clock and creates the renderer (`preserveDrawingBuffer`).
    2. Calls `createCrowdComparison({ container, renderer, palette, height })`.
    3. Awaits `whenReady()` (a rejection is an error; nonempty `degraded` gives `degraded-assets:`).
    4. Fails unless `instances === 30`, with `count-mismatch: requested 30 citizens, scene reports N`.
    5. Calls `setTime(reactionMs)`, then `measureCanvas`/`readyVerdict`.
    6. Publishes `{ status: 'ready', scene: 'crowd', height, palette, instances, metrics, width, height, distinctColors }` and disposes.
  - Name clash: the image height is `height` in existing states, so the citizen height goes in `citizenHeight`.
- `--target` accepts `crowd`. `--citizen-height` without `--target crowd` throws.

- [ ] Tests:
  - Args: crowd parse and URL, bad heights, `--no-webgl` URL and target restriction.
  - Crowd: with a fake module returning `instances: 29`, `runCrowd` yields count-mismatch. Inject the module the same way `architecture-sample.ts` takes a module.
  - Town-mount no-webgl: a fake view with `isWebGLSupported() === true` gives an error.
- [ ] Implement. Run `npm run test -- tests/visual`.
- [ ] Captures:
  - `--target town --no-webgl` and `--target app --screen match --no-webgl`: ready with the fallback shown.
  - `--target crowd --citizen-height 3.29 --reaction-ms 0`: ready, `instances: 30`, metrics present.
  - The default 6000 ms town capture completes.
- [ ] Commit `visual: no-webgl fallback, crowd comparison target, screenshot timeout`.

### Task 4: Rejected-name join flow

**Files:** modify `scripts/visual/args.ts`, `app-screens.ts`, `capture.ts`; tests in `tests/visual/`.

**Interfaces:**
- `--player-name <text>`, `--paper-name <text>` and `--correct-player-name <text>`. Valid only with `--target app --screen lobby`.
- `openLiveScreen` fills the given names (defaults stay `Ada` / `The Morning Bell`), selects Red and clicks Claim Printing Press. That is the create-room path.
- With a name flag given, it waits for `[data-testid="join-error"]` or `[data-testid="lobby-screen"]`, whichever comes first.
  - If the error appears and `--correct-player-name` is set, it records the error text, fills the corrected name, resubmits and waits for the lobby.
  - If the error appears and no correction is set, the capture is of the error state.
- `state.join` records the outcome: `{ outcome: 'rejected' | 'accepted' | 'corrected', error: string | null, entry: 'createRoom' }`.

- [ ] Test the args validation. The flow itself is browser-only and is proven by captures.
- [ ] Captures:
  - An accepted name reaches the lobby, with `outcome: accepted`.
  - A server-rejected name shows the banner. Until Codex Task 3 enforces the filter, use a name the server already rejects, if any. Otherwise record that the FILTERED copy can only be captured after Codex Task 3.
  - The corrected-name run reaches the lobby with `outcome: corrected`.
- [ ] Commit `visual: rejected and corrected name join captures`.

### Task 5: Interface note, evidence, return

- [ ] Update `presentation-interface.md` §5:
  - palette forwarding and the live-screen rule
  - bubble expiry is now on frame time (the known gap is closed)
  - `--no-webgl`
  - the crowd target
  - the join flags
  - screenshot timeout
  - architecture `town` framing matches production
- [ ] Run `npm test`, `npm run typecheck`, `npm run lint` and `npm run build`. Check that `git diff --name-only 41c40e3..HEAD` shows Claude paths only.
- [ ] Crowd comparisons (palette B, 1280×720, `--reaction-ms 0`): heights 3.29, 2.4, 1.8 and 1.5, into `/home/agent/projects/game/.superpowers/shots/D2-claude/`. Open every PNG. Record the sidecar metrics.
- [ ] Commit the docs. Return the branch, commit and caller/test list to the user for Codex.
