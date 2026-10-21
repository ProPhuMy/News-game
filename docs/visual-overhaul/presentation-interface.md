# Presentation interface (owner: Claude)

Status: acknowledged by Claude and Codex (C0). **Reopened in C3 (§3, §4, §5, §5b); Codex acknowledged at `ed4ca7f` (2026-10-19).** Reopen explicitly if compatibility changes. Source: overhaul design §11 "Handoff decisions". Base commit: `main` `3c02902` (bootstrap merged); branch `claude/c0-foundation`.
This is a presentation interface, not a gameplay contract. `src/shared/` is unchanged.

## 1. Palette (shared by CSS and 3D)

- Module: `src/client/visuals/palette.ts` (owner Claude; created in C1, extended at D1).
- Semantic paper colors stay the shared ids `COLORS = ['red', 'blue', 'green', 'gold']` from `src/shared/ids.ts`. Their non-color cue stays `COLOR_ICONS`.

```ts
import type { Color } from '../../shared/ids.ts';

export type PaletteId = 'a' | 'b' | 'c'; // the three D1 sample variants; renamed once the user chooses

export interface PaperSwatch {
  hex: number;   // for Three.js materials
  css: string;   // for CSS, e.g. '#c0392b'
  label: string; // readable name for the non-color cue, e.g. 'Red'
}

export interface PresentationPalette {
  id: PaletteId;
  ui: { paper: string; ink: string; panel: string; border: string; accent: string; danger: string; focus: string };
  town: { ground: number; road: number; plaza: number; foliage: number; brick: number; trim: number; roof: number; wood: number; outline: number; sky: number; fog: number; lampGlow: number };
  paper: Readonly<Record<Color, PaperSwatch>>;
  unsubscribed: PaperSwatch;
}

export const PALETTES: Readonly<Record<PaletteId, PresentationPalette>>;
export function getPalette(id: PaletteId): PresentationPalette;
/** Sets --nt-* CSS custom properties on root (UI tokens derive from the same palette object). */
export function applyPaletteCssVariables(root: HTMLElement, palette: PresentationPalette): void;
```

- Rule: themed colors live only in `palette.ts`. `PAPER_COLOR_HEX` and `PAPER_GREY_HEX` in `src/client/town/citizens.ts` (Codex) move to `palette.paper[color].hex` and `palette.unsubscribed.hex` during D1/D2.
- **C1 (implemented):** `palette.ts` exists with the shapes above, plus one additive export, `paletteCssVariables(palette): Readonly<Record<string, string>>`. It is the pure map of `--nt-*` names to values that `applyPaletteCssVariables` uses, so the capture command can apply a palette outside the browser. The UI applies palette `a` at startup (`src/client/main.tsx`). Variants are previews; variant `a` keeps today's paper hexes, so UI and town agree until D1/D2. The `town` values are first proposals for D1.
- **D1 (Claude delivery, `claude/d1-requests`):** `town.wood` added to all variants (a `0x8a5a3c`, b `0x7a5236`, c `0x9a6a42`). C2 bark, doors, bench legs, newsstand posts and the stand-in trunk use `wood`; gas-lamp parts stay on `roof` (painted iron).
- The screenshot command has `--palette a|b|c` (C1); its default is `APPROVED_PALETTE` (b). **D2 (Claude, `claude/d2-integration`):** harness town and app captures (`--target town`, harness `--target app` screens) forward `getPalette(id)` through `TownViewOptions.palette`, and the sidecar's `state.palette` is the palette the town factory actually received (a missing palette fails the capture). The architecture views and the crowd target do not use `TownViewOptions`; they build their own context from `getPalette(id)`. No-WebGL fallback captures report no `palette`, because the fallback view never consumes one. Live screens (`home`, `join`, `lobby`) run the production app, which always uses `APPROVED_PALETTE`; any other `--palette` is rejected there.

## 2. Materials on imported meshes

- Codex owns toon materials, outlines, lighting, and shadows (`src/client/town/`).
- Claude's building and prop modules never create lit materials themselves. They receive a `MaterialKit` and call it.

```ts
// src/client/visuals/town-types.ts (owner Claude; type only)
import type * as THREE from 'three';
import type { PresentationPalette } from './palette.ts';

export interface MaterialKit {
  /** Toon-shaded surface for a palette color; Codex caches one material per color and options. */
  surface(hex: number, options?: { emissive?: number }): THREE.Material;
  /** Adds the outline treatment to every mesh under object (Codex decides the technique). */
  outline(object: THREE.Object3D): void;
  /**
   * Toon version of a loaded material that keeps its base-color map, alpha, side and vertex colors.
   * Cached per source; the kit owns and disposes the result, the AssetSource keeps owning the source.
   * Throws an Error naming the class for unsupported materials; never flattens silently.
   */
  preserve(source: THREE.Material): THREE.Material;
}
```

