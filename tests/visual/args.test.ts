import { describe, expect, it } from 'vitest';
import { chromiumArgs, harnessPath, parseCaptureArgs } from '../../scripts/visual/args.ts';

describe('parseCaptureArgs', () => {
  it('fills defaults and requires only --out', () => {
    expect(parseCaptureArgs(['--out', 'shots/town.png'])).toEqual({
      target: 'town', fixture: 'solo-honest', round: 1, phase: 'reveal', reactionMs: 6000,
      reducedMotion: false, seed: 1, width: 1280, height: 720, out: 'shots/town.png', prod: false, timeoutMs: 60000,
      model: 'characters/kenney-mini/character-male-a.glb', clip: null, timeMs: 0, count: 1,
      screen: 'home', palette: 'b', stressText: false, tab: 0, scroll: null, blockFonts: false,
      variant: 'code', view: 'street', citizenHeight: null, crowdLayout: 'comparison', noWebgl: false, contextCycle: false,
      playerName: null, paperName: null, correctPlayerName: null, correctPaperName: null, expectError: null,
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
    expect(() => parseCaptureArgs(['--out', 'a.png', '--target', 'ui'])).toThrow(/--target must be town, app, character, architecture or crowd/);
  });

  it('rejects the town target in --prod mode because the harness is dev-only', () => {
    expect(() => parseCaptureArgs(['--out', 'a.png', '--prod'])).toThrow(/--prod only supports --target app/);
  });
});

describe('harnessPath', () => {
  it('encodes the scenario into the harness URL', () => {
    const options = parseCaptureArgs(['--out', 'a.png', '--round', '3', '--reduced-motion']);
    expect(harnessPath(options)).toBe(
      '/visual-test/index.html?fixture=solo-honest&round=3&phase=reveal&reactionMs=6000&reducedMotion=true&seed=1&palette=b',
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

  it('rejects a non-production palette on live screens only', () => {
    const live = ['--target', 'app', '--screen', 'lobby', '--palette', 'a', '--out', 'u.png'];
    expect(() => parseCaptureArgs(live)).toThrow('live screens render the production palette (b); --palette a applies only to harness screens');
    expect(parseCaptureArgs(['--target', 'app', '--screen', 'lobby', '--palette', 'b', '--out', 'u.png']).palette).toBe('b');
    expect(parseCaptureArgs(['--target', 'app', '--screen', 'match', '--palette', 'a', '--out', 'u.png']).palette).toBe('a');
  });

  it('passes the palette to the town harness for D1', () => {
    expect(harnessPath(parseCaptureArgs(['--palette', 'b', '--out', 't.png']))).toContain('&palette=b');
  });
});

describe('architecture target', () => {
  it('builds the harness path with variant, view and palette', () => {
    const options = parseCaptureArgs(['--target', 'architecture', '--variant', 'hybrid-original', '--out', 'x.png']);
    expect(options).toMatchObject({ target: 'architecture', variant: 'hybrid-original', view: 'street', palette: 'b' });
    expect(harnessPath(options)).toBe('/visual-test/index.html?scene=architecture&variant=hybrid-original&view=street&palette=b&seed=1&reactionMs=6000&reducedMotion=false');
    expect(parseCaptureArgs(['--target', 'architecture', '--view', 'town', '--out', 'x.png']).view).toBe('town');
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

describe('crowd and no-webgl flags', () => {
  it('parses a crowd capture into its harness URL', () => {
    const options = parseCaptureArgs(['--target', 'crowd', '--citizen-height', '3.29', '--palette', 'b', '--reaction-ms', '0', '--out', 'c.png']);
    expect(options.citizenHeight).toBe(3.29);
    const query = new URLSearchParams(harnessPath(options).split('?')[1]);
    expect(Object.fromEntries(query)).toEqual({ scene: 'crowd', height: '3.29', palette: 'b', reactionMs: '0', seed: '1', layout: 'comparison' });
  });

  it('forwards --crowd-layout, defaulting to comparison', () => {
    const base = ['--target', 'crowd', '--citizen-height', '1.8', '--out', 'c.png'];
    expect(parseCaptureArgs(base).crowdLayout).toBe('comparison');
    const production = parseCaptureArgs([...base, '--crowd-layout', 'production']);
    expect(new URLSearchParams(harnessPath(production).split('?')[1]).get('layout')).toBe('production');
    expect(() => parseCaptureArgs([...base, '--crowd-layout', 'grid'])).toThrow(/--crowd-layout must be comparison or production, got "grid"/);
    expect(() => parseCaptureArgs(['--target', 'town', '--crowd-layout', 'production', '--out', 'c.png'])).toThrow(/--crowd-layout needs --target crowd/);
  });

  it('accepts --context-cycle only for WebGL town captures', () => {
    const options = parseCaptureArgs(['--target', 'town', '--context-cycle', '--out', 't.png']);
    expect(new URLSearchParams(harnessPath(options).split('?')[1]).get('contextCycle')).toBe('true');
    expect(new URLSearchParams(harnessPath(parseCaptureArgs(['--out', 't.png'])).split('?')[1]).has('contextCycle')).toBe(false);
    expect(() => parseCaptureArgs(['--target', 'app', '--screen', 'match', '--context-cycle', '--out', 't.png'])).toThrow(/--context-cycle supports only --target town/);
    expect(() => parseCaptureArgs(['--target', 'town', '--context-cycle', '--no-webgl', '--out', 't.png'])).toThrow(/--context-cycle needs WebGL; drop --no-webgl/);
  });

  it('rejects missing, malformed and out-of-range citizen heights', () => {
    const base = ['--target', 'crowd', '--out', 'c.png'];
    expect(() => parseCaptureArgs(base)).toThrow(/--citizen-height is required/);
    for (const bad of ['abc', '0.4', '6.1', '-1', 'Infinity', '']) {
      expect(() => parseCaptureArgs([...base, '--citizen-height', bad])).toThrow(/--citizen-height must be a number between 0.5 and 6/);
    }
    expect(() => parseCaptureArgs(['--citizen-height', '3', '--out', 'c.png'])).toThrow(/--citizen-height needs --target crowd/);
  });

  it('adds noWebgl=true to town and app URLs and only those targets', () => {
    expect(harnessPath(parseCaptureArgs(['--no-webgl', '--out', 't.png']))).toContain('noWebgl=true');
    expect(harnessPath(parseCaptureArgs(['--target', 'app', '--screen', 'match', '--no-webgl', '--out', 'a.png']))).toContain('noWebgl=true');
    expect(harnessPath(parseCaptureArgs(['--out', 't.png']))).not.toContain('noWebgl');
    for (const target of ['character', 'architecture']) {
      expect(() => parseCaptureArgs(['--target', target, '--no-webgl', '--out', 'x.png'])).toThrow(/--no-webgl supports only --target town or app/);
    }
    expect(() => parseCaptureArgs(['--target', 'crowd', '--citizen-height', '3', '--no-webgl', '--out', 'x.png'])).toThrow(/--no-webgl supports only/);
  });

  it('launches without ANGLE/SwiftShader and with webgl disabled for --no-webgl', () => {
    expect(chromiumArgs(false)).toContain('--use-angle=swiftshader');
    const off = chromiumArgs(true);
    expect(off).toEqual(['--disable-webgl', '--disable-3d-apis']);
  });
});

describe('join name flags and live --no-webgl', () => {
  const live = ['--target', 'app', '--screen', 'lobby', '--out', 'j.png'];

  it('parses the three name flags on the live lobby', () => {
    expect(parseCaptureArgs([...live, '--player-name', 'Daily Shit', '--paper-name', 'P', '--correct-player-name', 'Ada']))
      .toMatchObject({ playerName: 'Daily Shit', paperName: 'P', correctPlayerName: 'Ada' });
  });

  it('parses --expect-error and --correct-paper-name, which need a name flag and a value', () => {
    expect(parseCaptureArgs([...live, '--paper-name', 'P', '--correct-paper-name', 'Q', '--expect-error', 'not allowed']))
      .toMatchObject({ correctPaperName: 'Q', expectError: 'not allowed' });
    expect(() => parseCaptureArgs([...live, '--correct-paper-name', 'Q'])).toThrow(/--correct-paper-name needs --paper-name/);
    expect(() => parseCaptureArgs([...live, '--expect-error', 'x'])).toThrow(/--expect-error needs --player-name or --paper-name/);
    for (const flag of ['--correct-paper-name', '--expect-error']) {
      expect(() => parseCaptureArgs([...live, '--paper-name', 'P', flag, ' '])).toThrow(/needs a non-empty value/);
      expect(() => parseCaptureArgs(['--target', 'app', '--screen', 'join', flag, 'x', '--out', 'j.png'])).toThrow(/need --target app --screen lobby/);
    }
  });

  it('rejects name flags outside --target app --screen lobby', () => {
    for (const flag of ['--player-name', '--paper-name', '--correct-player-name']) {
      expect(() => parseCaptureArgs(['--target', 'app', '--screen', 'join', flag, 'x', '--out', 'j.png'])).toThrow(/need --target app --screen lobby/);
      expect(() => parseCaptureArgs([flag, 'x', '--out', 'j.png'])).toThrow(/need --target app --screen lobby/);
    }
  });

  it('needs --player-name before a correction, and a value for each flag', () => {
    expect(() => parseCaptureArgs([...live, '--correct-player-name', 'Ada'])).toThrow(/--correct-player-name needs --player-name/);
    expect(() => parseCaptureArgs([...live, '--player-name'])).toThrow(/--player-name needs a non-empty value/);
    for (const flag of ['--player-name', '--paper-name', '--correct-player-name']) {
      for (const bad of ['', '   ']) expect(() => parseCaptureArgs([...live, flag, bad])).toThrow(/needs a non-empty value/);
    }
    expect(() => parseCaptureArgs([...live, '--player-name', 'x', '--stress-text'])).toThrow(/--stress-text cannot be combined/);
    expect(() => parseCaptureArgs([...live, '--paper-name', 'x', '--stress-text'])).toThrow(/--stress-text cannot be combined/);
  });

  it('rejects --no-webgl on live screens, which never carry it', () => {
    for (const screen of ['home', 'join', 'lobby']) {
      expect(() => parseCaptureArgs(['--target', 'app', '--screen', screen, '--no-webgl', '--out', 'x.png'])).toThrow(/--no-webgl does not apply to live screens/);
    }
  });
});
