import { describe, expect, it } from 'vitest';
import { harnessPath, parseCaptureArgs } from '../../scripts/visual/args.ts';

describe('parseCaptureArgs', () => {
  it('fills defaults and requires only --out', () => {
    expect(parseCaptureArgs(['--out', 'shots/town.png'])).toEqual({
      target: 'town', fixture: 'solo-honest', round: 1, phase: 'reveal', reactionMs: 6000,
      reducedMotion: false, seed: 1, width: 1280, height: 720, out: 'shots/town.png', prod: false, timeoutMs: 60000,
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
    expect(() => parseCaptureArgs(['--out', 'a.png', '--target', 'ui'])).toThrow(/--target must be town or app/);
  });

  it('rejects the town target in --prod mode because the harness is dev-only', () => {
    expect(() => parseCaptureArgs(['--out', 'a.png', '--prod'])).toThrow(/--prod only supports --target app/);
  });
});

describe('harnessPath', () => {
  it('encodes the scenario into the harness URL', () => {
    const options = parseCaptureArgs(['--out', 'a.png', '--round', '3', '--reduced-motion']);
    expect(harnessPath(options)).toBe(
      '/visual-test/index.html?fixture=solo-honest&round=3&phase=reveal&reactionMs=6000&reducedMotion=true&seed=1',
    );
  });
});