- **D1 (reopened, `claude/d1-requests`):** `preserve` added for atlas-keeping toon materials. No C2 piece calls it yet; `createBakeryHybrid(ctx, 'original')` keeps the raw kit material for faithful comparison. The harness preview kit's `preserve` throws (it is a C2 stand-in).
- Ownership: Codex's `MaterialKit` owns and disposes every material it returns (when the town view is disposed). Codex's `AssetSource` owns and disposes cached geometries and textures. Building and prop pieces never dispose either.

## 3. Building and prop factories

```ts
// src/client/visuals/town-types.ts (continued)
import type { Location } from '../../shared/ids.ts';

/** Same shape as the harness's SceneReadiness (src/client/visual-test/settle.ts). */
export interface SceneReadiness {
  /** One entry per asset that fell back to a stand-in, e.g. "bakery: models/buildings/bakery.glb failed to load". */
  degraded: readonly string[];
}

export interface AssetSource {
  /**
   * Loads a glTF from public/models/** (Codex supplies the GLTFLoader-backed implementation and its cache).
   * Every call returns a new, independent scene instance (a clone; skinned meshes cloned with SkeletonUtils),
   * so callers may move, re-parent, and re-material it freely. Geometries and textures are shared through the
   * cache and owned by the AssetSource.
   */
  loadGltf(url: string): Promise<THREE.Group>;
}

export interface ArchitectureContext {
  palette: PresentationPalette;
  materials: MaterialKit;
  assets: AssetSource;
}

export interface PlacedPiece {
  /** Root object. Origin at ground level (y = 0) in the footprint center. +Z faces the street. */
  object: THREE.Object3D;
  /**
   * Resolves when all of this piece's assets are in place. A recoverable load failure inserts a code-built
   * stand-in and is listed in `degraded`; it is never silent. An unrecoverable failure rejects.
   */
  ready: Promise<SceneReadiness>;
  /** Footprint in world units. */
  footprint: { width: number; depth: number };
  /**
   * Removes `object` from its parent and disposes only resources this piece created itself (procedural
   * geometries, its own non-kit materials and textures). Never disposes AssetSource-cached geometries or
   * textures, and never disposes MaterialKit materials.
   */
  dispose(): void;
}

export type LocationBuildingFactory = (location: Location, ctx: ArchitectureContext) => PlacedPiece;
export type PropFactory = (kind: string, ctx: ArchitectureContext) => PlacedPiece;
```

- Integration entry point stays `createTownBuildings` in `src/client/town/buildings.ts` (Claude). In C2 it becomes `createTownBuildings(layout: TownLayout, ctx?: ArchitectureContext): TownBuildings` and `TownBuildings` gains `ready: Promise<SceneReadiness>` (all pieces, `degraded` lists merged) and `dispose(): void` (disposes every piece). Its existing members stay unchanged: `group`, `getLocationAnchor`, `getOfficeAnchor`, `setOfficeHighlight`, `syncOffices`, `getOfficeBannerColor`.
- **C2 (implemented, shapes unchanged):** the types above are in `src/client/visuals/town-types.ts`, `createTownBuildings(layout, ctx?)` has `ready` and `dispose`, the sample factories are `createBakery`, `createBakeryHybrid` (comparison only) and `createProp`. D1 adopted `MaterialKit.preserve` and `town.wood` (§1, §2); open-geometry outlines remain inside Codex's `outline`.
- **C3 (implemented, shapes unchanged):** with a context, `createTownBuildings` delegates to `createArchitectureTown` (`src/client/town/architecture/town.ts`). It places every target building (`createLocationBuilding`: bakery, bank, town hall, clinic, fountain square), the four offices (`createOffice`, banners in `palette.paper[COLORS[seat]]`) and every prop in `TOWN_DRESSING` (`src/client/town/props/dressing.ts`; new code-built kinds `cart` and `flower-box`). `syncOffices` and `setOfficeHighlight` swap kit materials (`surface(hex)` / `surface(hex, { emissive: hex })`) and never mutate one. `ready` merges every piece's `degraded`. `dispose` frees every piece once; office calls after dispose do nothing. Sign boards (`BANK`, `TOWN HALL`, `CLINIC`) are pixel-font `DataTexture`s passed through `MaterialKit.preserve`; the piece owns and frees the source material and texture. The kit should live exactly as long as the buildings.
- World units: the shared grid spacing is `GRID.spacing = 12` between street nodes (`src/shared/town-map.ts`). Current citizen height is measured by Codex in D0 and recorded here.

## 4. Anchors (one representation)

