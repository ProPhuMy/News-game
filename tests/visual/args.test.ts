import { describe, expect, it } from 'vitest';
import { harnessPath, parseCaptureArgs } from '../../scripts/visual/args.ts';

describe('parseCaptureArgs', () => {
  it('fills defaults and requires only --out', () => {
    expect(parseCaptureArgs(['--out', 'shots/town.png'])).toEqual({
      target: 'town', fixture: 'solo-honest', round: 1, phase: 'reveal', reactionMs: 6000,
      reducedMotion: false, seed: 1, width: 1280, height: 720, out: 'shots/town.png', prod: false, timeoutMs: 60000,
      model: 'characters/kenney-mini/character-male-a.glb', clip: null, timeMs: 0, count: 1,
      screen: 'home', palette: 'a', stressText: false, tab: 0, scroll: null, blockFonts: false,
      variant: 'code', view: 'street',
    });
  });

  it('reads every flag', () => {
    const options = parseCaptureArgs([
      '--target', 'app', '--fixture', 'exposures', '--round', '2', '--phase', 'write', '--reaction-ms', '0',
      '--reduced-motion', '--seed', '9', '--width', '390', '--height', '844', '--out', 'a.png', '--prod', '--timeout-ms', '5000',
    ]);
    expect(options).toMatchObject({ target: 'app', fixture: 'exposures', round: 2, phase: 'write', reactionMs: 0,
      reducedMotion: true, seed: 9, width: 390, height: 844, prod: true, timeoutMs: 5000 });
  });

  it('rejects a missing or non-png --out', () => {
    expect(() => parseCaptureArgs([])).toThrow(/--out <file.png> is required/);
    expect(() => parseCaptureArgs(['--out', 'a.jpg'])).toThrow(/--out must end with .png/);
  });

  it('rejects unknown flags and bad numbers', () => {
    expect(() => parseCaptureArgs(['--out', 'a.png', '--zoom', '2'])).toThrow(/unknown flag --zoom/);
    expect(() => parseCaptureArgs(['--out', 'a.png', '--width', 'wide'])).toThrow(/--width must be a whole number/);
    expect(() => parseCaptureArgs(['--out', 'a.png', '--target', 'ui'])).toThrow(/--target must be town, app, character or architecture/);
  });

  it('rejects the town target in --prod mode because the harness is dev-only', () => {
    expect(() => parseCaptureArgs(['--out', 'a.png', '--prod'])).toThrow(/--prod only supports --target app/);
  });
});

describe('harnessPath', () => {
  it('encodes the scenario into the harness URL', () => {
    const options = parseCaptureArgs(['--out', 'a.png', '--round', '3', '--reduced-motion']);
    expect(harnessPath(options)).toBe(
      '/visual-test/index.html?fixture=solo-honest&round=3&phase=reveal&reactionMs=6000&reducedMotion=true&seed=1&palette=a',
    );
  });
});

describe('character target', () => {
  it('reads the inspection flags', () => {
    expect(parseCaptureArgs([
      '--target', 'character', '--model', 'characters/kenney-mini/character-female-b.glb',
      '--clip', 'walk', '--time-ms', '750', '--count', '30', '--out', 'c.png',
    ])).toMatchObject({ target: 'character', model: 'characters/kenney-mini/character-female-b.glb', clip: 'walk', timeMs: 750, count: 30 });
  });

  it('rejects --prod because the harness is dev-only', () => {
    expect(() => parseCaptureArgs(['--target', 'character', '--prod', '--out', 'c.png'])).toThrow(/--prod only supports --target app/);
  });

  it('encodes the inspection scenario, leaving clip out for the bind pose', () => {
    const bind = parseCaptureArgs(['--target', 'character', '--out', 'c.png']);
    expect(harnessPath(bind)).toBe(
      '/visual-test/index.html?scene=inspect-character&model=characters%2Fkenney-mini%2Fcharacter-male-a.glb&timeMs=0&count=1&seed=1',
    );
    const walk = parseCaptureArgs(['--target', 'character', '--clip', 'walk', '--time-ms', '500', '--out', 'c.png']);
    expect(harnessPath(walk)).toContain('&clip=walk&timeMs=500&');
  });
});

