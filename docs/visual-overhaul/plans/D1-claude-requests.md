# D1 Claude requests — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the three Claude-owned changes that Codex's D1 plan requests: `MaterialKit.preserve`, a palette `wood` role, and wiring of the architecture capture to Codex's rendering sample. Record them in the presentation-interface note.

**Architecture:** These are type and palette additions in `src/client/visuals/`, role swaps in the C2 pieces, and a harness change. The architecture capture uses Codex's `createRenderingSample` when that file exists, found through `import.meta.glob` the way `inspect.ts` finds the inspection scene. Otherwise it keeps the C2 preview path. Each sidecar says which renderer produced the image.

**Tech Stack:** TypeScript (strict), Three.js 0.186, Vitest, existing `playwright-core` capture. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-14-visual-overhaul-design.md` §8, §11 "Handoff decisions", §13 (D1 row). Requests: `docs/visual-overhaul/plans/D1.md` on `codex/visual-d1` `b7810b4`, "Claude requests" 1–4. Interface: `docs/visual-overhaul/presentation-interface.md`.

**Branch:** `claude/d1-requests` from local `main` `68e66e3`, in worktree `.worktrees/d1-requests`. The main checkout is Codex's `codex/visual-d1` with uncommitted work, and it is not touched.

## Decisions (Claude's acknowledgment, relayed 2026-10-19)

- `preserve(source)` throws an `Error` naming an unsupported material class. The kit owns the converted material; `AssetSource` keeps owning the source. No C2 piece calls `preserve` yet (`hybrid-original` stays raw), so nothing else changes in the pieces.
- `town.wood`: a `0x8a5a3c`, b `0x7a5236`, c `0x9a6a42`. Bark, doors, bench legs, newsstand posts and the stand-in trunk use `wood`. Gas-lamp parts stay on `roof` (painted iron).
- The harness passes `reactionMs` to `setTime` and `reducedMotion` to the sample. The sidecar records `renderer: 'sample' | 'preview'`. The preview path is removed once Codex's sample merges; that removal is not part of this plan.

## Global Constraints

- Claude paths only: `src/client/visuals/`, `src/client/town/architecture/`, `src/client/town/props/`, `src/client/visual-test/`, `scripts/visual/`, `tests/town/architecture/`, `tests/town/props/`, `tests/visual/`, `tests/visuals/`, `docs/visual-overhaul/`. Never `src/client/town/{materials,sample}.ts`, `src/client/town/assets/*` or `ASSETS.md`.
- `src/shared/` is untouched. Paper colors and `COLORS` are unchanged.
- Existing CLI flags keep working. `--target architecture` without the new flags still captures.
- Themed colors live only in `palette.ts`. No hex literals in pieces.

## Review Focus

1. **The sample entry is missing** (before Codex merges): the capture still works through the preview path and records `renderer: 'preview'`. Pinned in Task 3.
2. **The sample reports `degraded`** or `whenReady()` rejects: the capture fails with `degraded-assets: …` or the rejection message, and never publishes `ready`. Pinned in Task 3.
3. **`reactionMs` of 0** still draws one frame; `setTime(0)` is called. Pinned in Task 3.
4. **Palettes b and c**: bark and doors stay brown, not the roof accent. Pinned in Task 1.
5. **A `MaterialKit` without `preserve`** (an old fake or the preview kit) no longer typechecks, so every implementation is updated. Covered by `npm run typecheck` in Task 2.

---

### Task 1: Palette `wood` role

**Files:**
- Modify: `src/client/visuals/palette.ts` (`town` type and three variants), `src/client/town/architecture/bakery.ts:51,61` (door), `src/client/town/props/street.ts:22,31,38,42` (newsstand posts, bench legs), `src/client/town/props/nature.ts:13,31,34` (bark role, stand-in trunk)
- Test: `tests/visuals/palette.test.ts`, `tests/town/architecture/bakery.test.ts`, `tests/town/props/props.test.ts`

**Interfaces:**
- Produces: `PresentationPalette['town'].wood: number`, plus `NATURE_MATERIAL_ROLES.woodBark === 'wood'`.

- [ ] **Step 1: Write failing tests.**
  - `palette.test.ts` › `every variant has a brown wood distinct from its roof`: for each id, `wood` equals the decided value (a `0x8a5a3c`, b `0x7a5236`, c `0x9a6a42`) and is not equal to `roof`.
  - `bakery.test.ts` › `door is wood`: `(door.material)` is the kit material recorded for `palette.town.wood`. In the fake kit, look up the `surfaces` entry whose returned material is the door's.
  - `props.test.ts`: change the `woodBark` expectation to `'wood'` and `palette.town.wood`. Add `bench legs are wood`: the recorded hexes for `bench` include `palette.town.wood`.
- [ ] **Step 2:** Run `npm run test -- tests/visuals tests/town/architecture tests/town/props`. Expected: the new assertions FAIL.
- [ ] **Step 3:** Implement. Update the `nature.ts` comment and remove the "no wood color" note.
- [ ] **Step 4:** Rerun. Expected: PASS. Then run `npm run typecheck`. Expected: exit 0. Codex code does not read `town`, so nothing else changes.
- [ ] **Step 5:** Commit `visuals: palette wood role for bark, doors and benches`.

### Task 2: `MaterialKit.preserve`

**Files:**
- Modify: `src/client/visuals/town-types.ts` (`MaterialKit`), `src/client/visual-test/preview-kit.ts`, `tests/town/architecture/fake-context.ts`
- Test: `tests/visual/preview-kit.test.ts` (new)

**Interfaces:**
- Produces, added to `MaterialKit` (doc comment copied into note §2):

```ts
/**
 * Toon version of a loaded material that keeps its base-color map, alpha, side and vertex colors.
 * Cached per source; the kit owns and disposes the result, the AssetSource keeps owning the source.
 * Throws an Error naming the class for unsupported materials; never flattens silently.
 */