- Logical destinations are shared map node ids, read only through `TownLayout`: `getLocationNode(location)`, `getOfficeNode(seatId)`, `getNodeWorldPos(nodeId)`.
- **C3 (reopened, user decision 2026-10-19):** with an `ArchitectureContext`, a building's body no longer sits on its node. It sits in the city block lot just north (−Z) of the node, front facing +Z, door nearest the node (`lotCenter` in `src/client/town/architecture/lots.ts`). The crowd stands on the street in front. The fountain square's root stays on its node (flat plaza; the basin sits in the north-east block at offset (6, −6), radius ≤ 3.3). **D2:** the context is now required and the primitive path is deleted. Decoration never moves a node, a route, or a logical destination.
- **Clearance (user decision, enforced by tests):** nothing below `HEADROOM = 3.8` stands within `GATHER_CLEARANCE = 5` of a target or office node, within `NODE_CLEARANCE = 3.5` of any other node, or within `ROAD_CLEAR = 2.0` of a street centerline. Lamps also stay out of each door's approach (door x ±2.5, façade to +5). D2's gathering rings should fit inside these radii; widening them past 5 needs this note reopened.
- **Label anchors (C3):** with a context, `getLocationAnchor` and `getOfficeAnchor` return the node x/z at `LABEL_ANCHOR_HEIGHT = 5.8` for every target and office.
- **Paperboys (user decision):** Codex places them in D2 at `PAPERBOY_SPOTS` (`src/client/town/props/dressing.ts`: four `{ x, z, rotationY }`, checked clear). Each figure must fit a 1 × 1 ground footprint; the spots have only about 0.04 of slack.
- Label anchors come from `TownBuildings.getLocationAnchor(location)` / `getOfficeAnchor(seatId)` (world `Vector3` above the node).
- Entrance offset: settled in C3 (lots above).

## 5. Screenshot command and readiness

- Command (owner Claude): `npm run capture -- --out <file.png> [--target town|app] [--fixture solo-honest] [--round 1] [--phase reveal] [--reaction-ms 6000] [--reduced-motion] [--seed 1] [--width 1280] [--height 720] [--prod] [--timeout-ms 60000]`.
- UI flags (C1, additive; town and character captures unchanged): `--screen home|join|lobby|match|loading|disconnected|error`, `--palette a|b|c`, `--stress-text`, `--tab <n>`, `--scroll <selector>`, `--block-fonts`.
  - `home`/`join`/`lobby` drive the real dev server.
  - The other screens load the dev-only UI harness `src/client/visual-test/app.html`, which renders the real `AppRouter` and town over a fixture-fed store with the virtual clock.
  - `--stress-text` renders a copy of the fixture with every name, headline and bubble at its `TUNING.limits` maximum; fixture files are never changed.
  - Every `--target app` capture waits for `document.fonts.ready` and records a `layout` check in the sidecar (`{ overflowX, unreachable }`, logic in `scripts/visual/layout.ts`). It fails when any element under `#ui-root` sticks out of the viewport sideways with no scroll path, or when no scrolling can bring a control into view. A scroll container counts only if its own box can be seen, and a clipping ancestor that cannot scroll hides what lies outside it.
  - The sidecar's `stylesheets` list also records font responses.
- Output: the PNG and `<file.png>.json` (scenario, browser version, ready state, stylesheet responses, console errors). A failed or empty capture exits 1 and leaves no PNG.
- Determinism: the harness (`src/client/visual-test/`) stubs `Date.now`, `performance.now`, `requestAnimationFrame`, `cancelAnimationFrame`, and `Math.random` (seeded). Renderer code must take time only from those sources. Measured in C0: two captures with identical inputs were byte-identical. Bubble expiry (D2, Codex `41c40e3`): `BubbleManager.update(deltaSeconds?)` expires bubbles on frame time, called every frame by the real town, so captures at a timestamp show only the bubbles alive at that time. The earlier real-time `setTimeout` gap is closed.
- Renderer-ready signal: Codex adds `whenReady(): Promise<SceneReadiness>` to `TownView` when async assets arrive (D1).
  - It covers **all** scene assets: characters, buildings, props, and environment.
  - It resolves without needing animation frames (asset loading is promise-based), because the harness awaits it before advancing the virtual clock.
  - It **rejects** on an unrecoverable initialization failure. The capture then fails with that message.
  - Recoverable fallbacks are listed in `degraded`. A nonempty list fails the capture with `degraded-assets: ...`, so a screenshot can never certify missing models silently.
- Capture order (implemented in `src/client/visual-test/settle.ts`): apply the fixture frame, mount, await `whenReady()` if present, then advance the virtual clock by exactly `reactionMs` (a value of 0 still draws one frame), then measure and publish `window.__NEWS_TOWN_VISUAL__`.
- Browser: `playwright-core` 1.63.0 with its Chromium build 1243 (software WebGL through SwiftShader). The command starts the browser without `DISPLAY` / `WAYLAND_DISPLAY`, because an inherited desktop display this account cannot open disables WebGL.
- Architecture captures: `npm run capture -- --target architecture [--view street|awning|town|bakery|bank|town_hall|clinic|fountain_square|office] [--variant code|hybrid-original|hybrid-palette] [--palette a|b|c] [--reaction-ms N] [--reduced-motion] --out <file.png>`.
  - `street`/`awning` (D1): the harness calls Codex's `createRenderingSample` (`src/client/town/sample.ts`) with a borrowed renderer, awaits `whenReady()`, calls `setTime(reactionMs)` once and measures. Sidecar `renderer: 'sample'`.
  - `town` and the close-ups (C3, `src/client/visual-test/architecture-town.ts`): Codex's `createMaterialKit` and `createAssetSource`, a palette ground slab and `STREET_EDGES` roads, `createTownBuildings(createTownLayout(), ctx)`, and the approved render settings (§5b). `town` frames like production (D2): it calls Codex's exported `townFrameBounds(group, layout)` from `src/client/town/index.ts` (no harness copy), then `camera.frame(...)` and `camera.resize(w, h)`. Close-ups look at the piece from offset (0, 13, 13). No citizens. Awaits `buildings.ready`; a rejection or nonempty `degraded` fails the capture. Sidecar `renderer: 'town-architecture'`. `--variant` is ignored here.
  - The C2 preview kit (`preview-kit.ts`) is deleted (C3).
