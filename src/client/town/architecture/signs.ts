// Pixel-font signboards (owner: Claude): a trim board with a nearest-filtered 5x7 text face.
import * as THREE from 'three';
import type { ArchitectureContext } from '../../visuals/town-types.ts';
import { at, type PieceParts } from './piece.ts';

const g = (...rows: string[]): readonly string[] => rows;
export const SIGN_GLYPHS: Readonly<Record<string, readonly string[]>> = {
  A: g('.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'),
  B: g('####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'),
  C: g('.####', '#....', '#....', '#....', '#....', '#....', '.####'),
  E: g('#####', '#....', '#....', '####.', '#....', '#....', '#####'),
  H: g('#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'),
  I: g('#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'),
  K: g('#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'),
  L: g('#....', '#....', '#....', '#....', '#....', '#....', '#####'),
  N: g('#...#', '##..#', '##..#', '#.#.#', '#..##', '#..##', '#...#'),
  O: g('.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'),
  R: g('####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'),
  T: g('#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'),
  W: g('#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'),
  Y: g('#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'),
  ' ': g('.....', '.....', '.....', '.....', '.....', '.....', '.....'),
};

const GW = 5;
const GH = 7;
const GAP = 1;
const MARGIN = 1;

function rgba(hex: number): [number, number, number, number] {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255, 255];
}

function glyphTexture(ctx: ArchitectureContext, text: string): { texture: THREE.DataTexture; w: number; h: number } {
  const glyphs = [...text].map((ch) => {
    const glyph = SIGN_GLYPHS[ch];
    if (!glyph) throw new Error(`no glyph for "${ch}"`);
    return glyph;
  });
  const w = glyphs.length * (GW + GAP) - GAP + 2 * MARGIN;
  const h = GH + 2 * MARGIN;
  const ink = rgba(ctx.palette.town.outline);
  const board = rgba(ctx.palette.town.trim);
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set(board, i * 4);
  glyphs.forEach((glyph, gi) => {
    glyph.forEach((row, y) => {
      for (let x = 0; x < GW; x++) {
        if (row[x] !== '#') continue;
        // DataTexture row 0 is the bottom, so flip the bitmap vertically.
        const px = MARGIN + gi * (GW + GAP) + x;
        const py = h - 1 - (MARGIN + y);
        data.set(ink, (py * w + px) * 4);
      }
    });
  });
  const texture = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return { texture, w, h };
}

/** Signboard of the given height; width follows the text at the glyph aspect. Face is on +Z. */
export function createSignboard(ctx: ArchitectureContext, parts: PieceParts, text: string, height: number): THREE.Group {
  const { texture, w, h } = glyphTexture(ctx, text);
  const width = (height * w) / h;
  const group = new THREE.Group();
  group.name = `sign-${text}`;
  const board = parts.mesh(new THREE.BoxGeometry(width + 0.1, height + 0.1, 0.08), ctx.palette.town.trim);
  group.add(board);
  const source = parts.own(new THREE.MeshStandardMaterial({ map: parts.own(texture) }));
  const face = new THREE.Mesh(parts.own(new THREE.PlaneGeometry(width, height)), ctx.materials.preserve(source));
  face.name = `sign-face-${text}`;
  group.add(at(face, 0, 0, 0.045));
  return group;
}
