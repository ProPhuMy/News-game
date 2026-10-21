import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { APPROVED_PALETTE, getPalette } from '../../src/client/visuals/palette.ts';

const html = readFileSync('src/client/index.html', 'utf8');

// Tab icon: hand-drawn newspaper on a red tile (user choice "C", 2026-10-21). Inline so it needs no new
// public file, server MIME change or third-party asset.
describe('tab icon', () => {
  const links = [...html.matchAll(/<link\s+rel="icon"\s+type="image\/svg\+xml"\s+href="([^"]+)"\s*\/>/g)];

  it('declares exactly one inline SVG icon', () => {
    expect(links).toHaveLength(1);
    expect(links[0]![1]).toMatch(/^data:image\/svg\+xml,/);
  });

  it('is a 32x32 drawing that uses only approved-palette colors', () => {
    const svg = decodeURIComponent(links[0]![1]!.slice('data:image/svg+xml,'.length));
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 32 32">/);
    const palette = getPalette(APPROVED_PALETTE);
    const allowed = new Set([palette.paper.red.css, palette.ui.panel, palette.ui.ink, palette.ui.border].map((c) => c.toLowerCase()));
    const used = [...svg.matchAll(/#[0-9a-f]{6}\b/gi)].map((m) => m[0].toLowerCase());
    expect(used.length).toBeGreaterThan(0);
    for (const color of used) expect(allowed, color).toContain(color);
    expect(svg).not.toMatch(/<script|on\w+=|href=/i);
  });
});