- D2 capture additions (Claude, `claude/d2-integration`):
  - The screenshot step uses `--timeout-ms` (default 60000), not Playwright's 30000 ms default, so slow software frames finish.
  - `--no-webgl` (targets `town` and harness `app` screens only): Chromium starts with `--disable-webgl --disable-3d-apis` instead of SwiftShader. The harness creates no renderer, requires `view.isWebGLSupported() === false` and a `.town-fallback-container[role="status"]` element, and publishes `{ renderer: 'fallback', webgl: false }`. It fails if WebGL is still available or the fallback element is missing.
  - `--target crowd --citizen-height <0.5–6> [--crowd-layout comparison|production] [--palette] [--reaction-ms]`: calls Codex's `createCrowdComparison` (`src/client/town/crowd-sample.ts`), awaits `whenReady()`, fails on `degraded` or `count-mismatch` unless `instances === 30`, poses with `setTime`, and publishes `{ scene: 'crowd', citizenHeight, palette, crowdLayout, instances, metrics }`. `--crowd-layout` defaults to `comparison` (Codex's fixed preview rows, which reproduce the approved 1.8 screenshot byte for byte); `production` uses Codex's clearance allocator. Isolated preview; production scale is `CITIZEN_REFERENCE_HEIGHT` (1.8, §5b).
  - `--context-cycle` (`--target town` with WebGL only): after readiness and `reactionMs`, the harness loses the real context through `WEBGL_lose_context` and requires, before restoring: the `webglcontextlost` event, the fallback element, a hidden canvas and zero `.speech-bubble` elements. It waits one task (Chromium ignores `restoreContext()` during the lost-event dispatch), restores, requires `webglcontextrestored`, the fallback gone and the canvas shown, awaits `whenReady()`, advances the virtual clock 100 ms and measures the restored frame. Sidecar `state.contextCycle = { lost, fallbackShown, canvasHidden, bubblesBefore, bubblesAfterLoss, restored, restoreMs }`. Any missing step fails the capture.
  - Real-time busy playback (D2, hardware FPS traces; not a capture): run `npm run dev`, then open `http://localhost:3000/visual-test/index.html?fixture=solo-honest&round=3&phase=reveal&palette=b&reducedMotion=false&playback=realtime` at 1280×720. `playback=realtime` uses the native clock, `requestAnimationFrame` and the production renderer (no virtual clock, no `preserveDrawingBuffer`, no pixel readback). The page feeds the recorded frames before the reveal (times rebased to wall time), awaits buildings, rigs and paperboys plus two warm frames, and refuses the no-WebGL fallback or degraded assets. It shows **Ready** with a **Run** button. Run hides the panel, marks `news-town:busy:start`, feeds the recorded reveal with its 20 s deadline rebased to now, waits for the town's playback promise, marks `news-town:busy:end`, measures `news-town:busy`, then shows **Finished**. `window.__NEWS_TOWN_VISUAL__` carries `{ scene: 'realtime', stage, report }`: fixture/frame, reaction ms, plan summary (actors, multi-node routes, destinations, behaviors), CSS viewport, DPR, drawing buffer, palette, reduced motion, readiness, and after the run `run = { durationMs, travelled, maxDistanceFromDestination, problems }`. A run is valid evidence only with `problems: []`: every actor moved, ended within one block of its last route node, and the run took 20 s ± 0.5 s. Reload for another run. Screenshot mode is unchanged.
  - Name join (`--target app --screen lobby` only): `--player-name`, `--paper-name`, `--correct-player-name`, `--correct-paper-name`, `--expect-error <text>`. The capture submits through the create-room path and waits for `[data-testid="join-error"]` or the lobby. `state.join = { outcome: 'accepted' | 'rejected' | 'error' | 'corrected', error, entry: 'createRoom' }`. With `--expect-error`, a banner that does not contain the text fails the capture (`join error did not match: expected "x", got "y"`) and `rejected` is recorded only on a match; without it a banner is recorded as `error`. A correction fills whichever corrected fields were given, waits for the old banner to go before judging the result, and applies the same match to a second banner. Fallback (`--no-webgl`) town and app states carry no `palette`. Empty names and `--stress-text` with name flags are rejected.
