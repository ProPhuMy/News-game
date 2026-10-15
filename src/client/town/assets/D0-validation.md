# D0 runtime / asset validation — Codex

Status: **in progress**, branch `codex/visual-d0`, merged C0 base `06db5fa`. No D0.5/D1 work has started. The user authorized starting D0 after C0's merged evidence and recorded interface acknowledgment. The gameplay renderer remains unchanged.

## Gate and baseline

C0 evidence: `docs/visual-overhaul/handoffs/C0.md` and the acknowledged presentation interface. Ownership bootstrap `3c02902`, shared capture final fixes `0920aa3`, acknowledgment `a953d95`, handoff `06db5fa` are all in the consumed main base. Remote pull was attempted but failed (`Permission denied (publickey)`); this evidence is against that local merged base.

Ran `npm install`: 216 packages audited, 0 vulnerabilities. Ran `npm run capture -- --out /tmp/news-town-d0/baseline.png` and directly opened the PNG: elevated grey-road/green-lot grid, central blue fountain, four simple target buildings and scattered small grey citizens; offices remain partly cropped. The capture/sidecar are local scratch artifacts; scenario is solo-honest, round 1 reveal, 6000 ms, seed 1, 1280×720. This is the existing game, not imported-character visual proof. Reproduce through the C0 command; no alternate screenshot stack was introduced.

Current citizen 0 was measured with Three.js world bounds at its default pose: width 0.72000003, height 1.64485570, depth 0.74000001 world units, 448 triangles, three unique materials. Initial D1 evaluation height is twice that baseline (3.28971140), not twice the candidate's native height. Final scale remains the D1 sample decision; do not alter shared map coordinates.

## Character recommendation and original evidence

**Kenney Mini Characters 1 (1.0)** is the recommended D1 candidate, subject to the remaining viewed-candidate evidence and D1 art approval.

- Primary author listing: https://opengameart.org/content/mini-character-1
- Download: https://opengameart.org/sites/default/files/kenney_mini-characters.zip
- Retrieved 2026-10-15; 2,403,165 bytes; SHA-256 `a95a02b556735246570549d0c4a1fcd13ea46ede18187c63d463575a56fd6e1d`.
- Actual archive `License.txt` says Creative Commons Zero / CC0, including commercial use. Original license is preserved at `public/models/characters/kenney-mini/License.txt`; attribution appended to ASSETS.md.
- Twelve original character GLBs (female/male a–f, 3,038,516 bytes combined) and their shared local `Textures/colormap.png` are retained under `public/models/characters/kenney-mini/`. FBX/OBJ alternatives and assistive objects are not needed for this validation and were not imported. No conversion tool or new dependency is needed.
- Each GLB actually has **32 animations**, unlike the contradictory third-party claim that the pack is unanimated. All twelve use the same named joint sequence: `root`, `leg-left`, `leg-right`, `torso`, `arm-left`, `arm-right`, `head`; hierarchy/track compatibility must still be respected when reusing clips. Two skinned meshes/skeleton objects per character, one atlas material.
- Triangles by original variant: female a 876, b 742, c 732, d 797, e 756, f 788; male a 723, b 690, c 793, d 711, e 710, f 701. Thirty copies therefore contribute roughly 20,700–26,280 character triangles before hats/outlines/shadows, not a measured frame-rate result.
- Native bind-pose heights range 0.6613–0.7928 world units; units differ from the town. Y-up, approximately ground-based. The bind pose spreads the arms, so bounds are not the final walk silhouette. Forward orientation and exact hat placement still need the viewed candidate scenario; no source axis convention is guessed from a name.
- Material `colormap`: a base-color atlas texture, metallic factor 0, double-sided. Keep UVs and useful atlas detail; a flat material replacing every color would erase the character design. Texture is a local PNG; no external URLs are embedded. D1 must reopen the presentation note's textured material support before adopting an atlas-preserving toon material.

### Animation and attachment observations

Browser import used existing Three.js GLTFLoader/SkeletonUtils and Claude's `withBrowserAndServer`, software-WebGL launch configuration and existing C0 harness page. The probe did **not** introduce another screenshot command. Evidence is `D0-character-evidence.json`; source experiment lives in the ignored plan workspace and can be rerun locally. It is a load/pose inspection, not a visually approved art sample.

- All twelve imported with the real local texture and no console errors; every animation track target resolved (zero missing nodes across all 384 clips).
- Mapped idle → `idle` (1.3333 s), walk → `walk` (0.6667 s), run → `sprint` (0.5 s). Sampling 0.3 and 0.7 s changes the head transform in these clips.
- No dedicated cheer/read clip exists. `emote-yes` is a 0.6667 s nod, **not** claimed to be cheer; `holding-both` is a short static holding pose (0.1667 s), **not** claimed to show reading. The approved D1 fallback is a simple procedural arm/reading gesture compatible with this rig, layered without deciding gameplay behavior. Its visual proof remains due before the D1 gate.
- `head` is an actual Bone and accepts a child attachment. Changing one SkeletonUtils-cloned head does not alter the second clone's quaternion. Thirty independent clones per variant produce 60 distinct skeleton objects and each walk mixer advances. Shared geometries/textures must be disposed once by the owning cache; mixers stop/uncache per instance. No GPU memory plateau is claimed by these CPU-side checks.
- Candidate clip appearance, moving hat stability and crowd readability still require direct PNG inspection through the shared harness. These are explicit pending requirements, not waived by numeric metadata.