preserve(source: THREE.Material): THREE.Material;
```

- The preview kit's `preserve` throws `preview kit does not convert materials: <type>`, because it stands in only for C2 captures. The fake context's `preserve` records the source and returns a `MeshBasicMaterial`.

- [ ] **Step 1: Write the failing test** `preview kit preserve refuses clearly`: `createPreviewKit(0).preserve(new THREE.MeshStandardMaterial())` throws `/preview kit does not convert materials: MeshStandardMaterial/`.
- [ ] **Step 2:** Run `npm run test -- tests/visual/preview-kit`. Expected: FAIL (`preserve` is not a function).
- [ ] **Step 3:** Implement the type, the preview kit and the fake context.
- [ ] **Step 4:** Rerun, then run `npm run typecheck`. Expected: PASS and exit 0.
- [ ] **Step 5:** Commit `visuals: MaterialKit.preserve for atlas-keeping toon materials`.

### Task 3: Architecture capture uses Codex's rendering sample

**Files:**
- Modify: `src/client/visual-test/architecture-scenario.ts` (add `reactionMs`, `reducedMotion`), `src/client/visual-test/architecture.ts` (sample path and existing preview path), `src/client/visual-test/state.ts` (`renderer` field on the architecture ready state), `scripts/visual/args.ts` (`harnessPath` passes `reactionMs` and `reducedMotion` for `architecture`)
- Create: `src/client/visual-test/architecture-sample.ts` (loads and drives the sample, keeping `architecture.ts` under 300 lines)
- Test: `tests/visual/architecture-scenario.test.ts`, `tests/visual/args.test.ts`, `tests/visual/architecture-sample.test.ts` (new)

**Interfaces:**
- `ArchitectureScenario` gains `reactionMs: number` (default 0, 0–600000) and `reducedMotion: boolean` (default false; `'true'` or `'false'`, otherwise throws `reducedMotion must be true or false`).
- The architecture ready state gains `renderer: 'sample' | 'preview'`.
- Structural copy of Codex's entry point (D1 plan, "Codex creates"):

```ts
interface RenderingSampleModule {
  createRenderingSample(options: {
    container: HTMLElement; renderer: THREE.WebGLRenderer; palette: PresentationPalette;
    variant: ArchitectureScenario['variant']; view: ArchitectureScenario['view']; reducedMotion?: boolean;
  }): { whenReady(): Promise<SceneReadiness>; setTime(ms: number): void; dispose(): void };
}
```

- `architecture-sample.ts` exports `runRenderingSample(module: RenderingSampleModule, scenario: ArchitectureScenario, container: HTMLElement, renderer: THREE.WebGLRenderer): Promise<VisualState>`. Order: create the sample → await `whenReady()` (a rejection becomes `{ status: 'error', error: message }`) → nonempty `degraded` gives `degraded-assets: a; b` → `setTime(scenario.reactionMs)` → measure → publish with `renderer: 'sample'`.
- `architecture.ts` checks `import.meta.glob<RenderingSampleModule>('../town/sample.ts')`. If the entry exists, it calls `runRenderingSample`. Otherwise it runs the existing preview scene, unchanged, with `renderer: 'preview'`.
- `harnessPath` for `architecture` appends `reactionMs` and `reducedMotion` to the existing query.

- [ ] **Step 1: Write failing tests.**
  - `architecture-scenario.test.ts`: the defaults now include `reactionMs: 0, reducedMotion: false`; `?reactionMs=1000&reducedMotion=true` is read; `reducedMotion=yes` throws.
  - `args.test.ts`: the path for `--target architecture --variant hybrid-original` is `…&seed=1&reactionMs=6000&reducedMotion=false`. `--reaction-ms 1000 --reduced-motion` gives `reactionMs=1000&reducedMotion=true`.
  - `architecture-sample.test.ts` (jsdom, fake module, `measureCanvas` mocked with `vi.mock('../../src/client/visual-test/pixels.ts', …)` to return 500 colors):
    - `awaits readiness, then sets the exact time`: `setTime` is called once with `scenario.reactionMs`, after `whenReady` resolved.
    - `reaction time 0 still sets time`: `setTime(0)` is called.
    - `degraded fails the capture`: `{ degraded: ['x'] }` gives `{ status: 'error', error: 'degraded-assets: x' }`, and `setTime` is never called.
    - `rejected readiness fails with its message`.
    - `passes palette, variant, view and reducedMotion through`.
    - `publishes renderer sample`.
- [ ] **Step 2:** Run `npm run test -- tests/visual`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Rerun. Expected: PASS. Then `npm run capture -- --target architecture --out <scratch>/pre-sample.png` exits 0, its sidecar shows `renderer: 'preview'`, and the PNG is byte-identical to the C2 `arch-code-a.png` (the preview path is unchanged).
- [ ] **Step 5:** Commit `visual: architecture capture drives Codex's rendering sample when present`.