describe('app screens', () => {
  it('reads the UI flags', () => {
    expect(parseCaptureArgs([
      '--target', 'app', '--screen', 'match', '--palette', 'c', '--stress-text', '--tab', '3',
      '--scroll', '.results-body', '--block-fonts', '--out', 'u.png',
    ])).toMatchObject({ screen: 'match', palette: 'c', stressText: true, tab: 3, scroll: '.results-body', blockFonts: true });
  });

  it('rejects bad UI flag values', () => {
    expect(() => parseCaptureArgs(['--target', 'app', '--screen', 'shop', '--out', 'u.png'])).toThrow(/--screen must be one of home, join, lobby, match, loading, disconnected, error/);
    expect(() => parseCaptureArgs(['--palette', 'd', '--out', 'u.png'])).toThrow(/--palette must be a, b or c/);
    expect(() => parseCaptureArgs(['--tab', '-1', '--out', 'u.png'])).toThrow(/--tab must be a whole number/);
    expect(() => parseCaptureArgs(['--target', 'app', '--scroll', '', '--out', 'u.png'])).toThrow(/--scroll needs a CSS selector/);
    expect(() => parseCaptureArgs(['--target', 'app', '--screen', 'match', '--prod', '--out', 'u.png'])).toThrow(/--prod supports only --screen home/);
  });

  it('sends live screens to the real app and fixture screens to the UI harness', () => {
    expect(harnessPath(parseCaptureArgs(['--target', 'app', '--screen', 'lobby', '--out', 'u.png']))).toBe('/');
    expect(harnessPath(parseCaptureArgs([
      '--target', 'app', '--screen', 'match', '--round', '5', '--phase', 'final', '--palette', 'b', '--stress-text', '--out', 'u.png',
    ]))).toBe('/visual-test/app.html?fixture=solo-honest&round=5&phase=final&reactionMs=6000&reducedMotion=false&seed=1&screen=match&palette=b&stressText=true');
  });

  it('passes the palette to the town harness for D1', () => {
    expect(harnessPath(parseCaptureArgs(['--palette', 'b', '--out', 't.png']))).toContain('&palette=b');
  });
});

describe('architecture target', () => {
  it('builds the harness path with variant, view and palette', () => {
    const options = parseCaptureArgs(['--target', 'architecture', '--variant', 'hybrid-original', '--out', 'x.png']);
    expect(options).toMatchObject({ target: 'architecture', variant: 'hybrid-original', view: 'street', palette: 'a' });
    expect(harnessPath(options)).toBe('/visual-test/index.html?scene=architecture&variant=hybrid-original&view=street&palette=a&seed=1&reactionMs=6000&reducedMotion=false');
    const close = parseCaptureArgs(['--target', 'architecture', '--view', 'awning', '--palette', 'b', '--out', 'x.png']);
    expect(harnessPath(close)).toContain('variant=code&view=awning&palette=b');
    const timed = parseCaptureArgs(['--target', 'architecture', '--reaction-ms', '1000', '--reduced-motion', '--out', 'x.png']);
    expect(harnessPath(timed)).toContain('reactionMs=1000&reducedMotion=true');
  });

  it('rejects bad values and use outside the architecture target', () => {
    expect(() => parseCaptureArgs(['--target', 'architecture', '--variant', 'kit', '--out', 'x.png'])).toThrow(/--variant must be one of/);
    expect(() => parseCaptureArgs(['--target', 'architecture', '--view', 'top', '--out', 'x.png'])).toThrow(/--view must be one of/);
    expect(() => parseCaptureArgs(['--variant', 'code', '--out', 'x.png'])).toThrow(/--variant and --view need --target architecture/);
    expect(() => parseCaptureArgs(['--target', 'architecture', '--prod', '--out', 'x.png'])).toThrow(/--prod only supports --target app/);
  });
});