## Building/prop/nature handoff to Claude (research only)

These archives were downloaded and their actual license/model files read in `/tmp/news-town-d0/`; nothing was copied into Claude-owned directories or selected as the final building approach.

| Candidate | Local license and actual contents | Material/import implication |
| --- | --- | --- |
| KayKit City Builder Bits 1.0 | `kaykit/KayKit-City-Builder-Bits-1.0-main/addons/kaykit_city_builder_bits/Assets/LICENSE.txt` explicitly CC0; 41 glTF models | `bench.gltf` uses `citybits_texture.png`, metallic 0, roughness about 0.4; imported atlas/material adaptation required. Bench local width 0.4, height 0.1, depth 0.15; do not assume the same scale as Kenney. Modern cars/traffic lights remain poor era fit. |
| Kenney City Kit Commercial 2.1 | `commercial/License.txt` explicitly CC0; actual distribution has 41 GLBs | `detail-awning.glb` has external local `Textures/colormap.png`, a double-sided atlas material and metallic 0. Useful storefront/awning candidate; signature details remain custom. |
| Kenney Nature Kit 2.1 | `nature/License.txt` explicitly CC0; 329 GLBs | `tree_small.glb` has separate `woodBark` / `leafsGreen` base-color materials and no images. Original metallic factor 1 should not silently survive a toon conversion. Useful texture-free foliage candidate. |

Archive evidence:

- KayKit: https://codeload.github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0/zip/refs/heads/main ; 958,876 bytes; SHA-256 `0d1a41ef653751fcd718a57531c29d600be61eb71700cb7f062f75cdea0d7e0b`. This is a moving branch URL; preserve the archive hash.
- Commercial: https://opengameart.org/sites/default/files/kenney_city-kit-commercial_2.1.zip ; 4,096,974 bytes; SHA-256 `f8b09b081c2bb88bcc126e2dec1cb40fd0dad7e7e591b6c26aaefe96fb35276b`.
- Nature: https://opengameart.org/sites/default/files/Nature%20Kit%20%282.1%29.zip ; 10,537,521 bytes; SHA-256 `fa7974a0d342bfe63c38664ba9f8ec1a4aab8ea25f099bdc56870e33588c4d9d`.

Quaternius character fallback is unnecessary while the first character choice remains viable; no Quaternius pack is approved by this report. The three-pack visual coherence decision, final building-source approach and palette belong to D1 after D0.5/C2; these license checks do not preempt those gates.

## Remaining D0 handoff / gate

Claude owns the shared capture harness. Requested a D0 inspection scenario in that harness (user relay pending), not a second screenshot implementation. Needed contract:

- Explicit dev-only candidate selection (local character URL), clip name, timestamp, viewport and count (single / thirty), using the existing capture readiness/error/nonempty rules.
- Load and advance the actual candidate, render a head-attached paper-colored test hat and independent clone poses, then capture using the same CLI; direct viewing by Codex.
- Claude supplied the reviewed entry contract through the user. Codex implemented `createInspectionScene(options)` in `inspection-scene.ts`: `container`, borrowed `renderer`, local `modelUrl`, nullable `clip`; returns `whenReady(): Promise<SceneReadiness & { clips: readonly string[] }>`, `setTime(ms)` and idempotent `dispose()`. The renderer remains caller-owned. Readiness imports the existing harness type until Claude creates its canonical presentation type; no parallel contract is declared. The implementation owns only its loaded model/test hat, runs no RAF loop, rejects unsafe model URLs/load failure/unknown clips, and poses exact milliseconds through AnimationMixer. The normal game is unchanged. Thirty-clone poses have numerical evidence; the reviewed single-model interface still needs an agreed count extension for rendered crowd evidence.
- Include missing-model failure and cleanup/recreate evidence; record actual software-rendering limits. A placeholder or blank canvas is not success.

**D0 is not complete** until the viewed candidate/hat/clip/crowd evidence and counterpart handoff review are present, all required checks pass and the owned delivery is committed. D0.5 remains next, with no staging or later-phase work started.

## Checks on this partial delivery

- `npm run test -- tests/town/assets/inspect-character.test.ts`: 3 passed; all three were first observed failing on missing measurements/binding validation before implementation. `inspection-scene.test.ts` adds 3 passing boundary/pose/disposal tests (entry module was absent on the initial test run).
- `npm test -- --maxWorkers=2`: 77 files, **404 passed**.
- `npm run typecheck`, `npm run lint`, `npm run build`: passed. Existing >500 kB bundle warning remains; this candidate/inspector is not imported by the production game entry point.
- Candidate browser probe: all 12 real GLBs imported, 384 clips have no missing track nodes, independent clones/mixers checked, 0 console errors. Exact report: `D0-character-evidence.json`. This is an experiment, not an additional automated acceptance test or screenshot proof.
- Shader/outline/shadow appearance, missing-asset visual handling, viewed animated candidate and thirty-character rendered performance/memory acceptance remain unverified. Keep the phase open.

