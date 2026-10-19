# Presentation interface (owner: Claude)

Status: acknowledged by Claude and Codex (C0). **Reopened in C3 (§3, §4, §5): Codex acknowledgment pending.** Reopen explicitly if compatibility changes. Source: overhaul design §11 "Handoff decisions". Base commit: `main` `3c02902` (bootstrap merged); branch `claude/c0-foundation`.
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
- The screenshot command has `--palette a|b|c` (C1). On `--target app` it is applied to the page. On `--target town` it is only added to the harness URL (`&palette=`) and the sidecar; the town harness does not use it yet. Wiring it into the renderer is a D1 step through the entry point Codex defines.

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
- **C3 (reopened, user decision 2026-10-19):** with an `ArchitectureContext`, a building's body no longer sits on its node. It sits in the city block lot just north (−Z) of the node, front facing +Z, door nearest the node (`lotCenter` in `src/client/town/architecture/lots.ts`). The crowd stands on the street in front. The fountain square's root stays on its node (flat plaza; the basin sits in the north-east block at offset (6, −6), radius ≤ 3.3). Without a context the primitive path is unchanged (bodies on nodes) until D2 switches over. Decoration never moves a node, a route, or a logical destination.
- **Clearance (user decision, enforced by tests):** nothing below `HEADROOM = 3.8` stands within `GATHER_CLEARANCE = 5` of a target or office node, within `NODE_CLEARANCE = 3.5` of any other node, or within `ROAD_CLEAR = 2.0` of a street centerline. Lamps also stay out of each door's approach (door x ±2.5, façade to +5). D2's gathering rings should fit inside these radii; widening them past 5 needs this note reopened.
- **Label anchors (C3):** with a context, `getLocationAnchor` and `getOfficeAnchor` return the node x/z at `LABEL_ANCHOR_HEIGHT = 5.8` for every target and office. The primitive path keeps its old heights (town hall 10.0, offices 6.8).
- **Paperboys (user decision):** Codex places them in D2 at `PAPERBOY_SPOTS` (`src/client/town/props/dressing.ts`: four `{ x, z, rotationY }`, checked clear). Each figure must fit a 1 × 1 ground footprint; the spots have only about 0.04 of slack.
- Label anchors come from `TownBuildings.getLocationAnchor(location)` / `getOfficeAnchor(seatId)` (world `Vector3` above the node).
- Open for D1: today buildings are centered on their node, so routes end at the building center. Where the entrance sits relative to the node is decided in the D1 sample without moving the node.

## 5. Screenshot command and readiness

- Command (owner Claude): `npm run capture -- --out <file.png> [--target town|app] [--fixture solo-honest] [--round 1] [--phase reveal] [--reaction-ms 6000] [--reduced-motion] [--seed 1] [--width 1280] [--height 720] [--prod] [--timeout-ms 60000]`.
- UI flags (C1, additive; town and character captures unchanged): `--screen home|join|lobby|match|loading|disconnected|error`, `--palette a|b|c`, `--stress-text`, `--tab <n>`, `--scroll <selector>`, `--block-fonts`.
  - `home`/`join`/`lobby` drive the real dev server.
  - The other screens load the dev-only UI harness `src/client/visual-test/app.html`, which renders the real `AppRouter` and town over a fixture-fed store with the virtual clock.
  - `--stress-text` renders a copy of the fixture with every name, headline and bubble at its `TUNING.limits` maximum; fixture files are never changed.
  - Every `--target app` capture waits for `document.fonts.ready` and records a `layout` check in the sidecar (`{ overflowX, unreachable }`, logic in `scripts/visual/layout.ts`). It fails when any element under `#ui-root` sticks out of the viewport sideways with no scroll path, or when no scrolling can bring a control into view. A scroll container counts only if its own box can be seen, and a clipping ancestor that cannot scroll hides what lies outside it.
  - The sidecar's `stylesheets` list also records font responses.
- Output: the PNG and `<file.png>.json` (scenario, browser version, ready state, stylesheet responses, console errors). A failed or empty capture exits 1 and leaves no PNG.
- Determinism: the harness (`src/client/visual-test/`) stubs `Date.now`, `performance.now`, `requestAnimationFrame`, `cancelAnimationFrame`, and `Math.random` (seeded). Renderer code must take time only from those sources. Measured in C0: two captures with identical inputs were byte-identical. Known gap: town speech bubbles expire through `setTimeout` in `src/client/town/bubbles.ts` (4 s, real time), and their 0.2 s opacity transition is CSS on real time. `clock.advance` is synchronous, so no bubble ever expires inside a capture: every bubble shown during the reaction window is still on screen at capture time (up to the cap of 6), even when the requested timestamp is long past its real expiry. Captures therefore over-show bubbles. Codex decides in D1 whether bubble lifetime moves to the frame clock.
- Renderer-ready signal: Codex adds `whenReady(): Promise<SceneReadiness>` to `TownView` when async assets arrive (D1).
  - It covers **all** scene assets: characters, buildings, props, and environment.
  - It resolves without needing animation frames (asset loading is promise-based), because the harness awaits it before advancing the virtual clock.
  - It **rejects** on an unrecoverable initialization failure. The capture then fails with that message.
  - Recoverable fallbacks are listed in `degraded`. A nonempty list fails the capture with `degraded-assets: ...`, so a screenshot can never certify missing models silently.
