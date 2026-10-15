# CSS runtime diagnosis (visual overhaul C0)

Owner: Claude. Base: `main` `3c02902`, branch `claude/c0-foundation`. Date: 2026-10-15.

## 1. Question

The UI looks unstyled. Do the stylesheets fail to load in the running game, or are the styles missing from the source?

## 2. Evidence: what the running page loaded

Captured with `npm run capture -- --target app` (headless Chromium 153, 1280×720). Each sidecar lists every stylesheet response.

| Mode | Stylesheet URL | Status | Content type | Bytes |
|---|---|---|---|---|
| Dev (`NODE_ENV=development`, Vite middleware) | `/styles/theme.css` | 200 | `text/css` | 1150 |
| Dev | `/styles/globals.css` | 200 | `text/css` | 1412 |
| Production (`npm run build`, then `NODE_ENV=production`) | `/assets/index-BDNO7TBY.css` | 200 | `text/css; charset=utf-8` | 2017 |

- Console errors: 0 in both modes.
- Screenshots `app-home-dev.png` and `app-home-prod.png` (viewed by Claude) look the same: the home screen title, subtitle, "Play Solo" / "Create Room" buttons and the room-code field render as browser-default text and controls in the top-left corner, drawn over the 3D town. No panel, card, spacing or typography is applied.

## 3. Evidence: what the source defines

`src/client/styles/` has two files, 124 lines in total:

- `theme.css` defines color tokens (`--color-bg-paper`, `--paper-red`, ...) on `:root`. Tokens alone style nothing.
- `globals.css` has a reset, full-screen positioning for `#town-canvas-container` and `#ui-root`, `font-family: inherit` for controls, and `pointer-events` rules. Every one of its 28 class selectors appears only inside a `pointer-events` rule. None sets layout, color, spacing or type.

Class names used by `src/client/ui/` against class names defined in `src/client/styles/`:

| Count | Value |
|---|---|
| Class names used in `className="..."` and template `className={`...`}` | 169 |
| Class names with any CSS rule | 28 |
| Used class names with no CSS rule | 142 |

Method (repeatable): extract `className` strings from `src/client/ui`, strip `${...}` parts of template strings, compare with every `.class` selector in `src/client/styles/*.css`. Stems ending in `-` (for example `btn-`, `paper-color-`, `color-`) come from template strings such as `` `btn-${variant}` ``; their full names are built at runtime and are unstyled too. Conditional expressions such as `className={row.isWinner ? 'winner-row' : ''}` are not counted, so 142 is a lower bound.

## 4. Unstyled class names by file

- `components/Button.tsx`: btn btn-
- `components/CharacterCounter.tsx`: char-counter
- `components/Chip.tsx`: chip
- `components/CountdownTimer.tsx`: countdown-timer timer-value
- `components/EvidenceSelector.tsx`: card-desc evidence-attach-panel evidence-card-label
- `components/ExposureBanner.tsx`: exposure-banner exposure-entry
- `components/FrontPageCard.tsx`: evidence-stamp exposed-reason exposed-stamp exposed-stamp-container front-page-badges headline-body headline-text masthead-date newspaper-masthead paper-border-
- `components/PaperBadge.tsx`: paper-badge paper-color- paper-icon paper-name
- `components/RecapBanner.tsx`: recap-banner recap-icon recap-text
- `components/ScoreboardTable.tsx`: player-sub score-cell score-value scoreboard-table winner-trophy
- `components/TipCard.tsx`: tip-card tip-stamp tip-text
- `dev/FixturePlayer.tsx`: fixture-actions fixture-info fixture-playback-container step-actions step-label
- `hud/HUD.tsx`: hud-error-banner
- `hud/SidePanel.tsx`: bot-tag caretaker-tag editor-name locked-badge panel-title paper-card paper-card-header paper-editor-line paper-stats papers-list stat-readers stat-score trust-bar-container trust-bar-fill trust-bar-label trust-bar-track
- `hud/TopBar.tsx`: motion-toggle-btn phase-title round-badge sound-toggle-btn top-bar-controls
- `screens/AppRouter.tsx`: loading-screen
- `screens/FinalEditionScreen.tsx`: archive-item archive-list archive-paper archive-round archive-text archive-truth btn-large final-actions final-edition-screen final-exposure-item final-exposures-section final-loading formula-explanation headline-truth-archive truth- truth-record-card truth-records-grid truth-records-section winner-announcement
- `screens/HomeScreen.tsx`: btn-large code-input form-label game-subtitle game-title home-actions home-screen join-form join-input-group
- `screens/IntroScreen.tsx`: btn-large card-index intro-card-deck intro-footer intro-screen rule-card
- `screens/InvestigateScreen.tsx`: investigate-choices locations-buttons locked-banner locked-state rival-picker rival-select skip-action
- `screens/JoinScreen.tsx`: btn-large color- color-choice-btn color-picker-grid form-group form-label-title icon join-actions join-room-badge join-screen label taken-label
- `screens/LobbyScreen.tsx`: btn-large btn-sm lobby-footer lobby-header lobby-screen room-code-badge seat-card seat-empty-message seat-info seat-number seat-player-name seats-grid waiting-message
- `screens/RevealScreen.tsx`: bubble-icon bubble-text reveal-screen
- `screens/ServerRestartScreen.tsx`: server-restart-screen
- `screens/WriteScreen.tsx`: btn-large chips-row editor-actions editor-section expose-badge expose-mode-header locked locked-headline-preview mod-error-banner proof-buttons-row proof-exposure-banner section-label textarea-header

## 5. Finding

The stylesheets load correctly in both dev and production: correct URLs, status 200, CSS content type, nonzero size, no console errors. The cause of the unstyled UI is that **component styles were never written**: 142 of 169 class names used by the UI have no rule, and the 28 that exist only control pointer events. Adding duplicate stylesheet imports would change nothing.

## 6. What C1 consumes

- Section 4 is the C1 styling checklist (every screen, the HUD, and the shared components).
- The existing tokens in `theme.css` are replaced by the shared palette module `src/client/visuals/palette.ts` (see `docs/visual-overhaul/presentation-interface.md` §1), so UI and renderer colors come from one source.
- The `pointer-events` rules in `globals.css` must be kept: they let the town receive drags outside the panels.
- No CSS was written in C0.