Claude handoff for the implemented entry: model argument `characters/kenney-mini/character-male-a.glb` maps to `/models/characters/kenney-mini/character-male-a.glb`; use clips `idle`, `walk`, `sprint`, and bind pose (`null`). `head` carries a red test cap. Unknown clips and load errors reject readiness; there are no degraded stand-ins in this inspection scene. A local dev-only scene with basic lights checks import correctness; it is not the D1 toon/palette/art sample.

### Inspection entry verification

Final partial-delivery suite after adding the agreed entry point: **407 tests / 78 files passed**, typecheck, lint and build passed. Real browser entry probe rendered the selected GLB in bind pose / idle / walk / sprint at 300 ms: 384 / 376 / 364 / 398 distinct canvas colors respectively, no blank frame. Posing 700 ms then returning to 300 ms reproduced those counts (not a byte-identical PNG claim). Missing local GLB rejected readiness (Vite's HTML fallback produced a JSON parse error); no stand-in was certified. Probe output is `/tmp/news-town-d0/entry-probe.json`.

The first dynamic-import entry probe was interrupted by a Vite navigation (`Execution context was destroyed`); a fresh run after dependency optimization passed. This is recorded separately from model import failure. No direct-view character PNG is claimed by these pixel counts.

The supplier's original License.txt keeps its CRLF/blank-line whitespace, so `git diff --check` reports that vendor file; authored source/doc whitespace is checked separately. No license content has been rewritten merely to silence whitespace diagnostics.

## Count contract and capture handoff (supersedes pending scenario notes above)

Acknowledged Claude's `b6faba1` presentation-interface §5a contract: `count?: number`, integer 1–30, default 1; readiness now reports required `instances: number`. Thirty SkeletonUtils-cloned characters receive independent mixers; shared geometry/materials/textures and skeletons are released once by this inspection view. Camera framing is calculated after posing, from all current mesh bounds including the attached hats, using a padded bounding sphere and the smaller horizontal/vertical FOV.

The count/framing tests first failed on missing instance reporting, absent count validation, and projected bounds outside the viewport; after the fix, all 6 inspection tests pass. Owned branch verification: 410 tests passed; typecheck, lint and build passed (existing bundle warning).

Because the user's merge order controls main, captures used a disposable composition: Claude harness `b6faba1` plus Codex `ad27dd3` and the count/framing patch committed with this report. No Claude-owned source was edited or committed on Codex's branch. Both deliveries must be present in the final checkout; either user's merge order is safe for building, but candidate capture fails until the entry and assets are available. This is integration evidence, not a merge into main.

Used the shared command `npm run capture -- --target character ...`; directly opened these PNGs:

| Local PNG | Inputs | Direct visual observation |
| --- | --- | --- |
| `/tmp/news-town-d0/walk-framed.png` | male-a, walk, 300 ms, count 1, 1280×720 | Full character and complete red cap inside frame, clear face/atlas detail. |
| `/tmp/news-town-d0/crowd30.png` | male-a, walk, 300 ms, count 30, 1280×720 | Thirty distinct figures arranged on the ground, all inside the image; readiness reports 30. |
| `/tmp/news-town-d0/idle.png` | male-a, idle, 500 ms | Complete cap and idle figure; no blank canvas. |
| `/tmp/news-town-d0/sprint.png` | male-a, sprint, 250 ms | Imported sprint pose and complete cap. |
| `/tmp/news-town-d0/walk-narrow.png` | male-a, walk, 300 ms, 390×844 | Complete figure/cap visible with generous framing; no edge clipping. |
| `/tmp/news-town-d0/female-walk.png` | female-a, walk, 300 ms | This variant includes crutches; generic test cap sits high above its hair. D1 must choose variants deliberately and fit final hats per head/hairstyle. Not an approved final hat design. |

`crowd30-repeat.png` used the identical crowd inputs; `cmp` succeeded and both PNGs have SHA-256 `90a7f1db09dad233d4cf3d5ba998cff6e90028b7190a2db22986182f523aec92`. All seven captures report ready and zero console errors. `D0-capture-evidence.json` preserves complete scenario/instance/error/hash records. Assets face the +Z inspection camera and are Y-up; final art framing and scale remain D1 choices.

These are import-validation images with basic lights and a generic red test cap, not the D1 toon/outline/shadow/palette sample or a laptop FPS result. Counterpart review of this updated entry/capture evidence and final D0 exit disposition remain pending. No D0.5 staging work started.

Combined harness/renderer verification (`b6faba1` plus owned count/framing patch): **425 tests / 79 files passed**, typecheck, lint and build passed. Own branch suite remains 410/410. No harness/CLI/config file was copied into the Codex commit; only disposable integration checkout used the combination.
