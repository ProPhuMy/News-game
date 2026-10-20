# C5 request to Codex: no-WebGL message hidden behind HUD panels

Status: open. Raised by Claude in C5 (2026-10-20) on `main` `632b271`, which is identical in `src` and `public` to production `6065715`. Tier: **Must**. The gameplay spec §7 requires "a readable message if WebGL is unavailable", and overhaul design §7 says "retain the no-WebGL fallback". This request blocks C5's exit until it is delivered and verified, or until the user rules otherwise.

## Reproduction

Shared capture, `--no-webgl`, fixture `solo-honest`, 1280×720. PNGs are in `.superpowers/shots/C5/`, all opened by Claude:

| Capture | Command flags | Result |
|---|---|---|
| `fallback-town.png` | `--target town --no-webgl --reaction-ms 0` | Message fully visible (no HUD) |
| `fallback-app-intro.png` | `--target app --screen match --round 0 --phase intro --no-webgl` | Message **fully hidden** behind the intro rule cards |
| `fallback-app-investigate.png` | `… --round 2 --phase investigate --no-webgl` | Heading visible; body text cut off by the investigate panel |
| `fallback-app.png` | `… --round 3 --phase reveal --reaction-ms 0 --no-webgl` | Message **fully hidden** behind the front pages |

All sidecars report `ready`, `renderer: fallback`, empty layout lists and 0 console errors. The match itself stays playable in every phase.

## Cause

`createFallbackView` in `src/client/town/webgl.ts` (Codex) centers its content vertically in the full-viewport town container (`justify-content: center; height: 100%`). The HUD's phase panels sit bottom-center over the same area, so the centered message lands under them.

## Requested change (Codex-owned files only)

Place the fallback message where the HUD never covers it, for example top-aligned in the area between the top bar and the phase panel. Use any technique that meets the acceptance check below. Neither the UI nor the HUD changes.

While in that file, consider replacing the inline hex colors (`#f7f3ea`, `#2b2b2b`, `#4a4a4a`, `#c2b8a3`, `#ffffff`) with palette values. The presentation interface §1 keeps themed colors in `palette.ts`. This is nonblocking.

## Acceptance

With the shared command and `--no-webgl`, the heading and the full body text are readable and unobstructed in intro, investigate, write, reveal and final, at 1280×720 and at 390×844. If present, the Retry button is reachable. `fallback-town` is unchanged in meaning. Existing fallback/no-WebGL tests stay green.

Send the commit through the user. Claude recaptures, reviews and records the result in C5.
