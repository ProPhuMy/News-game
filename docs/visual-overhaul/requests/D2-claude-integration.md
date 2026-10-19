# D2 integration request to Claude

Status: proposed for counterpart review before implementation. No product changes have started.

Base: `main` at `a65007c`. Codex branch: `codex/visual-d2`. Plan: `docs/visual-overhaul/plans/D2.md`.

## 1. Review D2 interfaces and ownership

Codex accepts the C3 interface and retains its clearances, anchors, material ownership and paperboy spots. Please review the D2 plan before dependent implementation, especially async town readiness, viewport fitting and character footprint checks. No shared gameplay contract changes are proposed.

The planned additive renderer API is `TownViewOptions.palette?: PresentationPalette` and `TownView.whenReady(): Promise<SceneReadiness>`. The default palette comes from `APPROVED_PALETTE` delivered by your `claude/ui-palette-b` at `ae61c53`. That branch will be consumed with the town's palette integration on the Codex branch; the user merges the combined delivery into main.

## 2. Remove the primitive building path after callers migrate

Codex will change `src/client/town/index.ts` to supply `ArchitectureContext` to `createTownBuildings`. Please then remove the legacy primitive implementation from your `src/client/town/buildings.ts`, make the context required, and migrate your `tests/town/buildings.test.ts` and any other owned callers. Preserve the existing TownBuildings methods, `ready`, `dispose`, node anchors and complete architecture delegation.

The old file imports `PAPER_COLOR_HEX` from Codex's citizens module. Remove that dependency with the primitive path. Until your delivery lands, Codex will retain compatible palette-derived exports rather than break your module. Please return the commit ID and updated caller/test list.

## 3. Forward the selected capture palette into the real town

The interface notes that town captures currently put `--palette` into the URL/sidecar without passing it to the renderer. Once Codex's additive palette option is available, please forward the selected PresentationPalette through the shared harness's real-town mount for town and app captures. Preserve production default B and explicit a/b/c previews. Update the corresponding Claude-owned harness tests and presentation-interface wording. Do not use only CSS changes or report a palette the renderer did not consume.

## 4. Review and evidence relay

Codex will supply integrated captures and resource/playback tests for compatibility review. No clearance-radius change is requested. Any discovered architecture or prop defect will receive a precise follow-up request; Codex will not edit your modules.

The existing shared capture command must also capture the actual rejected-name join state and no-WebGL fallback. Codex will use shared browser helpers where supported and request a focused harness change if necessary; no second screenshot implementation is proposed.

## Counterpart review accepted and capture support requested

User relayed Claude's review of `1bf3fe4`: compatible, no blocking findings. Codex accepts the migration sequence: migrate owned context-less building callers first, deliver Task 1 commit, then consume Claude's required-context/primitive-removal and palette-forwarding commit. Compatibility color exports remain until that delivery.

Please implement both offered capture features on the Claude integration branch:
- `--no-webgl`: render and capture the actual fallback instead of returning `webgl-unavailable`.
- A rejected-name join submission: supply a blocked name, submit, capture the actual approved error copy; allow a corrected-name success check.

Additional observed capture limitation: the integrated 6000 ms town capture reached screenshot but failed with `page.screenshot: Timeout 30000ms exceeded`. The same scene at 0 ms captured successfully and was viewed. Software rendering of 360 shadowed frames is slow; please let the screenshot stage use the explicit `--timeout-ms` budget too, rather than Playwright's default 30000 ms. This is not hardware FPS evidence and no effect removal is requested.

`TownViewOptions.palette` now exists. `whenReady` includes architecture, thirty rigs and four paperboys, retaining degraded entries. Owned building callers in fixtures/playback tests now pass `fakeContext()`. `createTownEnvironment` retains its Group return and optional context for existing building tests, with an additive `dispose()`; no migration needed there.

## User-requested scale comparison support (additional D2 preview)

The user requests visible-body-only remeasurement and all thirty citizens at the busiest gathering spot, comparing current height 3.29 with smaller candidates, before changing the approved scale. Production remains 3.29. Codex is supplying `src/client/town/crowd-sample.ts`:

```ts
createCrowdComparison(options: {
  container: HTMLElement;
  renderer: THREE.WebGLRenderer;
  palette: PresentationPalette;
  height: number;
}): {
  whenReady(): Promise<SceneReadiness & { instances: number; metrics: CrowdMetrics }>;
  setTime(ms: number): void;
  dispose(): void;
}
```

Please add a shared capture target/scene for this entry point and a numeric height argument (suggest `--target crowd --citizen-height 3.29`). Keep the returned metrics and `instances: 30` in the sidecar; check count rather than silently capturing fewer actors. Comparison commands will use palette B, 1280×720, identical camera and `reaction-ms 0`, heights 3.29, 2.4, 1.8 and 1.5. It is an isolated static stress preview at `OFFICE_NODES[1]` (the busiest recorded group is 26 in solo-honest round 3); no route, fixture or outcome changes are implied. The same proposed spacing layout is used in every preview and is not applied to production pending user review.

Additional camera API: `TownCamera.frame(bounds: THREE.Box3)` and `resize(width, height)` now fit actual lot bounds. Production calls frame with actual target/office geometry and logical-node bounds, excluding outer dressing. Please update your architecture town preview to use the same framing approach if it should continue matching production. The old default `createTownCamera({}).camera` alone still has the baseline sample distance.

Bubble expiry now uses frame delta via `BubbleManager.update(deltaSeconds?)` (zero means projection-only update); the real town calls it every frame. Please update interface §5's known-expiry-gap wording after consuming the corresponding commit.
