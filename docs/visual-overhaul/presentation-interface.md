# Presentation interface (owner: Claude)

Status: draft for Codex review in C0. Source: overhaul design §11 "Handoff decisions". Base commit: `main` `3c02902` (bootstrap merged); branch `claude/c0-foundation`.
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

## 3. Building and prop factories

```ts
// src/client/visuals/town-types.ts (continued)
import type { Location } from '../../shared/ids.ts';

export interface AssetSource {
  /** Loads a glTF from public/models/** with caching (Codex supplies the GLTFLoader-backed implementation). */
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
  /** Resolves when all assets are in place. On load failure it resolves after a code-built stand-in is inserted, and logs no secrets. */
  ready: Promise<void>;
  /** Footprint in world units. */
  footprint: { width: number; depth: number };
  /** Disposes only geometries, materials, and textures this piece created. */
  dispose(): void;
}

export type LocationBuildingFactory = (location: Location, ctx: ArchitectureContext) => PlacedPiece;
export type PropFactory = (kind: string, ctx: ArchitectureContext) => PlacedPiece;
```

- Integration entry point stays `createTownBuildings` in `src/client/town/buildings.ts` (Claude). In C2 it becomes `createTownBuildings(layout: TownLayout, ctx?: ArchitectureContext): TownBuildings` and `TownBuildings` gains `ready: Promise<void>` and `dispose(): void`. Its existing members stay unchanged: `group`, `getLocationAnchor`, `getOfficeAnchor`, `setOfficeHighlight`, `syncOffices`, `getOfficeBannerColor`.
- World units: the shared grid spacing is `GRID.spacing = 12` between street nodes (`src/shared/town-map.ts`). Current citizen height is measured by Codex in D0 and recorded here.

## 4. Anchors (one representation)

- Logical destinations are shared map node ids, read only through `TownLayout`: `getLocationNode(location)`, `getOfficeNode(seatId)`, `getNodeWorldPos(nodeId)`.
- A building's root is placed at its location node's world position, as today. Decoration never moves a node, a route, or a logical destination.
- Label anchors come from `TownBuildings.getLocationAnchor(location)` / `getOfficeAnchor(seatId)` (world `Vector3` above the node).
- Open for D1: today buildings are centered on their node, so routes end at the building center. Where the entrance sits relative to the node is decided in the D1 sample without moving the node.

## 5. Screenshot command and readiness

- Command (owner Claude): `npm run capture -- --out <file.png> [--target town|app] [--fixture solo-honest] [--round 1] [--phase reveal] [--reaction-ms 6000] [--reduced-motion] [--seed 1] [--width 1280] [--height 720] [--prod] [--timeout-ms 60000]`.
- Output: the PNG and `<file.png>.json` (scenario, browser version, ready state, stylesheet responses, console errors). A failed or empty capture exits 1 and leaves no PNG.
- Determinism: the harness (`src/client/visual-test/`) stubs `Date.now`, `performance.now`, `requestAnimationFrame`, `cancelAnimationFrame`, and `Math.random` (seeded). Renderer code must take time only from those sources. Measured in C0: two captures with identical inputs were byte-identical. Known gap: town speech bubbles expire through `setTimeout` in `src/client/town/bubbles.ts`, which runs on real time, not the virtual clock; captures with bubbles near their 4 s expiry could differ. Codex decides in D1 whether bubble timing moves to the frame clock.
- Renderer-ready signal: Codex adds `whenReady(): Promise<void>` to `TownView` when async assets arrive (D1). The harness awaits it when present, then publishes `window.__NEWS_TOWN_VISUAL__ = { status: 'ready', ... }`.
- Browser: `playwright-core` 1.63.0 with its Chromium build 1243 (software WebGL through SwiftShader). The command starts the browser without `DISPLAY` / `WAYLAND_DISPLAY`, because an inherited desktop display this account cannot open disables WebGL.
- Viewing: Claude opens PNGs with its Read tool. Codex opens PNGs with its own image viewer. Each agent looks at its own captures directly.

## 6. Acknowledgments

| Agent | Revision read | Captured and viewed PNG | Date | Notes |
|---|---|---|---|---|
| Claude | `b238bdb` on `claude/c0-foundation` | `town-r1-reveal.png` (solo-honest, round 1 reveal, 6000 ms, 1280×720): grid town with the fountain in the center, bakery with red roof, grey bank, orange town hall, green clinic, two office roofs at the top corners, about 30 dark citizen capsules, no bubbles yet. | 2026-10-15 | author |
| Codex | | | | |