- Viewing: Claude opens PNGs with its Read tool. Codex opens PNGs with its own image viewer. Each agent looks at its own captures directly.

- **Deployed-page evidence (D4, Claude `scripts/visual/evidence.ts`; signature acknowledged by Codex 2026-10-20):** `watchPage(page): PageWatch` (attach before `goto`) and `captureAppEvidence(page, watch, { out, label, timeoutMs }): Promise<AppEvidence>`. It waits for `document.fonts.ready`, runs the same layout check as the CLI (throws on `overflowX`/`unreachable`), and writes `out` (must end in `.png`) plus `out.json` with exactly `label`, `origin` (bare origin), `viewport` (measured CSS size and DPR), `browser`, `fontsReady`, `layout`, `stylesheets` (origin + path, no query) and `consoleErrors`. It never records page paths, queries, tokens, snapshots or packets. The caller asserts zero console errors, and the deploy SHA comes from host evidence. The PNG shows whatever the UI shows (the join screen shows a room code). `capture.ts` uses the same `watchPage` and `checkAppLayout`; its CLI and sidecar fields are unchanged. The D3/D4 probe also consumes `chromiumArgs(noWebgl: boolean): string[]` from `args.ts`, and Claude keeps that signature stable.

## 5a. Character inspection scenario (D0 support)

- Entry point (owner Codex): `src/client/town/assets/inspection-scene.ts`, `createInspectionScene(options): InspectionScene` with `whenReady(): Promise<SceneReadiness & { clips: readonly string[]; instances?: number }>`, `setTime(ms)` (poses the clip at exactly `ms` and renders one frame), and `dispose()`. The caller owns the renderer; the scene owns its loaded assets.
- Options passed by the harness: `{ container, renderer, modelUrl: '/models/' + model, clip, count }`. `clip` is `null` for the bind pose.
- **Count contract (accepted by Codex; implemented in `codex/visual-d0` `ff54573`):** Codex adds `count?: number` (1–30, default 1) to `InspectionSceneOptions`, draws that many characters, and resolves `whenReady()` with `instances` equal to the number actually drawn. The harness fails the capture with `count-mismatch: requested N characters, scene reports M` whenever they differ (a missing `instances` counts as 1). So a 30-character proof can never pass while one character is drawn.
- Harness (owner Claude): `src/client/visual-test/inspect.ts` and `inspection-scenario.ts`. URL `/visual-test/index.html?scene=inspect-character&model=characters/...&clip=...&timeMs=...&count=...&seed=...`. The model must match `^characters/(?:[\w-]+/)*[\w-]+\.(?:glb|gltf)$`; clip names are 1–64 of letters, digits, spaces, dots, dashes, underscores. The entry point is found with `import.meta.glob`, so the harness builds without it and fails with `inspection entry point not available yet` until it is merged.
- Order: parse, load the entry point, seed `Math.random`, create the renderer, `createInspectionScene`, await `whenReady()`, apply the degraded and count checks, `setTime(timeMs)`, measure (≥16 colors), publish `{ status: 'ready', scene: 'inspect-character', scenario, clips, instances, width, height, distinctColors }`.
- Verified by Claude on a merge of `claude/inspection-scenario` (`b6faba1`) and `codex/visual-d0` (`ff54573`): `--count 30` with `idle`, `walk`, `sprint` and the bind pose all report `instances: 30`; a repeated `walk` capture is byte-identical; `walk30.png` (6 × 5 grid, red hats, mid-stride) and `walk1.png` (hat fully in frame) were inspected.
- Command: `npm run capture -- --target character [--model characters/kenney-mini/character-male-a.glb] [--clip idle|walk|sprint] [--time-ms 0] [--count 1] --out <file.png>` (no `--prod`).

## 5b. D1 art decision (recorded by Claude, 2026-10-19)

User approvals relayed 2026-10-19 after viewing Codex's D1 rendering-sample captures (`codex/visual-d1` `f00be06`, `handoffs/D1.md` "Final capture verification"). These bind C3 and D2. Changing any of them reopens this section.

