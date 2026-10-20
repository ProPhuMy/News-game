# D2 user art decision: height 1.8 and remaining Claude integration

The user chose the 1.8 comparison and explicitly asked to record its screenshot/settings in the interface note, coordinate Claude's reference-height update, then finish clearance, town acceptance and server validation. D2 remains incomplete until required checks and counterpart review pass.

## Required Claude-owned updates

1. Reopen/update presentation-interface.md §5b: approved visible idle body height is **1.8 world units before the cap**, replacing 3.29. This approves the character scale/readability shown, not the old preview spacing or outstanding clearance checks.
2. Change `CITIZEN_REFERENCE_HEIGHT` in `src/client/town/architecture/piece.ts` from 3.29 to 1.8 and update any owned assertions. Keep all clearance radii and map data unchanged.
3. Record the approved reference:
   - `.superpowers/shots/D2/crowd-1.8-b.png` and its `.png.json` sidecar, captured on Codex's combined delivery before reference-height changes.
   - `npm run capture -- --target crowd --citizen-height 1.8 --palette b --reaction-ms 0 --timeout-ms 240000 --out .superpowers/shots/D2/crowd-1.8-b.png`.
   - Palette B, seed 1, 1280×720, thirty real rigs, idle time 0; approved toon/outline/shadow settings. Fixed 55-degree camera, FOV 45, distance 30, target at office node 1 plus (-2, 0, -2). Existing preview rows 1.7 × 1.15; production spacing remains separately validated.
   - Body-only idle-cycle bounds at this height: approximately 1.960415 wide × 1.833416 high × 1.174710 deep. Hidden meshes, hats, paper and outline meshes are excluded from these body-only bounds. Hat-inclusive bounds are checked separately.
4. Return commit ID and counterpart acknowledgment. Codex must consume your change rather than write another production height constant.

## Height delivery consumed

Claude commit `214eac2` is merged in Codex commit `c58a94b`. The four Claude files remain unchanged. The interface records the approved PNG SHA-256 `9c9a3403e22aa3ec3dd1e5ffdef6090d09206b99f89c971f8cd041506643c688`. No further height change is requested.

## Shared capture support for revised spacing

Codex has implemented an optional `layout?: 'comparison' | 'production'` input to `createCrowdComparison`. Default `comparison` keeps the approved screenshot reproducible. `production` uses Codex's actual clearance allocator at the requested height, still with thirty citizens at the same office. Please forward an optional `--crowd-layout comparison|production` through the crowd harness, defaulting to comparison. Include the selected layout in scenario/sidecar. Codex owns the allocator and scene; Claude owns the CLI/harness and tests.

The suggested `townFrameBounds(group, layout)` export is now available from `src/client/town/index.ts`; your architecture harness can consume it instead of maintaining a copy.

No request to change gathering radius 5, ordinary-node radius 3.5, road half-width 2.0, routes, fixtures or shared gameplay contracts. Name captures wait for Codex's server validation after town acceptance.

## Remaining acceptance interaction

The approved D2 plan also requires a real context-loss/restoration capture. The current shared CLI has no context-cycle option. Please provide a minimal harness interaction that loses the actual WebGL context, verifies fallback/cleared overlays, restores it, awaits readiness and advances the virtual clock for a nonempty restored frame. Codex's existing context-loss unit checks pass; they do not replace this browser evidence. Keep this in Claude-owned capture files, without a separate screenshot stack.
