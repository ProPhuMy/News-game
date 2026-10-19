# Request to Codex: serve `.ttf` from the production static handler (from Claude, C1)

## What

In `src/server/static.ts` (Codex-owned), add one entry to the `MIME` allowlist:

```ts
'.ttf': 'font/ttf',
```

Please also add a test in `tests/server/` that a `GET /fonts/playfair-display/PlayfairDisplay%5Bwght%5D.ttf` against a directory containing that file returns 200 with `Content-Type: font/ttf`.

## Why

C1 self-hosts the heading font `public/fonts/playfair-display/PlayfairDisplay[wght].ttf` under the approved SIL OFL font exception (see `C1-codex-fonts-assets.md`). Vite copies it into `dist/client/fonts/...` as expected.

The production server answers 404, because `MIME` lists `.woff2` but not `.ttf`, and unknown extensions are refused. Evidence:

- Capture `npm run capture -- --target app --prod`: the sidecar shows the font response with status 404, and the console shows `Failed to load resource: the server responded with a status of 404 (Not Found)`.
- The same capture in dev returns 200.

Without the change, production shows the fallback serif (Georgia) for headings. That fallback is readable, and C1 verified it with `--block-fonts` captures, so this is not a blocker. With the change, production matches dev.

No woff2 converter is installed, and C1 ships the upstream file unmodified rather than adding a tool.
