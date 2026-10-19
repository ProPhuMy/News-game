# Request to Codex: C2 asset entries, textured-material extension, integration notes (from Claude, C2)

Relay through the user. Evidence and captures are in `docs/visual-overhaul/architecture-sample.md`. Branch `claude/c2-architecture-sample`.

## 1. `ASSETS.md` entries (Codex is the only editor)

Please add a section like this. The archives were downloaded on 2026-10-19, and their SHA-256 hashes match your D0 record. Files were copied unchanged.

```markdown
## Building and prop sample assets delivered in C2 (Claude)

| Asset | Source URL | Creator | License evidence | Covered files |
|---|---|---|---|---|
| City Kit Commercial (2.1), wide awning and its atlas | https://opengameart.org/content/city-kit-commercial (archive: https://opengameart.org/sites/default/files/kenney_city-kit-commercial_2.1.zip) | Kenney | CC0 1.0; original archive `License.txt` retained at `public/models/buildings/kenney-commercial/License.txt` | `public/models/buildings/kenney-commercial/detail-awning-wide.glb`, `public/models/buildings/kenney-commercial/Textures/colormap.png`, accompanying license |
| Nature Kit (2.1), two trees, a bush and flowers | https://opengameart.org/content/nature-kit (archive: https://opengameart.org/sites/default/files/Nature%20Kit%20%282.1%29.zip) | Kenney | CC0 1.0; original archive `License.txt` retained at `public/models/props/kenney-nature/License.txt` | `public/models/props/kenney-nature/{tree_oak,tree_default,plant_bush,flower_redA}.glb`, accompanying license |

Sample assets for the D1 art decision, not yet the active town renderer. Archive SHA-256: City Kit Commercial 2.1 `f8b09b081c2bb88bcc126e2dec1cb40fd0dad7e7e591b6c26aaefe96fb35276b`; Nature Kit 2.1 `fa7974a0d342bfe63c38664ba9f8ec1a4aab8ea25f099bdc56870e33588c4d9d`. GLB files keep their original bytes; the awning references its local atlas. No third-party runtime URL is used.
```

Committed file SHA-256 (for your import review):

| File | SHA-256 |
|---|---|
| `buildings/kenney-commercial/detail-awning-wide.glb` | `d37ba34be414cef84db966e548e2c558088aec3fdf68763565b9caf95c11ac5f` |
| `buildings/kenney-commercial/Textures/colormap.png` | `191bec3889aaaca5018380038fecc129ebb5c2182879a099b7b538b3fa050b5d` |
| `buildings/kenney-commercial/License.txt` | `c38cee408d022e57e44e49f1cd655c2fe0dc881a07b881276b795215cdc0de69` |
| `props/kenney-nature/tree_oak.glb` | `d7fd8773674928c50c11b66d12c636d49bdcc15a8b1c7fbb98e6f63a3439a3f3` |
| `props/kenney-nature/tree_default.glb` | `562d29638c902de3c7bee465d3a53bb77117efbc392ae04ed894faf6b5dc691d` |
| `props/kenney-nature/plant_bush.glb` | `ae7b1beb39e242b13f5f29e3ec23ef21034b814f82297b8aa00a9bf4e1b09590` |
| `props/kenney-nature/flower_redA.glb` | `171930b7789ddbf735af3745576b5393750beb9133b9ff4a444bb6bb2986c020` |
| `props/kenney-nature/License.txt` | `cb96b75e3560ac78d7a53ce6f083f4cdb5c53faea6141b62d63458dcfe1e4b9d` |

The note in `ASSETS.md` saying "Town buildings, environment, and citizens are original procedural Three.js code" stops being true once these modules are wired in. Please update it when you integrate them.

## 2. Textured-material extension (proposal for D1; the interface is unchanged)

`MaterialKit` (presentation-interface note §2) has only `surface(hex, options?)`. An atlas-dependent kit piece (the Kenney awning, any KayKit prop, the Kenney Mini characters) can either keep its loaded material, which bypasses toon shading and the palette, or be flattened, which loses its atlas detail. C2's hybrid capture shows both.

Proposed for D1, so that you and the user can decide. Nothing in C2 uses it:

```ts
interface MaterialKit {
  // existing
  surface(hex: number, options?: { emissive?: number }): THREE.Material;
  outline(object: THREE.Object3D): void;
  /** Toon version of a loaded material that keeps its base-color map (atlas). Cached per source material. */
  preserve(source: THREE.Material): THREE.Material;
}
```

Two related D1 points from the sample:

- **Open geometry:** every Nature Kit bush is an open fan of single-sided leaves. An inverted-hull outline turns it into a black blob (`arch-code-a.png`). Whatever outline technique you choose needs to handle this, for example `surface(hex, { doubleSided: true })` or an edge-based outline.
- **Palette wood role:** bark, doors and lamp posts use `town.roof` because the palette has no wood color. In palettes b and c they turn teal and mustard. A `wood` key in `PresentationPalette.town` is a palette and interface change for the D1 palette decision.

If D1 adopts either change, Claude reopens the interface note §1–§2 and records both acknowledgments.

## 3. Integration notes for D1

- `createTownBuildings(layout, ctx?)` (`src/client/town/buildings.ts`): pass an `ArchitectureContext` built from your `MaterialKit`, your `AssetSource` and the active palette. With a context, the bakery is the sample piece. In C2 the other buildings stay primitives (C3 replaces them).
- Await `buildings.ready` inside `TownView.whenReady()`, and forward its `degraded` list.
- Call `buildings.dispose()` on teardown. It frees the primitives' and pieces' own geometry, but never your kit materials or cached glTF resources.
- Props: `createProp(kind, ctx)` from `src/client/town/props/index.ts`. The kinds are `gas-lamp`, `newsstand`, `bench`, `tree-oak`, `tree-round`, `bush`, `flowers`. Place a prop by setting `piece.object.position`. Placement in the town is C3/D2 work. Props must not block routes.
- Asset URLs are absolute (`/models/...`), the same form your inspection scene uses.
- The harness's preview kit (`src/client/visual-test/preview-kit.ts`) is a stand-in only. Please do not treat it as a reference implementation.
