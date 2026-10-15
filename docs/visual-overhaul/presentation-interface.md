# Presentation interface (owner: Claude)

Status: reviewed by Codex in C0; revised for its three clarifications. Source: overhaul design §11 "Handoff decisions". Base commit: `main` `3c02902` (bootstrap merged); branch `claude/c0-foundation`.
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
  town: { ground: number; road: number; plaza: number; foliage: number; brick: number; trim: number; roof: number; outline: number; sky: number; fog: number; lampGlow: number };
  paper: Readonly<Record<Color, PaperSwatch>>;
  unsubscribed: PaperSwatch;
}

export const PALETTES: Readonly<Record<PaletteId, PresentationPalette>>;
export function getPalette(id: PaletteId): PresentationPalette;
/** Sets --nt-* CSS custom properties on root (UI tokens derive from the same palette object). */
export function applyPaletteCssVariables(root: HTMLElement, palette: PresentationPalette): void;
```

- Rule: themed colors live only in `palette.ts`. `PAPER_COLOR_HEX` and `PAPER_GREY_HEX` in `src/client/town/citizens.ts` (Codex) move to `palette.paper[color].hex` and `palette.unsubscribed.hex` during D1/D2.
- The screenshot command gains `--palette a|b|c` when `palette.ts` exists (Claude, C1/C2); the harness then calls `getPalette` and passes it to the renderer through the D1 entry point Codex defines.

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
}
```

- If D1 keeps atlas textures on kit models, the note is reopened to add a textured variant. Nothing is assumed now.
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
- World units: the shared grid spacing is `GRID.spacing = 12` between street nodes (`src/shared/town-map.ts`). Current citizen height is measured by Codex in D0 and recorded here.

## 4. Anchors (one representation)

- Logical destinations are shared map node ids, read only through `TownLayout`: `getLocationNode(location)`, `getOfficeNode(seatId)`, `getNodeWorldPos(nodeId)`.
- A building's root is placed at its location node's world position, as today. Decoration never moves a node, a route, or a logical destination.
- Label anchors come from `TownBuildings.getLocationAnchor(location)` / `getOfficeAnchor(seatId)` (world `Vector3` above the node).
- Open for D1: today buildings are centered on their node, so routes end at the building center. Where the entrance sits relative to the node is decided in the D1 sample without moving the node.

## 5. Screenshot command and readiness

- Command (owner Claude): `npm run capture -- --out <file.png> [--target town|app] [--fixture solo-honest] [--round 1] [--phase reveal] [--reaction-ms 6000] [--reduced-motion] [--seed 1] [--width 1280] [--height 720] [--prod] [--timeout-ms 60000]`.
- Output: the PNG and `<file.png>.json` (scenario, browser version, ready state, stylesheet responses, console errors). A failed or empty capture exits 1 and leaves no PNG.
- Determinism: the harness (`src/client/visual-test/`) stubs `Date.now`, `performance.now`, `requestAnimationFrame`, `cancelAnimationFrame`, and `Math.random` (seeded). Renderer code must take time only from those sources. Measured in C0: two captures with identical inputs were byte-identical. Known gap: town speech bubbles expire through `setTimeout` in `src/client/town/bubbles.ts` (4 s, real time), and their 0.2 s opacity transition is CSS on real time. `clock.advance` is synchronous, so no bubble ever expires inside a capture: every bubble shown during the reaction window is still on screen at capture time (up to the cap of 6), even when the requested timestamp is long past its real expiry. Captures therefore over-show bubbles. Codex decides in D1 whether bubble lifetime moves to the frame clock.
- Renderer-ready signal: Codex adds `whenReady(): Promise<SceneReadiness>` to `TownView` when async assets arrive (D1).
  - It covers **all** scene assets: characters, buildings, props, and environment.
  - It resolves without needing animation frames (asset loading is promise-based), because the harness awaits it before advancing the virtual clock.
  - It **rejects** on an unrecoverable initialization failure. The capture then fails with that message.
  - Recoverable fallbacks are listed in `degraded`. A nonempty list fails the capture with `degraded-assets: ...`, so a screenshot can never certify missing models silently.
- Capture order (implemented in `src/client/visual-test/settle.ts`): apply the fixture frame, mount, await `whenReady()` if present, then advance the virtual clock by exactly `reactionMs` (a value of 0 still draws one frame), then measure and publish `window.__NEWS_TOWN_VISUAL__`.
- Browser: `playwright-core` 1.63.0 with its Chromium build 1243 (software WebGL through SwiftShader). The command starts the browser without `DISPLAY` / `WAYLAND_DISPLAY`, because an inherited desktop display this account cannot open disables WebGL.
- Viewing: Claude opens PNGs with its Read tool. Codex opens PNGs with its own image viewer. Each agent looks at its own captures directly.

## 6. Acknowledgments

| Agent | Revision read | Captured and viewed PNG | Date | Notes |
|---|---|---|---|---|
| Claude | `b238bdb` on `claude/c0-foundation` | `town-r1-reveal.png` (solo-honest, round 1 reveal, 6000 ms, 1280×720): grid town with the fountain in the center, bakery with red roof, grey bank, orange town hall, green clinic, two office roofs at the top corners, about 30 dark citizen capsules, no bubbles yet. | 2026-10-15 | author |
| Codex | `f8edb0a` (reviewed on its isolated branch `codex/c0-proof`) | `/tmp/news-town-codex-c0-f8edb0a/codex-town.png`, 1280×720, ready, 344 distinct colors, 0 console errors: "An elevated grid town with a central blue fountain, red-roofed bakery, grey bank, orange town hall, green clinic, scattered small citizens, and partially cropped offices along the top edge." | 2026-10-15 | Names, file ownership, semantic colors, and shared-map anchors compatible. Asked for three clarifications: (1) await assets before advancing to the exact timestamp, (2) `whenReady` covers all assets, rejects unrecoverable failures, records degraded fallbacks, (3) `loadGltf` instance and disposal ownership. Applied in `e1e20f7` (harness) and this note revision (§2, §3, §5). Confirmation of the revised wording: pending. |