| Decision | Recorded value |
|---|---|
| Palette | **B** (`PALETTES.b` in `src/client/visuals/palette.ts`; brick red and teal lead). `PaletteId` stays `'a' \| 'b' \| 'c'` until a rename is requested. Production passes `getPalette('b')` to the town in D2. `APPROVED_PALETTE = 'b'` in `palette.ts` is the one place this choice lives. The UI applies it at startup (`src/client/main.tsx`), and the capture command uses it as its `--palette` default. Merge this together with D2's town palette wiring, so UI and town paper colors change together. |
| Building source | **Code-built** bodies and signature details through the C2 factories (`createBakery`, `createProp`; C3 extends them). Kit buildings are not used. |
| Foliage | **Kenney Nature Kit 2.1** under `public/models/props/kenney-nature/` (`tree_oak`, `tree_default`, `plant_bush`, `flower_redA`), recolored by material name (`NATURE_MATERIAL_ROLES`: `leafsGreen` and `grass` use `foliage`, `woodBark` uses `wood`, `colorRed` uses `brick`). |
| Kit awning | **Not adopted.** `public/models/buildings/kenney-commercial/` and `createBakeryHybrid` stay as the recorded comparison only (`--variant hybrid-original\|hybrid-palette`). The town never places them. |
| Citizens | **Kenney Mini Characters 1** (`public/models/characters/kenney-mini/`, Codex). The atlas is kept through `MaterialKit.preserve`. |
| Citizen scale | **1.8 world units of visible idle body height, before the cap** (`CITIZEN_REFERENCE_HEIGHT` in `src/client/town/architecture/piece.ts`). User decision in D2 (2026-10-19, relayed by Codex), replacing the D1 value 3.29. Approved from `.superpowers/shots/D2/crowd-1.8-b.png` (SHA-256 `9c9a3403…c688`): `npm run capture -- --target crowd --citizen-height 1.8 --palette b --reaction-ms 0`, 1280×720, seed 1, idle at 0 ms, 30 actors at `OFFICE_NODES[1]` (`r0c4`), Codex's fixed comparison camera and proposed preview rows (1.7 × 1.15; not yet production spacing). Sidecar: ready, 30 instances, 956 colors, 0 console errors; body 1.78 × 0.91, 23 overlapping body pairs, 0 outside the 5 radius. The cap adds a little on top. Clearance radii are unchanged; production crowd spacing is still validated in D2. Buildings, props and `HEADROOM = 3.8` were sized for 3.29 and are kept. |
| Custom signatures | Striped awning, pretzel on the gable, lit window, gas lamp, newsstand and bench (C2). C3 adds bank columns, the town-hall clock tower, the clinic's lit cross, office chimneys and paper-color banners, and the fountain square. |
| Orientation | Y up. Piece origin at ground in the footprint center. +Z faces the street. Kenney models face +Z (D0). Building bodies sit in the lot behind their node (§4, C3); nodes, routes and anchors never move. |
| Materials | Palette surfaces through `MaterialKit.surface`; atlas models through `preserve`; no hex literals in pieces. Codex's kit: 3-band toon gradient with nearest filtering, polygon offset, static edge outlines (45° threshold), and normal-expanded skinned hulls bound to the rig's own skeleton. |
| Approved render settings | `ACESFilmicToneMapping` at exposure 1, `SRGBColorSpace` output, `PCFShadowMap` at 2048, a hemisphere light at 1.1 plus a directional light at 2.4. Palette B was approved under these settings. D2 keeps them, or shows the user new captures before changing them. |

**Open for D2** (C3 settled the entrance offset and label heights in §4):
- Outline weight. Static edge lines are 1 device pixel, while skinned hulls are thicker.
- Thirty-citizen crowd rings inside the §4 clearance radii.
- Camera framing. At the default distance the top and bottom offices are cropped, and a 390 × 844 view shows only the centre (C3 captures `town-b.png`, `town-b-narrow.png`).

## 5c. Should features (user decision 2026-10-20; amended per Codex review and **acknowledged by Codex at `aff108b`**, 2026-10-20)

The user chose to build all five Should items and cut every Could item (C5 handoff §4). Claude owns everything below except the parts marked Codex. All of it is presentation only: it never changes outcomes, routes, destinations or phase timing, and it never adds a gameplay clock.

### Time of day (Claude: `src/client/visuals/time-of-day.ts`; Codex: lighting)

```ts
export type TimeOfDay = 'morning' | 'midday' | 'afternoon' | 'late' | 'dusk' | 'night';
/** Derived only from authoritative round/phase (no clock). Not in a match (no snapshot): 'midday'. */
export function timeOfDay(round: number, phase: Phase): TimeOfDay;
export interface TimeOfDayLook {
  sky: number; fog: number;        // scene background and fog color
  hemiSky: number; hemiGround: number;
  sun: number;                     // directional light color
  lightScale: number;              // multiplier on the approved hemisphere 1.1 and directional 2.4
  lampLevel: number;               // 0..1, passed to TownBuildings.setLampLevel
}
/** Colors come from the palette; one look per TimeOfDay for the given palette. */
export function timeOfDayLook(palette: PresentationPalette, time: TimeOfDay): TimeOfDayLook;
```