- Capture order (implemented in `src/client/visual-test/settle.ts`): apply the fixture frame, mount, await `whenReady()` if present, then advance the virtual clock by exactly `reactionMs` (a value of 0 still draws one frame), then measure and publish `window.__NEWS_TOWN_VISUAL__`.
- Browser: `playwright-core` 1.63.0 with its Chromium build 1243 (software WebGL through SwiftShader). The command starts the browser without `DISPLAY` / `WAYLAND_DISPLAY`, because an inherited desktop display this account cannot open disables WebGL.
- Architecture captures: `npm run capture -- --target architecture [--view street|awning|town|bakery|bank|town_hall|clinic|fountain_square|office] [--variant code|hybrid-original|hybrid-palette] [--palette a|b|c] [--reaction-ms N] [--reduced-motion] --out <file.png>`.
  - `street`/`awning` (D1): the harness calls Codex's `createRenderingSample` (`src/client/town/sample.ts`) with a borrowed renderer, awaits `whenReady()`, calls `setTime(reactionMs)` once and measures. Sidecar `renderer: 'sample'`.
  - `town` and the close-ups (C3, `src/client/visual-test/architecture-town.ts`): Codex's `createMaterialKit` and `createAssetSource`, a palette ground slab and `STREET_EDGES` roads, `createTownBuildings(createTownLayout(), ctx)`, and the approved render settings (§5b). `town` uses `createTownCamera({})` at its default target and distance (the real game framing). Close-ups look at the piece from offset (0, 13, 13). No citizens. Awaits `buildings.ready`; a rejection or nonempty `degraded` fails the capture. Sidecar `renderer: 'town-architecture'`. `--variant` is ignored here.
  - The C2 preview kit (`preview-kit.ts`) is deleted (C3).
- Viewing: Claude opens PNGs with its Read tool. Codex opens PNGs with its own image viewer. Each agent looks at its own captures directly.

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
| Palette | **B** (`PALETTES.b` in `src/client/visuals/palette.ts`; brick red and teal lead). `PaletteId` stays `'a' \| 'b' \| 'c'` until a rename is requested. Production passes `getPalette('b')` to the town in D2. The UI still applies `'a'` at startup (`src/client/main.tsx:8`); switching it to `'b'` is a Claude follow-up, so UI and town paper colors agree. |
| Building source | **Code-built** bodies and signature details through the C2 factories (`createBakery`, `createProp`; C3 extends them). Kit buildings are not used. |
| Foliage | **Kenney Nature Kit 2.1** under `public/models/props/kenney-nature/` (`tree_oak`, `tree_default`, `plant_bush`, `flower_redA`), recolored by material name (`NATURE_MATERIAL_ROLES`: `leafsGreen` and `grass` use `foliage`, `woodBark` uses `wood`, `colorRed` uses `brick`). |
| Kit awning | **Not adopted.** `public/models/buildings/kenney-commercial/` and `createBakeryHybrid` stay as the recorded comparison only (`--variant hybrid-original\|hybrid-palette`). The town never places them. |
| Citizens | **Kenney Mini Characters 1** (`public/models/characters/kenney-mini/`, Codex). The atlas is kept through `MaterialKit.preserve`. |
| Citizen scale | **3.29 world units of visible idle body height, before the cap** (`CITIZEN_REFERENCE_HEIGHT`). The cap adds a little on top. Crowd clearance at full town scale is checked in D2. |
| Custom signatures | Striped awning, pretzel on the gable, lit window, gas lamp, newsstand and bench (C2). C3 adds bank columns, the town-hall clock tower, the clinic's lit cross, office chimneys and paper-color banners, and the fountain square. |
| Orientation | Y up. Piece origin at ground in the footprint center. +Z faces the street. Kenney models face +Z (D0). Building bodies sit in the lot behind their node (§4, C3); nodes, routes and anchors never move. |
| Materials | Palette surfaces through `MaterialKit.surface`; atlas models through `preserve`; no hex literals in pieces. Codex's kit: 3-band toon gradient with nearest filtering, polygon offset, static edge outlines (45° threshold), and normal-expanded skinned hulls bound to the rig's own skeleton. |
| Approved render settings | `ACESFilmicToneMapping` at exposure 1, `SRGBColorSpace` output, `PCFShadowMap` at 2048, a hemisphere light at 1.1 plus a directional light at 2.4. Palette B was approved under these settings. D2 keeps them, or shows the user new captures before changing them. |

**Open for D2** (C3 settled the entrance offset and label heights in §4):
- Outline weight. Static edge lines are 1 device pixel, while skinned hulls are thicker.
- Thirty-citizen crowd rings inside the §4 clearance radii.
- Camera framing. At the default distance the top and bottom offices are cropped, and a 390 × 844 view shows only the centre (C3 captures `town-b.png`, `town-b-narrow.png`).

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
