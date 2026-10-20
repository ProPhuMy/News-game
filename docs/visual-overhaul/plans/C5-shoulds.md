# C5 Should features — Claude implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver Claude's share of the five Should features the user scheduled on 2026-10-20: time-of-day looks, lamp glow, emote mapping, picket-sign prop and the latest-edition ticker. Codex builds the renderer side (lighting, emote drawing, sign attachment, read and react timing) against presentation interface §5c.

**Architecture:** Pure presentation modules in `src/client/visuals/` (time of day, emotes), two Claude props (lamp pool, picket sign), one `TownBuildings` method, one UI component, and a harness preview so the user can approve day and night before Codex wires it in. Every value derives from authoritative round and phase. There is no clock.

**Tech stack:** Existing TypeScript, React, Three.js, Vitest and the shared capture command. No dependencies.

**Spec:** overhaul design §3 (Should tier), §5 (gas lamps), §6 (emotes, picket signs, read/react), §7 (latest edition), §9. Interface: `presentation-interface.md` §5c (Claude-owned; Codex acknowledges before dependent code). Scope decision: C5 handoff §4.

## Global constraints

- Presentation only. No change to outcomes, routes, destinations, phase timing, the `src/shared/` contract or fixtures.
- Themed colors only in `palette.ts`. Untrusted text renders as text. Reduced motion is respected. At most 6 speech bubbles (unchanged).
- **D2 batching:** after ready, change only material values, never transforms, visibility or outlines of batched pieces.
- **User art rules:** a newspaper ticker along the top; night must feel like night, with glowing lamps, but not too dark; emotes are `!`, `?`, anger mark and `$`.
- Claude paths only. Codex's parts stay with Codex.

## Review focus

1. **Night readability:** hat colors, labels and street edges must stay readable at `night` (overhaul design §3). Check by capture and by a luminance test.
2. **Ticker with no headlines** (nobody published): it shows an empty-edition line, never a blank bar.
3. **Ticker with hostile or long text:** it renders as text and never pushes the top bar offscreen (`--stress-text`).
4. **Reduced motion:** the ticker stops animating and stays readable.
5. **Lamp level out of range or called after dispose:** values are clamped, and a call after dispose does nothing.

## Files and ownership (all Claude)

New: `src/client/visuals/time-of-day.ts`, `src/client/visuals/emotes.ts`, `src/client/town/props/picket.ts`, `src/client/ui/components/EditionTicker.tsx`, with tests `tests/visuals/time-of-day.test.ts`, `tests/visuals/emotes.test.ts`, `tests/town/props/picket.test.ts`, `tests/ui/EditionTicker.test.tsx`.

Modify: `src/client/visuals/palette.ts` (time tints), `src/client/town/props/street.ts` (lamp pool), `src/client/town/architecture/town.ts` and `src/client/town/buildings.ts` (`setLampLevel`), `src/client/ui/screens/AppRouter.tsx` or `HUD.tsx` (mount the ticker), `src/client/styles/hud.css`, the harness `src/client/visual-test/architecture*.ts` with `scripts/visual/args.ts` (`--time`, a `picket` view), and the matching tests.

## Task 1 — Time of day

- [ ] Failing tests in `tests/visuals/time-of-day.test.ts`:
  - `timeOfDay` follows the §5c mapping for every round and phase.
  - `timeOfDayLook(getPalette('b'), t)` exists for all six times.
  - `night.lightScale >= 0.55`.
  - Night sky relative luminance is at least 0.04 (not black), and morning through dusk keeps `lightScale` at 0.75 or more.
  - Every color is a palette value, either taken directly or blended from palette constants.
- [ ] Implement `time-of-day.ts`. Add `TIME_TINTS` (dusk orange, night blue) to `palette.ts`; blend those tints into each palette's sky, fog and ground.
- [ ] Harness: add `--time <TimeOfDay>` for `--target architecture --view town`. The architecture preview applies the look to its own lights and calls `setLampLevel`. Codex's production scene is not touched.
- [ ] Capture and open `arch-town` at all six times (palette b). Commit `visuals: time-of-day looks derived from round and phase`.

## Task 2 — Lamp glow

- [ ] Failing tests: the gas lamp has a named pool mesh with an owned additive material at opacity 0 at level 0. `setLampLevel(1)` raises the pool opacity and lantern emissive. Values clamp at −1 and 2. Transforms, visibility and outline counts are unchanged before and after. A call after dispose does nothing.
- [ ] Implement in `street.ts`, forward from `createArchitectureTown`, and add `setLampLevel` to the `TownBuildings` interface.
- [ ] Recapture night and dusk; lamps should glow with visible ground pools. Commit `town: lamp glow level for night`.

## Task 3 — Emote mapping

- [ ] Failing test: `EMOTE_FOR_BEHAVIOR` covers every `BEHAVIORS` entry exactly as §5c lists, and `MAX_VISIBLE_EMOTES === 8`.
- [ ] Implement `emotes.ts`. Commit `visuals: emote mapping for Codex`.

## Task 4 — Picket sign prop

- [ ] Failing tests:
  - Grip at the origin, board above it facing +Z, total height between 1.2 and 1.4.
  - Every `PICKET_SIGN_TEXTS` entry is at most 6 glyphs and renders with the existing pixel font.
  - Two signs with the same text share geometry and texture.
  - `dispose()` frees each resource once.
  - Palette surfaces only.
- [ ] Implement `props/picket.ts`, reusing the `signs.ts` glyph texture and `createPieceParts`.
- [ ] Harness `--view picket`: a row of signs beside a bakery. Capture and open it. Commit `props: picket sign for protesters`.

## Task 5 — Latest-edition ticker

- [ ] Failing tests in `tests/ui/EditionTicker.test.tsx`:
  - Renders every front page in seat order, with name, icon and headline as text (no HTML injection with `<b>`).
  - Shows the `EXPOSED` mark from data.
  - Empty list shows "No front pages this edition".
  - Has `role="region"` with the label "Latest edition".
  - The marquee duplicate is `aria-hidden`.
  - Renders only during `reveal` (router/HUD test).
- [ ] Implement `EditionTicker.tsx`, mount it under the top bar during reveal, and add CSS: a marquee keyframe, a static scrolling row under reduced motion, and a placement rule for phones.
- [ ] Capture and open reveal at 1280×720, 390×844 and 844×390, plus `--stress-text` and `--reduced-motion`. Layout lists must be empty. Commit `ui: latest-edition ticker during reveal`.

## Task 6 — Delivery

- [ ] `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`: all exit 0. Ownership audit.
- [ ] One fresh whole-branch review and one fix pass.
- [ ] Present the six time-of-day captures and the ticker captures to the user for art approval.
- [ ] Update interface §5c to final, request Codex's acknowledgment, and hand Codex the commit. Record it in the C5 handoff.

**After Codex delivers its parts:** new laptop FPS recording (busy reveal), redeploy and production smoke (Codex), then the C5 final screenshot review is redone with every feature, then D5.