- **Mapping:** intro and round 1 are `morning`; round 2 `midday`; round 3 `afternoon`; round 4 `late`; round 5 `dusk`; `final` and `ended` are `night`.
- **Night rule (user):** it must feel like night, with glowing lamps, but must not be too dark. `night` keeps `lightScale ≥ 0.55`, a deep-blue sky that is never black, readable hat colors, and labels at full contrast. Claude proves this with captures before Codex depends on it.
- **User art approval (2026-10-20):** the six looks in `.superpowers/shots/C5/time-of-day/` (`sheet.png`, `sheet3.png`) are approved ("yeah both are good").
- **`TownView.setTimeOfDay(time: TimeOfDay): void`** (Codex, additive; acknowledged by Claude on 2026-10-20 for plan `7d46a94`): the fallback view treats it as a no-op. `mountTown` calls it with `timeOfDay(snapshot.round, snapshot.phase)`, or `'midday'` when there is no snapshot.
- **Codex** applies the look to the scene's background, fog, hemisphere and directional lights whenever the phase or round changes, and calls `setLampLevel`. It tweens over about 1 s, or switches instantly under reduced motion. The existing tone mapping and shadow settings stay unchanged.

### Lamp glow (Claude: `props/street.ts`, `buildings.ts`)

- New method `TownBuildings.setLampLevel?(level: number): void` (optional, so existing hand-built test doubles stay valid; the real town always provides it), with level clamped to 0..1. Each gas lamp gains a ground light pool: a flat, unoutlined, additive disc with a material the lamp owns. `setLampLevel` changes only material values: the pool's opacity. The lantern keeps its always-on emissive, because changing it would mutate a shared MaterialKit surface (ruling after Claude's C5 review). It never changes transforms, visibility or outlines, so the D2 static-outline batch stays valid.
- No real point lights (performance).

### Emotes (Claude: `src/client/visuals/emotes.ts`; Codex: rendering)

```ts
export type Emote = '!' | '?' | 'anger' | '$';
export const EMOTE_FOR_BEHAVIOR: Readonly<Record<Behavior, Emote | null>>;
// flee → '!'; curious → '?'; protest and angry_mob → 'anger'; queue → '$';
// boycott, relax and routine → null (overhaul design §6 names only these four).
export const MAX_VISIBLE_EMOTES = 8; // a crowd cap separate from the 6 speech bubbles
```

- **Codex** draws the glyph above the citizen's head once it arrives at its destination (or immediately under reduced motion, without animation), with at most `MAX_VISIBLE_EMOTES` at a time. The glyph itself is the non-color cue; text renders as text, never HTML.
- **Selection is deterministic** (Codex review): take the actors with a non-null emote in ReactionPlan order. First pick one eligible actor per destination node, in order of each destination's first appearance. Then fill the remaining slots round-robin across destinations, in actor order, until 8. Clear all emotes on any phase change.

### Picket signs (Claude: `props/picket.ts`; Codex: attachment)

```ts
export const PICKET_SIGN_TEXTS: readonly string[]; // short pixel-font slogans, family friendly, ≤ 6 glyphs
export interface PicketSignKit {
  /** A sign for one actor: a clone of this kit's original for `text` (created on first use), sharing its resources. */
  create(text: string): THREE.Object3D;
  /** Detaches every clone this kit made from its parent, then frees each original's resources once. Idempotent. */
  dispose(): void;
}
/** One kit per town/context; caches never cross kits, so one kit's disposal cannot free another's resources. */
export function createPicketSignKit(ctx: ArchitectureContext): PicketSignKit;
```

- **Origin** of each sign is the grip point, with the board above it facing +Z. The total height is about 1.3, sized for 1.8-unit citizens.
- Each kit keeps one original per text and makes clones from it, so 18 or more signs share resources. No module-level cache exists. Codex creates the kit with the town's context and disposes it with the town, before the material kit.
- **Codex** attaches a sign to each `protest` and `angry_mob` actor when it arrives (for example at the hand or root offset), removes it on the next phase, and shows signs under reduced motion without sway. Signs are not outlined after ready unless Codex adds them to its own batching rules.

### Read, pause and react (Codex)

- **Bounded timing** (Codex review): routes carry distances, not durations. Playback already moves each actor during a fixed window of **15–70 %** of the remaining reaction time, using normalized progress. That window does not change. The reading pose uses only the lead-in before it: `prelude = min(1200 ms, 0.15 × remaining)`, ending at or before the 15 % mark. The react pose and emote follow arrival, in the 70–100 % tail. Movement never starts late and never ends after the deadline.
- Reduced motion has no prelude; the stable final pose and emote appear at once.

### Latest-edition ticker (Claude: UI)

- During `reveal` only, a newspaper ticker runs along the top of the town, directly under the top bar, at every screen size (it spans the full width, so on phones it sits above the standings strip). Its viewport scrolls by hand with a hidden scrollbar, so every headline stays reachable. It shows every published headline of the round in seat order (placeholder cards for seats that skipped are left out; when nobody published it shows "No front pages this edition"), each with its paper color, icon and name, and an `EXPOSED` mark where public data supplies one. It never implies that one headline caused every reaction (overhaul design §7).
- The motion is a CSS marquee. Under reduced motion it becomes a static row that scrolls horizontally. It reads from the existing reveal front-page data; there is no new store field.

## 5d. No-WebGL notice space (C5; Codex proposal `b2924bc`, acknowledged by Claude 2026-10-20)

