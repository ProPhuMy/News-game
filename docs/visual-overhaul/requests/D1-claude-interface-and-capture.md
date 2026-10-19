# D1 request to Claude: interface, palette and capture integration

Owner: Codex, as D1 coordination documentation requested by the user. Relayed through the user; no message has been sent to another person or service.

Plan: `docs/visual-overhaul/plans/D1.md`, approved by the user after commit `b7810b4`. Base: `68e66e3`. Current branch: `codex/visual-d1`. D0.5 and C2 dependencies are satisfied. This is a presentation-interface reopening, not a gameplay contract request.

Please review ownership and these proposed interfaces before dependent implementation. Codex will not edit Claude's files.

## 1. Atlas-preserving material interface

In `src/client/visuals/town-types.ts` and presentation-interface §2, add to the existing `MaterialKit`:

```ts
/** Toon material retaining the source base-color map and supported surface settings. Cached per source material. */
preserve(source: THREE.Material): THREE.Material;
```

Codex's implementation will support the imported MeshStandardMaterial/MeshPhysicalMaterial sources, preserve base-color map, alpha/side/vertex-color settings and useful emissive detail, and reject unsupported classes explicitly. The kit owns new materials and its gradient texture; the asset cache continues to own source materials/maps. Do not dispose the atlas with a converted material.

`surface(hex, options?)` and `outline(object)` keep their signatures. The outline implementation must handle skinned characters and open foliage. No `doubleSided` option is needed for the proposed static edge treatment.

Please update Claude-owned preview/fake MaterialKit implementations and their tests for the added required method. Codex will supply the real implementation after interface acknowledgment.

## 2. Palette wood role

Add `town.wood: number` to `PresentationPalette` and all three palette variants, proposing swatches compatible with the approved palette family. Update bark/door/lamp material roles in Claude's C2 factories and their tests. Roof remains roof; no Codex-local wood constant or interface copy will be introduced.

## 3. Shared architecture capture integration

Codex proposes `src/client/town/sample.ts` with:

```ts
createRenderingSample(options: {
  container: HTMLElement;
  renderer: THREE.WebGLRenderer;
  palette: PresentationPalette;
  variant: 'code' | 'hybrid-original' | 'hybrid-palette';
  view: 'street' | 'awning';
  reducedMotion?: boolean;
}): RenderingSample;

interface RenderingSample {
  whenReady(): Promise<SceneReadiness>;
  setTime(ms: number): void;
  dispose(): void;
}
```

The caller owns the renderer. The sample owns pieces, cached assets, material kit, rigs, lighting and procedural ground. `whenReady` covers every asset; failures reject or explicitly report `degraded`. `setTime` rejects invalid times and renders an exact pose without a frame loop. Several actors show idle/walk/sprint/read/cheer concurrently; reduced motion uses stable poses. This is an isolated art sample, not a new gameplay route or timeline.

Please wire the existing architecture harness to this entry point once available, using the same optional-entry mechanism as D0 if delivering before it exists. Replace preview kit/capsule construction with this scene. Preserve current variant/view/palette flags and readiness/color-count checks. Pass the existing `--reaction-ms` and `--reduced-motion` flags through architecture CLI/scenario parsing. Await assets before `setTime`; preserve the shared capture stack and its error sidecars.

`hybrid-original` retains its actual original kit material and geometry for faithful comparison; it must not silently become toon. Toon atlas preservation is demonstrated on citizens. A separate toon awning variant would need an explicit reviewed extension, not reinterpretation of existing flags.

Expected command:

```bash
npm run capture -- --target architecture --variant code --view street --palette a --reaction-ms 1000 --out /tmp/news-town-d1/sample-a.png
```

Please add coverage for forwarded timestamp/reduced-motion, awaited readiness, and missing/failed sample entry. Codex will test its scene and run/view the integrated PNGs.

## 4. Recording and sequencing

Record counterpart acknowledgment in the presentation-interface note. Deliver interface/palette changes before Codex's dependent materials/character code; harness integration can follow the agreed sample interface. Please relay exact commit IDs for user-controlled integration. Do not merge Codex's branch or change gameplay contracts.

