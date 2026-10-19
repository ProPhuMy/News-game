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

  it('keep every pointer-events selector in globals.css', () => {
    const globals = css('globals.css');
    for (const selector of POINTER_SELECTORS) expect(globals, selector).toContain(selector);
  });
});
