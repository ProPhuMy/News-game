# Architecture sample: evaluation and recommendation (C2, owner: Claude)

Written 2026-10-19 on branch `claude/c2-architecture-sample`. Input to the D1 joint art decision; it decides nothing on its own. Spec: overhaul design §5, §8, §13 (C2 row). Interface: `presentation-interface.md` §2–§3 (unchanged by C2).

## 1. What was built

| Piece | Module | Construction |
|---|---|---|
| Sample bakery | `src/client/town/architecture/bakery.ts` (`createBakery`) | Code-built: brick plinth, cream walls, gable roof, door, lit display window, striped awning, pretzel sign on the front gable |
| Hybrid comparison bakery | `src/client/town/architecture/bakery-hybrid.ts` (`createBakeryHybrid(ctx, 'original' \| 'palette')`) | The same bakery with Kenney City Kit Commercial `detail-awning-wide.glb` in place of the code awning |
| Gas lamp, newsstand, bench | `src/client/town/props/street.ts` | Code-built |
| Oak, round tree, bush, flowers | `src/client/town/props/nature.ts` | Kenney Nature Kit 2.1 models, materials mapped to palette roles by name |
| Entry points | `src/client/town/props/index.ts` (`createProp`), `src/client/town/buildings.ts` (`createTownBuildings(layout, ctx?)`) | With a context the town's bakery is the sample piece; without one the town is unchanged |

All pieces follow the interface: origin at ground in the footprint center, +Z faces the street, every surface comes from `MaterialKit.surface(hex)` with a palette hex, and nothing disposes kit materials or loaded geometry. The one exception is hybrid `original` mode, which deliberately leaves the kit's own material in place.

## 2. Captures (all inspected)

Command: `npm run capture -- --target architecture [--variant code|hybrid-original|hybrid-palette] [--view street|awning] [--palette a|b|c] --out <file.png>`. 1280×720, seed 1. All report `ready`, 487–592 distinct colors, 0 console errors. Two `code`/`a`/`street` captures were byte-identical (`cmp`).

The harness uses a **preview** `MaterialKit` (`MeshToonMaterial` and an inverted-hull outline) and a preview `GLTFLoader` asset source (`src/client/visual-test/preview-kit.ts`). These stand in for Codex's D1 implementations so the sample can render now. They are not an art proposal. Lighting is one hemisphere light plus one shadow-casting directional light.

| Capture | What it shows |
|---|---|
| `code`, palettes a / b / c (street) | The bakery reads as a shop at a glance: striped awning, glowing window, pretzel on the gable. The grey capsule (3.29 tall, D1 evaluation citizen) is shorter than the 4.2 door. Shadows fall on the ground and the wall. Palette b turns roof, door, lamps and tree bark teal; palette c turns them mustard (see finding 3). |
| `code` (awning view) | Stripes, outline and window glow hold up close. The pretzel reads as a pretzel, though its two upper loops also read as a smiling face. |
| `hybrid-original` (street and awning) | The kit awning is a flat **canopy on two posts** in two atlas colors (green canopy, dark grey posts). It has **no stripes**. At the kit's proportions, a canopy as wide as the storefront (×7) stands only 2.8 high: lower than the 3.29 citizen. It crosses the door and window. The kit material renders with standard (non-toon) shading. |
| `hybrid-palette` (street and awning) | The same canopy flattened to palette brick. What is lost: the green/grey two-tone between canopy and posts. Nothing else; this atlas region carries no finer detail. |

## 3. Findings

1. **Kit-only buildings are not viable.** No CC0 pack checked has an era-fitting bakery. Kenney Commercial and KayKit buildings are modern mid-rise blocks.
2. **The Kenney awning does not provide the bakery's identity cue.** It has no stripes, and its proportions conflict with the agreed citizen scale: a citizen cannot pass under it. Any non-uniform rescale would no longer be the kit piece as designed.
3. **The palette has no wood role.** Tree bark (`woodBark`) and the door and lamp posts use `town.roof`. That reads as brown in palette a, but teal in b and mustard in c. A wood or bark role in `PresentationPalette.town` would fix this. It is an interface change, so it is listed for D1, not made here.
4. **Open, single-sided foliage and inverted-hull outlines clash.** Every Nature Kit bush is an open fan of single-sided leaves. With the preview's inverted hull, the culled back faces show the black hull, so the bush renders as a dark blob. Codex's D1 outline technique needs to handle open geometry, for example with a double-sided surface option or an edge-based outline.
5. **Nature Kit maps losslessly.** Its materials are flat colors with names, so `MaterialKit.surface` loses nothing. Its original metallic factor is dropped, as D0 recommended.
6. **Atlas preservation needs a textured `MaterialKit`.** `MaterialKit` has only `surface(hex)`. The hybrid `original` mode therefore bypasses the kit and does not get toon shading. The request to Codex is in `requests/C2-codex-assets-materialkit.md`.

## 4. Options compared

| Option | Identity cues | License | Scale fit | Material handling | Verdict |
|---|---|---|---|---|---|
| Code-built | All custom; striped awning and pretzel shown | None needed | Built to the 3.29 citizen | Pure palette through `MaterialKit` | Works now |
| Hybrid (code + Kenney awning) | Loses the stripes | CC0 (`License.txt` committed) | Canopy too low at kit proportions | Needs a textured variant to keep the atlas; flattening loses the two-tone | Not better than code for the bakery |
| Kit-only | No bakery exists | — | — | — | Not viable |

## 5. Recommendation for D1

- Buildings: **code-built bodies and signature details.** Keep kits out of building bodies.
- Foliage: **Kenney Nature Kit**, palette-mapped by material name (lossless). Pick bush models that suit whatever outline technique D1 adopts.
- Atlas kit pieces (Kenney awning, KayKit bench or hydrant): use them only if D1 adds textured material support **and** the user prefers their look in a side-by-side. The awning in particular would need a different piece or a scale exception.
- Add a wood or bark role to the palette when D1 finalizes it.

The user makes the decision with Codex at D1 (spec §5, §13).

## 6. Delivered asset files

| File | Bytes | Triangles | Source |
|---|---|---|---|
| `public/models/buildings/kenney-commercial/detail-awning-wide.glb` | 5,544 | 40 | Kenney City Kit Commercial 2.1 |
| `public/models/buildings/kenney-commercial/Textures/colormap.png` | 11,002 | — | same (atlas used by the awning) |
| `public/models/buildings/kenney-commercial/License.txt` | 708 | — | same (CC0) |
| `public/models/props/kenney-nature/tree_oak.glb` | 14,644 | 196 | Kenney Nature Kit 2.1 |
| `public/models/props/kenney-nature/tree_default.glb` | 9,428 | 114 | same |
| `public/models/props/kenney-nature/plant_bush.glb` | 4,396 | 32 | same |
| `public/models/props/kenney-nature/flower_redA.glb` | 7,104 | 76 | same |
| `public/models/props/kenney-nature/License.txt` | 611 | — | same (CC0) |

Files are copied unchanged from archives whose SHA-256 matches Codex's D0 record. The `ASSETS.md` entries are in the Codex request; Codex is the only editor of `ASSETS.md`.

## 7. Open for D1

- Textured material support (finding 6) and open-geometry outlines (finding 4).
- Palette wood role (finding 3).
- Entrance offset relative to the node (interface note §4). The sample bakery is centered on its node, as today.
- Final citizen scale. The sample uses 3.29 (2× today's citizen).
