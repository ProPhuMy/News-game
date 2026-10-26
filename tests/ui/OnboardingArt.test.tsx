/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { StepArt } from '../../src/client/ui/components/OnboardingArt';
import { COLORS } from '../../src/shared/ids';
import { PALETTES, getPalette, type PaletteId } from '../../src/client/visuals/palette';

const css = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
function allowed(id: PaletteId): Set<string> {
  const p = getPalette(id);
  return new Set([...Object.values(p.ui), ...Object.values(p.town).map(css), ...COLORS.map((c) => p.paper[c].css),
    p.unsubscribed.css, p.illustration.skin].map((c) => c.toLowerCase()));
}

describe('onboarding illustrations (approved mini-comic)', () => {
  afterEach(cleanup);

  it.each([1, 2, 3] as const)('step %i is one decorative, text-free 320x220 drawing', (step) => {
    const { container } = render(<StepArt step={step} palette={getPalette('b')} />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs).toHaveLength(1);
    expect(svgs[0]!.getAttribute('viewBox')).toBe('0 0 320 220');
    expect(svgs[0]!.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('text')).toBeNull();
    expect(container.querySelectorAll('*').length).toBeGreaterThan(20);
  });

  it.each(Object.keys(PALETTES) as PaletteId[])('uses only palette %s colors', (id) => {
    for (const step of [1, 2, 3] as const) {
      const { container } = render(<StepArt step={step} palette={getPalette(id)} />);
      const used = [...container.querySelectorAll('[fill],[stroke]')].flatMap((el) => [el.getAttribute('fill'), el.getAttribute('stroke')])
        .filter((c): c is string => !!c && c !== 'none' && !c.startsWith('url('));
      expect(used.length).toBeGreaterThan(0);
      for (const color of used) expect(allowed(id), `${id} step ${step}: ${color}`).toContain(color.toLowerCase());
      cleanup();
    }
  });

  it('gives each drawing its own corner clip id', () => {
    const { container } = render(<>{[1, 2, 3].map((s) => <StepArt key={s} step={s as 1 | 2 | 3} palette={getPalette('b')} />)}</>);
    const ids = [...container.querySelectorAll('clipPath')].map((c) => c.id);
    expect(new Set(ids).size).toBe(3);
  });
});