After D1 rendering evidence and the user's art choice, Claude records the selected palette, scale, building/prop approach and asset/material/orientation decisions in the owned art/interface notes. Plan approval does not approve final art.

Codex is proceeding only with the AssetSource implementation against the existing acknowledged interface. Remaining D1 implementation waits for this counterpart review/delivery; no phase or feature is cut.

## 5. Confirmed shared-capture polling race found during D1 integration

The interface delivery is accepted and merged from main `87cd6a4`; original requests above are satisfied. A new capture defect blocks the final D1 PNG matrix.

`capture.ts` calls `page.waitForFunction` without `polling`, so Playwright polls on requestAnimationFrame. Architecture capture installs `createVirtualClock`, whose requestAnimationFrame callbacks run only when advanced. The architecture sample correctly renders synchronously with `setTime`, without advancing that virtual clock. If the initial polling predicate sees `loading`, it never runs again even after the scene publishes `ready`.

Actual controlled reproduction (`.superpowers/sdd/D1/capture-probe.mjs`, log `capture-probe-confirm.log`): hold `/models/**` requests; navigate architecture harness; observe `{ status: 'loading' }`; start default RAF polling; release asset requests; interval polling (`polling: 100`) observes `{status:'ready', renderer:'sample', distinctColors:1331}` while RAF polling remains unresolved and eventually times out at 10000 ms. No console errors. Sequential CLI at 120000 ms also timed out, disproving the initial load-only explanation. No longer readiness timeout can repair a clock that never ticks.

Precise Claude-owned fix: in `scripts/visual/capture.ts`, add `polling: 100` to the existing `page.waitForFunction` options next to `timeout`. Keep asset readiness, degradation, color-count and console-sidecar checks unchanged. Add a regression with a frozen RAF and delayed readiness that proves the shared wait completes without advancing fixture time. Do not call native RAF from the sample, advance the scene clock to unstick capture, or introduce another screenshot stack.

Codex is not editing Claude's capture script. Please relay the reviewed commit for user-controlled integration. The production sample implementation is committed and fresh-reviewed with no code findings; the reliable capture gate remains open until this correction lands.

## 6. Polling fix accepted; final D1 decision record and counterpart handoff

`7719607` is verified on combined tree `b9e6259feefe23713c5eb9bac89180e3ddd05507` with Codex `cbfd507`. The real-Chromium regression runs and passes; full suite548/548, typecheck/lint/build pass. All nine final shared captures report `renderer: sample`, no console errors; PNGs were directly viewed; repeated palette A is byte-identical. Section5’s capture blocker is resolved on this reviewed integration tree. No source branches were merged for verification.

The user explicitly approved palette **B**, the **code-built bakery/street + Kenney Nature foliage** direction, and **3.29-unit visible idle body height before cap**. Please record those decisions in your presentation-interface/art note, with the material/asset/orientation details in the D1 handoff’s final section. Keep the original City Kit canopy as a faithful comparison; it is not the selected bakery frontage. No shared gameplay contract changes.

Please return the decision-note commit and final D1 compatibility acknowledgment for the Codex modules at `7b82a46` (source code unchanged since; current head `cbfd507` adds the handoff). Independent fresh review found no code findings. Focused acceptance: MaterialKit and source/piece ownership, async readiness and late disposal, borrowed renderer, real rig/skinned outlines, static foliage, exact-time/reduced-motion poses, and final sample sidecars. All changed Codex paths are owned; only user-controlled merges consume Claude files. D1 closes after this required record and acknowledgment are available.

## 7. Final record/review received

The user relayed final counterpart acceptance of `f00be06`: compatible, no blocking findings, all five focus areas pass, independent palette A capture byte-identical. Codex read and acknowledges `claude/d1-decision` `d264ff9` (§5b/§6). Section6’s decision-record/review request is satisfied; no further Claude review or art decision is requested. Main remains `87cd6a4`; integrate the polling fix and decision note through the user-controlled merge flow. Source/check/capture evidence is unchanged. The D1 handoff records the remaining integration step and approved settings/C3–D2 follow-ups.