- **Codex (`src/client/town/webgl.ts`):** renders the unchanged notice, plus the optional Retry button, as an intrinsic-height strip at the top of the town viewport. It publishes the strip's pixel height as `--nt-town-fallback-height` on `document.documentElement`, kept current by a `ResizeObserver`, and removes the property when the fallback disposes or recovers. The direct-child `.town-fallback-container[role=status]` marker stays, so `useTownFallback` and the harness keep working. Renderer code never edits UI elements or injects CSS.
- **Claude (delivered on `claude/c5-final-review`):** `.hud-overlay` (`hud.css`) and `.app-layout > .screen-container` (`screens.css`) set `top: var(--nt-town-fallback-height, 0px)`. The bottom stays 0, and the internal scroll limits are unchanged. The connection modal backdrop still covers everything on purpose, because it is a modal. Test: `tests/ui/styles.test.ts`, "start the HUD and full-screen setup layers below the no-WebGL notice". With the property unset, the layout is byte-identical: the final-screen capture matches `cmp`.
- **Acceptance (C5 request):** with `--no-webgl`, the full notice is readable and no panel control is covered in intro, investigate, write, reveal and final, at 1280×720 and 390×844. Codex runs these captures after integrating; Claude reviews them.

## 6. Acknowledgments

| Agent | Revision read | Captured and viewed PNG | Date | Notes |
|---|---|---|---|---|
| Claude | `b238bdb` on `claude/c0-foundation` | `town-r1-reveal.png` (solo-honest, round 1 reveal, 6000 ms, 1280×720): grid town with the fountain in the center, bakery with red roof, grey bank, orange town hall, green clinic, two office roofs at the top corners, about 30 dark citizen capsules, no bubbles yet. | 2026-10-15 | author |
| Codex | `f8edb0a` (reviewed on its isolated branch `codex/c0-proof`) | `/tmp/news-town-codex-c0-f8edb0a/codex-town.png`, 1280×720, ready, 344 distinct colors, 0 console errors: "An elevated grid town with a central blue fountain, red-roofed bakery, grey bank, orange town hall, green clinic, scattered small citizens, and partially cropped offices along the top edge." | 2026-10-15 | Names, file ownership, semantic colors, and shared-map anchors compatible. Asked for three clarifications: (1) await assets before advancing to the exact timestamp, (2) `whenReady` covers all assets, rejects unrecoverable failures, records degraded fallbacks, (3) `loadGltf` instance and disposal ownership. Applied in `e1e20f7` (harness) and `1e697ac` (§2, §3, §5). Codex confirmed at `1e697ac`: all three addressed, names and ownership compatible, no further wording changes (wording/source review; capture not rerun). |
| Claude | `codex/visual-d1` `b7810b4` (`plans/D1.md`, Claude requests 1–4) | `wood-b.png`: palette b preview capture, bark and door brown, lamps teal | 2026-10-19 | Accepted requests 1–4 with the decisions in `plans/D1-claude-requests.md`; delivered on `claude/d1-requests` (§1 `wood`, §2 `preserve`, §5 D1 wiring). Will record the user's final art decisions after D1's rendered choice. |

Codex acknowledged the D1 delivery at `95b6885` (2026-10-19, recorded in `codex/visual-d1` `ae1ca0d`, `handoffs/D1.md`): `preserve`, the wood swatches, the painted-iron lamp deviation and the renderer contract accepted, no blocking findings. Codex's disposable combined tree passed 533 tests, typecheck, lint and build.

Claude counterpart review of D1 at `codex/visual-d1` `f00be06` (2026-10-19): handoff-compatible, no blocking findings.
- Checked resource ownership and late disposal, the borrowed renderer, atlas preservation, skinned outlines, and exact-time and reduced-motion poses.
- Recaptured on a combined tree (`f00be06` plus `7719607`, tree `5bf52c1`). Palette A code/street at 1000 ms is byte-identical to Codex's `final-a.png` (SHA-256 `9158ba80...`).
- Viewed palette B street, the awning view at 1300 ms, and reduced motion: all `renderer: sample`, 0 console errors.
- The decisions are recorded in §5b.

Codex counterpart review of C3 at `claude/c3-architecture` `ed4ca7f` (2026-10-19, relayed by the user): compatible, no blocking findings.
- Acknowledges reopened §3, §4, §5 and §5b: off-node buildings, clearance radii, 5.8 label anchors, paperboy footprints and material ownership.
- All 40 changed files are inside Claude's ownership. 608/608 tests, typecheck, lint and build pass.
- Town captures match each other and the supplied hash. The D1 sample capture is still byte-identical.
- Real Nature models fit their declared footprints. The actual town geometry clears nodes, roads and all four paperboy spots.
- Office recolor and highlight leave neighboring materials alone. Sign textures and converted materials dispose correctly.
- Not checked yet, and left to D2: real crowds, hardware FPS and camera framing.
- `6722ef8` after it changes only the handoff's capture path.
