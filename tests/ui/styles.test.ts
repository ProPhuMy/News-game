import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const STYLES = 'src/client/styles';
const css = (file: string) => readFileSync(join(STYLES, file), 'utf8');

// Every selector that controls pointer pass-through on main (7457fd0); the town needs them.
const POINTER_SELECTORS = [
  '.app-layout', '.screen-container', '.hud-overlay', '.hud-body', '.hud-center-content',
  '.app-layout button', '.home-card', '.join-profile-card', '.lobby-card', '.loading-card', '.error-card',
  '.locked-card', '.editor-card', '.investigate-panel', '.choice-section', '.write-screen',
  '.front-pages-carousel', '.front-page-card', '.final-card', '.hud-top-bar', '.hud-side-panel',
  '.connection-modal', '.connection-modal-backdrop', '.reconnecting-pill', '.screen-error-banner',
  '.speech-bubbles-overlay', '.citizen-speech-bubble', '.fixture-player-toolbar',
];

describe('stylesheets', () => {
  it('contain no color literals; themed colors come from palette.ts', () => {
    for (const file of readdirSync(STYLES).filter((f) => f.endsWith('.css'))) {
      expect(css(file), file).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
    }
  });

  it('self-host the heading font with swap and a committed license', () => {
    const theme = css('theme.css');
    expect(theme).toMatch(/@font-face\s*{[^}]*font-family:\s*'Playfair Display'/);
    expect(theme).toMatch(/@font-face\s*{[^}]*font-display:\s*swap/);
    const url = theme.match(/url\(['"]?(\/fonts\/playfair-display\/[^'")]+)['"]?\)/)?.[1];
    expect(url).toBe('/fonts/playfair-display/PlayfairDisplay[wght].ttf');
    expect(existsSync(join('public', url!))).toBe(true);
    expect(readFileSync('public/fonts/playfair-display/OFL.txt', 'utf8')).toContain('SIL OPEN FONT LICENSE');
    expect(theme).toMatch(/--font-headline:\s*'Playfair Display',\s*Georgia/);
  });

  // No-WebGL notice (Codex webgl.ts) publishes its height; full-screen UI layers start below it (interface §5d).
  it('start the HUD and full-screen setup layers below the no-WebGL notice', () => {
    const rule = (file: string, selector: string) => {
      const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return [...css(file).matchAll(new RegExp(`(?:^|[}\\n])\\s*${escaped}\\s*\\{([^}]*)\\}`, 'g'))].map((m) => m[1]).join(';');
    };
    expect(rule('hud.css', '.hud-overlay')).toMatch(/top:\s*var\(--nt-town-fallback-height,\s*0px\)/);
    expect(rule('screens.css', '.app-layout > .screen-container')).toMatch(/top:\s*var\(--nt-town-fallback-height,\s*0px\)/);
  });

  it('keep every pointer-events selector in globals.css', () => {
    const globals = css('globals.css');
    for (const selector of POINTER_SELECTORS) expect(globals, selector).toContain(selector);
  });

  it('never marks a selected control with outline, which would hide the focus ring', () => {
    for (const file of readdirSync(STYLES).filter((f) => f.endsWith('.css'))) {
      for (const rule of css(file).matchAll(/([^{}]*\.selected[^{}]*)\{([^}]*)\}/g)) {
        if (rule[1]!.includes(':focus-visible')) continue;
        expect(rule[2], `${file}: ${rule[1]!.trim()}`).not.toMatch(/(^|;|\s)outline\s*:/);
      }
    }
  });
});