### Task 4: Interface note, acknowledgment, checks

**Files:**
- Modify: `docs/visual-overhaul/presentation-interface.md` (§1 `wood` in the type block and the role note; §2 `preserve`; §5 architecture flags `--reaction-ms` and `--reduced-motion`, the `renderer` sidecar field, and the order; §6 acknowledgment row)

- [ ] **Step 1:** Edit the note. Add a §6 row: "Claude | `codex/visual-d1` `b7810b4` D1 plan | — | 2026-10-19 | Accepted Claude requests 1–4 with the decisions in `plans/D1-claude-requests.md`; delivered on `claude/d1-requests`." Add a "Codex: pending acknowledgment of this delivery" line.
- [ ] **Step 2:** Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`. Expected: all exit 0. Run `git diff --name-only main...HEAD`. Expected: only Claude paths.
- [ ] **Step 3:** Commit `docs: presentation interface D1 extensions and acknowledgment`. Write the relay text for Codex (branch, commits, what to consume) in the final message.

## Expected output

- 4 to 5 commits on `claude/d1-requests`.
- A `wood` role across all palettes and pieces.
- `MaterialKit.preserve` in the type and in every implementation.
- The architecture capture ready for Codex's sample, with a `preview` fallback that is byte-identical to C2.
- Note §1, §2, §5 and §6 updated.
- No Codex files touched.
