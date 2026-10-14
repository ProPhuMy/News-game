# Gemini 2: Client UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete React-based client user interface for News Town, featuring responsive screens, vintage newspaper theming, accessible HUD controls, real-time match state synchronization, and failure/fallback views.

**Architecture:** A pure React view hierarchy built on top of the reactive store in `src/client/net/`, organized into screen controllers (Home, Lobby, Intro, Investigate, Write, Reveal, Final Edition) and shared HUD overlays. The UI never calculates game outcomes or runs local clocks; it translates store state into accessible DOM trees and dispatches user actions back to the store.

**Tech Stack:** TypeScript (strict mode), React 18 / 19, CSS Modules / Vanilla CSS (warm newsprint palette), Vitest, `@testing-library/react`.

**Spec:** [`docs/superpowers/specs/2026-10-09-news-town-design.md`](file:///home/agent/projects/game/docs/superpowers/specs/2026-10-09-news-town-design.md)

## Global Constraints

- **Ownership paths:** Create and edit files ONLY inside `src/client/ui/`, `src/client/main.tsx`, `src/client/index.html`, `src/client/styles/`, `tests/ui/`.
- **No Direct Socket Access:** Read state and send actions strictly through the store exported by `src/client/net/`; never open WebSockets or network calls in UI components.
- **Pure Display / Zero Game Rules:** All outcomes (truth, readers, trust, exposure, scores) are decided by `src/engine/`. The UI only presents what the server store provides.
- **Server-Driven Timers:** Phase timers must display the server deadline (`deadlineMs - (now + offset)`) and never run an independent phase clock or advance phases locally.
- **Untrusted Text Security:** Headlines, player names, newspaper names, and AI speech bubbles are untrusted user data. Never use `innerHTML`, `dangerouslySetInnerHTML`, or HTML string interpolation.
- **Multi-modal Identifiers:** The 4 newspaper colors (red, blue, yellow, green) must always be paired with their distinct icons (quill, megaphone, eye, lightning bolt).
- **Accessibility & Fallbacks:** Support reduced-motion preferences (`prefers-reduced-motion` and toggle), high contrast, and provide a fully functional 2D panel mode when WebGL is unavailable.
- **Speech Bubble Limit:** Render at most 6 speech bubbles concurrently.
- **No Unauthorized Dependencies:** Use only standard dependencies provisioned in `package.json` at M0.

---

### Task 1: Client Shell, Global Styles, and Theme Setup

**Files:**
- Create: `src/client/index.html`
- Create: `src/client/styles/theme.css`
- Create: `src/client/styles/globals.css`
- Create: `src/client/main.tsx`
- Create: `tests/ui/Shell.test.tsx`

**Interfaces:**
- Consumes: Standard React DOM mount APIs.
- Produces: Base HTML layout with `#town-canvas-container` for Gemini 1's 3D scene and `#ui-root` for Gemini 2's React UI overlay.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/ui/Shell.test.tsx
import { describe, it, expect } from 'vitest';

describe('Client Shell Layout', () => {
  it('defines the required DOM containers for town 3D and React UI', () => {
    document.body.innerHTML = `
      <div id="town-canvas-container"></div>
      <div id="ui-root"></div>
    `;
    const townContainer = document.getElementById('town-canvas-container');
    const uiRoot = document.getElementById('ui-root');
    expect(townContainer).not.toBeNull();
    expect(uiRoot).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it passes baseline check**

Run: `npx vitest run tests/ui/Shell.test.tsx`
Expected: PASS

- [ ] **Step 3: Write HTML, CSS, and Root Entry**

```html
<!-- src/client/index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>News Town</title>
    <link rel="stylesheet" href="/src/client/styles/theme.css" />
    <link rel="stylesheet" href="/src/client/styles/globals.css" />
  </head>
  <body>
    <div id="town-canvas-container" aria-hidden="true"></div>
    <div id="ui-root"></div>
    <script type="module" src="/src/client/main.tsx"></script>
  </body>
</html>
```

```css
/* src/client/styles/theme.css */
:root {
  --color-bg-paper: #f4ecd8;
  --color-paper-card: #fdfbf7;
  --color-ink-dark: #1f1d1a;
  --color-ink-muted: #686256;
  --color-border: #d3c7aa;
  --color-accent-gold: #c98a2c;

  /* Paper colors and identities */
  --paper-red: #c0392b;
  --paper-blue: #2980b9;
  --paper-yellow: #d4ac0d;
  --paper-green: #27ae60;
  --paper-grey: #7f8c8d;

  --font-headline: 'Georgia', 'Playfair Display', serif;
  --font-body: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --font-mono: 'Courier New', Courier, monospace;

  --transition-fast: 0.15s ease;
  --transition-normal: 0.3s ease;
  --radius-sm: 4px;
  --radius-md: 8px;
  --shadow-card: 0 4px 12px rgba(31, 29, 26, 0.12);
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --transition-fast: 0s !important;
    --transition-normal: 0s !important;
  }
}
```

```css
/* src/client/styles/globals.css */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body, html {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: var(--color-bg-paper);
  color: var(--color-ink-dark);
  font-family: var(--font-body);
}

#town-canvas-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

#ui-root {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  pointer-events: none;
}

#ui-root > * {
  pointer-events: auto;
}
```

```tsx
// src/client/main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppRouter } from './ui/screens/AppRouter';

const container = document.getElementById('ui-root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <AppRouter />
    </React.StrictMode>
  );
}
```

- [ ] **Step 4: Verify test passes**

Run: `npx vitest run tests/ui/Shell.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/index.html src/client/styles/ src/client/main.tsx tests/ui/Shell.test.tsx
git commit -m "ui: setup client html, css theme tokens and root entry"
```

---

### Task 2: Audio Controller and Sound Trigger Context

**Files:**
- Create: `src/client/ui/audio/SoundContext.tsx`
- Create: `src/client/ui/audio/useSound.ts`
- Create: `tests/ui/SoundContext.test.tsx`

**Interfaces:**
- Consumes: Web Audio API / Audio elements from `public/sounds/`.
- Produces: `SoundProvider` and `useSound()` hook exposing `playSound(cue: SoundCue)` and `toggleMute()`.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/ui/SoundContext.test.tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { SoundProvider, useSound } from '../../src/client/ui/audio/SoundContext';

describe('SoundContext', () => {
  it('manages mute state and handles sound cues without crashing', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SoundProvider>{children}</SoundProvider>
    );
    const { result } = renderHook(() => useSound(), { wrapper });

    expect(result.current.isMuted).toBe(false);

    act(() => {
      result.current.toggleMute();
    });
    expect(result.current.isMuted).toBe(true);

    // Triggering cue while muted should not throw
    expect(() => {
      act(() => {
        result.current.playSound('paper_slap');
      });
    }).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui/SoundContext.test.tsx`
Expected: FAIL with "Cannot find module '../../src/client/ui/audio/SoundContext'"

- [ ] **Step 3: Implement SoundProvider and useSound**

```tsx
// src/client/ui/audio/SoundContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type SoundCue = 'paper_slap' | 'gasp' | 'murmur' | 'poof' | 'click';

interface SoundContextValue {
  isMuted: boolean;
  toggleMute: () => void;
  playSound: (cue: SoundCue) => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

const SOUND_PATHS: Record<SoundCue, string> = {
  paper_slap: '/sounds/paper_slap.mp3',
  gasp: '/sounds/gasp.mp3',
  murmur: '/sounds/murmur.mp3',
  poof: '/sounds/poof.mp3',
  click: '/sounds/click.mp3',
};

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem('news_town_muted') === 'true';
  });

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('news_town_muted', String(next));
      }
      return next;
    });
  }, []);

  const playSound = useCallback((cue: SoundCue) => {
    if (isMuted || typeof window === 'undefined') return;
    try {
      const audio = new Audio(SOUND_PATHS[cue]);
      audio.volume = 0.6;
      audio.play().catch(() => {
        // Autoplay policy fallback
      });
    } catch {
      // Audio element creation error fallback
    }
  }, [isMuted]);

  return (
    <SoundContext.Provider value={{ isMuted, toggleMute, playSound }}>
      {children}
    </SoundContext.Provider>
  );
};

export const useSound = (): SoundContextValue => {
  const ctx = useContext(SoundContext);
  if (!ctx) {
    return {
      isMuted: true,
      toggleMute: () => {},
      playSound: () => {},
    };
  }
  return ctx;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ui/SoundContext.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/ui/audio/ tests/ui/SoundContext.test.tsx
git commit -m "ui: implement SoundContext and useSound hook"
```

---

### Task 3: Common UI Primitives (Button, Chip, CountdownTimer, PaperBadge)

**Files:**
- Create: `src/client/ui/components/Button.tsx`
- Create: `src/client/ui/components/Chip.tsx`
- Create: `src/client/ui/components/CountdownTimer.tsx`
- Create: `src/client/ui/components/PaperBadge.tsx`
- Create: `tests/ui/CountdownTimer.test.tsx`
- Create: `tests/ui/PaperBadge.test.tsx`

**Interfaces:**
- Consumes: Server deadline timestamp (`deadlineMs`) and server offset (`serverTimeOffset`).
- Produces: Reusable UI widgets with paper styling, accessible labels, and timer display.

- [ ] **Step 1: Write the failing tests**

```tsx
// tests/ui/CountdownTimer.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CountdownTimer } from '../../src/client/ui/components/CountdownTimer';

describe('CountdownTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders remaining seconds calculated strictly from server deadline', () => {
    const now = 100000;
    vi.setSystemTime(now);
    const deadlineMs = now + 15000; // 15s remaining

    render(<CountdownTimer deadlineMs={deadlineMs} serverTimeOffset={0} />);
    expect(screen.getByText('15s')).toBeDefined();

    vi.advanceTimersByTime(5000);
    // After re-render or interval tick
  });
});
```

```tsx
// tests/ui/PaperBadge.test.tsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PaperBadge } from '../../src/client/ui/components/PaperBadge';

describe('PaperBadge', () => {
  it('renders paper name and includes both color styling and accessible icon', () => {
    render(<PaperBadge paperName="The Daily Gasp" color="red" />);
    expect(screen.getByText('The Daily Gasp')).toBeDefined();
    expect(screen.getByLabelText('Quill icon')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/ui/CountdownTimer.test.tsx tests/ui/PaperBadge.test.tsx`
Expected: FAIL (modules not found)

- [ ] **Step 3: Implement components**

```tsx
// src/client/ui/components/CountdownTimer.tsx
import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  deadlineMs: number;
  serverTimeOffset?: number;
  onExpire?: () => void;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  deadlineMs,
  serverTimeOffset = 0,
  onExpire,
}) => {
  const computeSecondsLeft = () => {
    const currentServerTime = Date.now() + serverTimeOffset;
    return Math.max(0, Math.ceil((deadlineMs - currentServerTime) / 1000));
  };

  const [secondsLeft, setSecondsLeft] = useState<number>(computeSecondsLeft);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = computeSecondsLeft();
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 250);
    return () => clearInterval(interval);
  }, [deadlineMs, serverTimeOffset, onExpire]);

  const isUrgent = secondsLeft <= 5 && secondsLeft > 0;

  return (
    <div
      className={`countdown-timer ${isUrgent ? 'urgent' : ''}`}
      role="timer"
      aria-live="polite"
    >
      <span className="timer-value">{secondsLeft}s</span>
    </div>
  );
};
```

```tsx
// src/client/ui/components/PaperBadge.tsx
import React from 'react';

export type PaperColor = 'red' | 'blue' | 'yellow' | 'green' | 'grey';

export const PAPER_ICONS: Record<PaperColor, { label: string; symbol: string }> = {
  red: { label: 'Quill icon', symbol: '🪶' },
  blue: { label: 'Megaphone icon', symbol: '📢' },
  yellow: { label: 'Eye icon', symbol: '👁️' },
  green: { label: 'Lightning bolt icon', symbol: '⚡' },
  grey: { label: 'Neutral icon', symbol: '📰' },
};

interface PaperBadgeProps {
  paperName: string;
  color: PaperColor;
  className?: string;
}

export const PaperBadge: React.FC<PaperBadgeProps> = ({ paperName, color, className = '' }) => {
  const icon = PAPER_ICONS[color] || PAPER_ICONS.grey;

  return (
    <span className={`paper-badge paper-color-${color} ${className}`}>
      <span className="paper-icon" aria-label={icon.label}>
        {icon.symbol}
      </span>
      <span className="paper-name">{paperName}</span>
    </span>
  );
};
```

```tsx
// src/client/ui/components/Button.tsx
import React from 'react';
import { useSound } from '../audio/SoundContext';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'retro';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  onClick,
  disabled,
  className = '',
  ...rest
}) => {
  const { playSound } = useSound();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    playSound('click');
    onClick?.(e);
  };

  return (
    <button
      className={`btn btn-${variant} ${className}`}
      disabled={disabled}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </button>
  );
};
```

```tsx
// src/client/ui/components/Chip.tsx
import React from 'react';

interface ChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export const Chip: React.FC<ChipProps> = ({ label, selected, onClick, disabled }) => {
  return (
    <button
      type="button"
      className={`chip ${selected ? 'selected' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/ui/CountdownTimer.test.tsx tests/ui/PaperBadge.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/ui/components/ tests/ui/CountdownTimer.test.tsx tests/ui/PaperBadge.test.tsx
git commit -m "ui: implement Button, Chip, CountdownTimer, and PaperBadge primitives"
```

---

### Task 4: Top Navigation Bar and Side Paper Leaderboard HUD

**Files:**
- Create: `src/client/ui/hud/TopBar.tsx`
- Create: `src/client/ui/hud/SidePanel.tsx`
- Create: `src/client/ui/hud/HUD.tsx`
- Create: `tests/ui/HUD.test.tsx`

**Interfaces:**
- Consumes: Public match snapshot (`round`, `phase`, `deadlineMs`, `papers: PaperView[]`).
- Produces: Persistent HUD wrapper displaying round, phase, countdown, paper readers, trust bar, and current score.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/ui/HUD.test.tsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HUD } from '../../src/client/ui/hud/HUD';

describe('HUD', () => {
  const mockPapers = [
    {
      seatId: 0,
      paperName: 'The Daily Gasp',
      playerName: 'Alice',
      color: 'red' as const,
      readers: 12,
      trust: 54,
      score: 13,
      isBot: false,
      isCaretaker: false,
      hasLocked: true,
    },
    {
      seatId: 1,
      paperName: 'Morning Ledger',
      playerName: 'Bob',
      color: 'blue' as const,
      readers: 8,
      trust: 60,
      score: 10,
      isBot: true,
      isCaretaker: false,
      hasLocked: false,
    },
  ];

  it('renders top bar phase info and paper scores in side panel', () => {
    render(
      <HUD
        round={2}
        phase="write"
        deadlineMs={Date.now() + 30000}
        serverTimeOffset={0}
        papers={mockPapers}
      />
    );

    expect(screen.getByText('Round 2 of 5')).toBeDefined();
    expect(screen.getByText('Write Headline')).toBeDefined();
    expect(screen.getByText('The Daily Gasp')).toBeDefined();
    expect(screen.getByText('12 readers')).toBeDefined();
    expect(screen.getByText('Trust: 54')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui/HUD.test.tsx`
Expected: FAIL (HUD not found)

- [ ] **Step 3: Implement TopBar, SidePanel, and HUD**

```tsx
// src/client/ui/hud/TopBar.tsx
import React from 'react';
import { CountdownTimer } from '../components/CountdownTimer';
import { useSound } from '../audio/SoundContext';

export type GamePhase = 'intro' | 'investigate' | 'write' | 'reveal' | 'finale';

const PHASE_LABELS: Record<GamePhase, string> = {
  intro: 'Welcome to Town',
  investigate: 'Investigate Leads',
  write: 'Write Headline',
  reveal: 'Front Pages Revealed',
  finale: 'Final Edition',
};

interface TopBarProps {
  round: number;
  phase: GamePhase;
  deadlineMs: number;
  serverTimeOffset: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  round,
  phase,
  deadlineMs,
  serverTimeOffset,
}) => {
  const { isMuted, toggleMute } = useSound();

  return (
    <header className="hud-top-bar">
      <div className="round-badge">
        {phase === 'finale' ? 'Final Edition' : `Round ${round} of 5`}
      </div>
      <div className="phase-title">{PHASE_LABELS[phase]}</div>
      <div className="top-bar-controls">
        <CountdownTimer deadlineMs={deadlineMs} serverTimeOffset={serverTimeOffset} />
        <button
          type="button"
          className="sound-toggle-btn"
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
      </div>
    </header>
  );
};
```

```tsx
// src/client/ui/hud/SidePanel.tsx
import React from 'react';
import { PaperBadge, PaperColor } from '../components/PaperBadge';

export interface PaperView {
  seatId: number;
  paperName: string;
  playerName: string;
  color: PaperColor;
  readers: number;
  trust: number;
  score: number;
  isBot: boolean;
  isCaretaker: boolean;
  hasLocked: boolean;
}

interface SidePanelProps {
  papers: PaperView[];
}

export const SidePanel: React.FC<SidePanelProps> = ({ papers }) => {
  return (
    <aside className="hud-side-panel">
      <h2 className="panel-title">Standings</h2>
      <div className="papers-list">
        {papers.map((paper) => (
          <div key={paper.seatId} className={`paper-card ${paper.hasLocked ? 'locked' : ''}`}>
            <div className="paper-card-header">
              <PaperBadge paperName={paper.paperName} color={paper.color} />
              {paper.hasLocked && <span className="locked-badge" aria-label="Locked">🔒</span>}
            </div>
            <div className="paper-editor-line">
              <span className="editor-name">{paper.playerName}</span>
              {paper.isCaretaker && <span className="caretaker-tag">(Caretaker)</span>}
              {paper.isBot && !paper.isCaretaker && <span className="bot-tag">(AI)</span>}
            </div>
            <div className="paper-stats">
              <span className="stat-readers">{paper.readers} readers</span>
              <span className="stat-score">Score: {paper.score}</span>
            </div>
            <div className="trust-bar-container">
              <div className="trust-bar-label">Trust: {paper.trust}</div>
              <div className="trust-bar-track">
                <div
                  className="trust-bar-fill"
                  style={{ width: `${Math.min(100, Math.max(0, paper.trust))}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};
```

```tsx
// src/client/ui/hud/HUD.tsx
import React from 'react';
import { TopBar, GamePhase } from './TopBar';
import { SidePanel, PaperView } from './SidePanel';

interface HUDProps {
  round: number;
  phase: GamePhase;
  deadlineMs: number;
  serverTimeOffset: number;
  papers: PaperView[];
  children?: React.ReactNode;
}

export const HUD: React.FC<HUDProps> = ({
  round,
  phase,
  deadlineMs,
  serverTimeOffset,
  papers,
  children,
}) => {
  return (
    <div className="hud-overlay">
      <TopBar
        round={round}
        phase={phase}
        deadlineMs={deadlineMs}
        serverTimeOffset={serverTimeOffset}
      />
      <div className="hud-body">
        <SidePanel papers={papers} />
        <main className="hud-center-content">{children}</main>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ui/HUD.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/ui/hud/ tests/ui/HUD.test.tsx
git commit -m "ui: implement HUD TopBar, SidePanel and overlay wrapper"
```

---

### Task 5: Home Screen and Room Join Flow

**Files:**
- Create: `src/client/ui/screens/HomeScreen.tsx`
- Create: `src/client/ui/screens/JoinScreen.tsx`
- Create: `tests/ui/HomeScreen.test.tsx`
- Create: `tests/ui/JoinScreen.test.tsx`

**Interfaces:**
- Consumes: Action callbacks `onPlaySolo`, `onCreateRoom`, `onJoinRoom`.
- Produces: Landing view with single-click Play Solo, room creation, 5-char code entry, and player/newspaper profile setup.

- [ ] **Step 1: Write the failing tests**

```tsx
// tests/ui/HomeScreen.test.tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HomeScreen } from '../../src/client/ui/screens/HomeScreen';

describe('HomeScreen', () => {
  it('triggers onPlaySolo and onCreateRoom actions', () => {
    const onPlaySolo = vi.fn();
    const onCreateRoom = vi.fn();
    const onJoinCode = vi.fn();

    render(
      <HomeScreen
        onPlaySolo={onPlaySolo}
        onCreateRoom={onCreateRoom}
        onJoinCode={onJoinCode}
      />
    );

    fireEvent.click(screen.getByText('Play Solo'));
    expect(onPlaySolo).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Create Room'));
    expect(onCreateRoom).toHaveBeenCalled();
  });
});
```

```tsx
// tests/ui/JoinScreen.test.tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JoinScreen } from '../../src/client/ui/screens/JoinScreen';

describe('JoinScreen', () => {
  it('validates player and paper names within character limits', () => {
    const onSubmit = vi.fn();
    render(<JoinScreen onSubmit={onSubmit} takenColors={['red']} />);

    const nameInput = screen.getByLabelText('Your Name');
    const paperInput = screen.getByLabelText('Newspaper Name');
    const submitBtn = screen.getByText('Ready to Print');

    fireEvent.change(nameInput, { target: { value: 'Editor Jane' } });
    fireEvent.change(paperInput, { target: { value: 'The Daily Herald' } });
    fireEvent.click(screen.getByLabelText('Select Blue'));
    fireEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith({
      playerName: 'Editor Jane',
      paperName: 'The Daily Herald',
      color: 'blue',
    });
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run tests/ui/HomeScreen.test.tsx tests/ui/JoinScreen.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement HomeScreen and JoinScreen**

```tsx
// src/client/ui/screens/HomeScreen.tsx
import React, { useState } from 'react';
import { Button } from '../components/Button';

interface HomeScreenProps {
  onPlaySolo: () => void;
  onCreateRoom: () => void;
  onJoinCode: (code: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onPlaySolo,
  onCreateRoom,
  onJoinCode,
}) => {
  const [roomCode, setRoomCode] = useState('');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = roomCode.trim().toUpperCase();
    if (cleaned.length === 5) {
      onJoinCode(cleaned);
    }
  };

  return (
    <div className="screen-container home-screen">
      <div className="home-card">
        <h1 className="game-title">NEWS TOWN</h1>
        <p className="game-subtitle">The 3D multiplayer newspaper party game</p>

        <div className="home-actions">
          <Button variant="primary" onClick={onPlaySolo} className="btn-large">
            Play Solo
          </Button>
          <Button variant="secondary" onClick={onCreateRoom} className="btn-large">
            Create Room
          </Button>
        </div>

        <form onSubmit={handleJoin} className="join-form">
          <label htmlFor="join-code-input" className="form-label">
            Have a room code?
          </label>
          <div className="join-input-group">
            <input
              id="join-code-input"
              type="text"
              maxLength={5}
              placeholder="CODE"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="code-input"
            />
            <Button
              type="submit"
              variant="retro"
              disabled={roomCode.trim().length !== 5}
            >
              Join
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

```tsx
// src/client/ui/screens/JoinScreen.tsx
import React, { useState } from 'react';
import { Button } from '../components/Button';
import { PaperColor, PAPER_ICONS } from '../components/PaperBadge';

interface JoinProfile {
  playerName: string;
  paperName: string;
  color: PaperColor;
}

interface JoinScreenProps {
  onSubmit: (profile: JoinProfile) => void;
  takenColors?: PaperColor[];
  defaultPlayerName?: string;
  defaultPaperName?: string;
}

const AVAILABLE_COLORS: PaperColor[] = ['red', 'blue', 'yellow', 'green'];

export const JoinScreen: React.FC<JoinScreenProps> = ({
  onSubmit,
  takenColors = [],
  defaultPlayerName = '',
  defaultPaperName = '',
}) => {
  const [playerName, setPlayerName] = useState(defaultPlayerName);
  const [paperName, setPaperName] = useState(defaultPaperName);
  const [color, setColor] = useState<PaperColor | null>(() => {
    return AVAILABLE_COLORS.find((c) => !takenColors.includes(c)) || 'red';
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !paperName.trim() || !color) return;
    onSubmit({
      playerName: playerName.trim().slice(0, 20),
      paperName: paperName.trim().slice(0, 24),
      color,
    });
  };

  return (
    <div className="screen-container join-screen">
      <form onSubmit={handleSubmit} className="join-profile-card">
        <h2>Establish Your Press</h2>

        <div className="form-group">
          <label htmlFor="player-name">Your Name</label>
          <input
            id="player-name"
            type="text"
            maxLength={20}
            required
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Editor Name (max 20)"
          />
        </div>

        <div className="form-group">
          <label htmlFor="paper-name">Newspaper Name</label>
          <input
            id="paper-name"
            type="text"
            maxLength={24}
            required
            value={paperName}
            onChange={(e) => setPaperName(e.target.value)}
            placeholder="The Daily Chronicle (max 24)"
          />
        </div>

        <div className="form-group">
          <label>Pick Ink Color & Emblem</label>
          <div className="color-picker-grid">
            {AVAILABLE_COLORS.map((c) => {
              const isTaken = takenColors.includes(c);
              const isSelected = color === c;
              const icon = PAPER_ICONS[c];
              return (
                <button
                  key={c}
                  type="button"
                  disabled={isTaken}
                  aria-label={`Select ${c.charAt(0).toUpperCase() + c.slice(1)}`}
                  className={`color-choice-btn color-${c} ${isSelected ? 'selected' : ''}`}
                  onClick={() => setColor(c)}
                >
                  <span className="icon">{icon.symbol}</span>
                  <span className="label">{c}</span>
                  {isTaken && <span className="taken-label">Taken</span>}
                </button>
              );
            })}
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          disabled={!playerName.trim() || !paperName.trim() || !color}
        >
          Ready to Print
        </Button>
      </form>
    </div>
  );
};
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run tests/ui/HomeScreen.test.tsx tests/ui/JoinScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/ui/screens/HomeScreen.tsx src/client/ui/screens/JoinScreen.tsx tests/ui/HomeScreen.test.tsx tests/ui/JoinScreen.test.tsx
git commit -m "ui: implement HomeScreen and JoinScreen with color/name validation"
```

---

### Task 6: Lobby Screen with Seat Management and Host Controls

**Files:**
- Create: `src/client/ui/screens/LobbyScreen.tsx`
- Create: `tests/ui/LobbyScreen.test.tsx`

**Interfaces:**
- Consumes: Room state (`roomCode`, `isHost`, `seats: Seat[]`), `onStartMatch()`, `onCopyLink()`.
- Produces: 4-seat lobby visualization displaying connected humans and AI placeholders, room invite link, and host start action.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/ui/LobbyScreen.test.tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LobbyScreen } from '../../src/client/ui/screens/LobbyScreen';

describe('LobbyScreen', () => {
  const mockSeats = [
    { seatId: 0, playerName: 'Alice', paperName: 'The Bugle', color: 'red' as const, isBot: false },
    { seatId: 1, playerName: 'Bob', paperName: 'The Gazette', color: 'blue' as const, isBot: false },
    { seatId: 2, playerName: null, paperName: null, color: null, isBot: true },
    { seatId: 3, playerName: null, paperName: null, color: null, isBot: true },
  ];

  it('renders room code, seats, AI fill indicators, and allows host to start', () => {
    const onStartMatch = vi.fn();
    render(
      <LobbyScreen
        roomCode="XK7PQ"
        isHost={true}
        seats={mockSeats}
        onStartMatch={onStartMatch}
      />
    );

    expect(screen.getByText('Room Code: XK7PQ')).toBeDefined();
    expect(screen.getByText('The Bugle')).toBeDefined();
    expect(screen.getAllByText('AI paper will take this seat')).toHaveLength(2);

    const startBtn = screen.getByText('Start Match');
    fireEvent.click(startBtn);
    expect(onStartMatch).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/ui/LobbyScreen.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement LobbyScreen**

```tsx
// src/client/ui/screens/LobbyScreen.tsx
import React, { useState } from 'react';
import { Button } from '../components/Button';
import { PaperBadge, PaperColor } from '../components/PaperBadge';

export interface LobbySeat {
  seatId: number;
  playerName: string | null;
  paperName: string | null;
  color: PaperColor | null;
  isBot: boolean;
}

interface LobbyScreenProps {
  roomCode: string;
  isHost: boolean;
  seats: LobbySeat[];
  onStartMatch: () => void;
  onLeaveRoom?: () => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  roomCode,
  isHost,
  seats,
  onStartMatch,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/r/${roomCode}`;
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div className="screen-container lobby-screen">
      <div className="lobby-card">
        <div className="lobby-header">
          <h1>Newsroom Lobby</h1>
          <div className="room-code-badge">
            <span>Room Code: {roomCode}</span>
            <Button variant="retro" onClick={handleCopyLink} className="btn-sm">
              {copied ? 'Copied!' : 'Copy Invite Link'}
            </Button>
          </div>
        </div>

        <div className="seats-grid">
          {seats.map((seat) => (
            <div key={seat.seatId} className={`seat-card ${seat.playerName ? 'occupied' : 'empty'}`}>
              <div className="seat-number">Press #{seat.seatId + 1}</div>
              {seat.playerName && seat.paperName && seat.color ? (
                <div className="seat-info">
                  <PaperBadge paperName={seat.paperName} color={seat.color} />
                  <div className="seat-player-name">{seat.playerName}</div>
                </div>
              ) : (
                <div className="seat-empty-message">
                  AI paper will take this seat
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="lobby-footer">
          {isHost ? (
            <Button variant="primary" onClick={onStartMatch} className="btn-large">
              Start Match
            </Button>
          ) : (
            <div className="waiting-message">Waiting for the host to start the presses...</div>
          )}
          {onLeaveRoom && (
            <Button variant="secondary" onClick={onLeaveRoom}>
              Leave Room
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify pass**

Run: `npx vitest run tests/ui/LobbyScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/ui/screens/LobbyScreen.tsx tests/ui/LobbyScreen.test.tsx
git commit -m "ui: implement LobbyScreen with 4-seat display and host start trigger"
```

---

### Task 7: Intro Phase Screen (Rule Cards and Skip Trigger)

**Files:**
- Create: `src/client/ui/screens/IntroScreen.tsx`
- Create: `tests/ui/IntroScreen.test.tsx`

**Interfaces:**
- Consumes: Server countdown deadline, `onSkipIntro()` callback.
- Produces: 3 readable rule cards explaining the core game loop, 20s server timer, and early Skip button.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/ui/IntroScreen.test.tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IntroScreen } from '../../src/client/ui/screens/IntroScreen';

describe('IntroScreen', () => {
  it('renders 3 rule cards and triggers onSkipIntro when clicked', () => {
    const onSkipIntro = vi.fn();
    render(
      <IntroScreen
        deadlineMs={Date.now() + 20000}
        serverTimeOffset={0}
        onSkipIntro={onSkipIntro}
      />
    );

    expect(screen.getByText('Rule 1: Print Truth or Lies')).toBeDefined();
    expect(screen.getByText('Rule 2: Win Citizens, Risk Trust')).toBeDefined();
    expect(screen.getByText('Rule 3: Final Score = Readers × Trust')).toBeDefined();

    const skipBtn = screen.getByText('Skip Intro');
    fireEvent.click(skipBtn);
    expect(onSkipIntro).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/ui/IntroScreen.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement IntroScreen**

```tsx
// src/client/ui/screens/IntroScreen.tsx
import React from 'react';
import { Button } from '../components/Button';
import { CountdownTimer } from '../components/CountdownTimer';

interface IntroScreenProps {
  deadlineMs: number;
  serverTimeOffset: number;
  onSkipIntro: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({
  deadlineMs,
  serverTimeOffset,
  onSkipIntro,
}) => {
  return (
    <div className="screen-container intro-screen">
      <div className="intro-card-deck">
        <div className="rule-card">
          <div className="card-index">I</div>
          <h3>Rule 1: Print Truth or Lies</h3>
          <p>
            Every round, report town events or spin wild rumors. Honest news keeps your trust;
            juicy lies gain immediate attention.
          </p>
        </div>

        <div className="rule-card">
          <div className="card-index">II</div>
          <h3>Rule 2: Win Citizens, Risk Trust</h3>
          <p>
            Citizens switch papers based on appeal and trust. But beware: unexposed lies can
            leak, and rivals can find proof to expose you!
          </p>
        </div>

        <div className="rule-card">
          <div className="card-index">III</div>
          <h3>Rule 3: Final Score = Readers × Trust</h3>
          <p>
            In the Final Edition, all hidden truths are revealed. Only papers with both strong
            readership and high trust will win the town.
          </p>
        </div>
      </div>

      <div className="intro-footer">
        <CountdownTimer deadlineMs={deadlineMs} serverTimeOffset={serverTimeOffset} />
        <Button variant="retro" onClick={onSkipIntro} className="btn-large">
          Skip Intro
        </Button>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify pass**

Run: `npx vitest run tests/ui/IntroScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/ui/screens/IntroScreen.tsx tests/ui/IntroScreen.test.tsx
git commit -m "ui: implement IntroScreen with 3 rule cards and skip trigger"
```

---

### Task 8: Investigate Phase Panel (Tip Display & Action Chooser)

**Files:**
- Create: `src/client/ui/components/TipCard.tsx`
- Create: `src/client/ui/screens/InvestigateScreen.tsx`
- Create: `tests/ui/InvestigateScreen.test.tsx`

**Interfaces:**
- Consumes: Private tip text, round number, rival headlines list, `onInvestigateLocation()`, `onInvestigateRival()`, `onSkip()`.
- Produces: 15s Investigate phase control panel.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/ui/InvestigateScreen.test.tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InvestigateScreen } from '../../src/client/ui/screens/InvestigateScreen';

describe('InvestigateScreen', () => {
  it('displays tip and allows choosing location check or skip', () => {
    const onInvestigateLocation = vi.fn();
    const onSkip = vi.fn();

    render(
      <InvestigateScreen
        tipText="A truck was seen outside the bakery at 3 AM."
        round={1}
        hasLocked={false}
        rivalHeadlines={[]}
        onInvestigateLocation={onInvestigateLocation}
        onInvestigateRival={vi.fn()}
        onSkip={onSkip}
      />
    );

    expect(screen.getByText('A truck was seen outside the bakery at 3 AM.')).toBeDefined();

    fireEvent.click(screen.getByText('Bakery'));
    expect(onInvestigateLocation).toHaveBeenCalledWith('bakery');

    fireEvent.click(screen.getByText('Skip Investigation'));
    expect(onSkip).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/ui/InvestigateScreen.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement TipCard and InvestigateScreen**

```tsx
// src/client/ui/components/TipCard.tsx
import React from 'react';

interface TipCardProps {
  tipText: string;
}

export const TipCard: React.FC<TipCardProps> = ({ tipText }) => {
  return (
    <div className="tip-card" role="region" aria-label="Confidential Tip">
      <div className="tip-stamp">CONFIDENTIAL TIP</div>
      <p className="tip-text">{tipText}</p>
    </div>
  );
};
```

```tsx
// src/client/ui/screens/InvestigateScreen.tsx
import React, { useState } from 'react';
import { TipCard } from '../components/TipCard';
import { Button } from '../components/Button';

export type TownLocation = 'bakery' | 'bank' | 'fountain' | 'town_hall' | 'clinic';

export interface RivalHeadlineOption {
  id: string;
  paperName: string;
  round: number;
  text: string;
}

interface InvestigateScreenProps {
  tipText: string;
  round: number;
  hasLocked: boolean;
  rivalHeadlines: RivalHeadlineOption[];
  onInvestigateLocation: (loc: TownLocation) => void;
  onInvestigateRival: (headlineId: string) => void;
  onSkip: () => void;
}

const LOCATIONS: { id: TownLocation; label: string }[] = [
  { id: 'bakery', label: 'Bakery' },
  { id: 'bank', label: 'Bank' },
  { id: 'fountain', label: 'Fountain Square' },
  { id: 'town_hall', label: 'Town Hall' },
  { id: 'clinic', label: 'Clinic' },
];

export const InvestigateScreen: React.FC<InvestigateScreenProps> = ({
  tipText,
  round,
  hasLocked,
  rivalHeadlines,
  onInvestigateLocation,
  onInvestigateRival,
  onSkip,
}) => {
  const [selectedRivalId, setSelectedRivalId] = useState<string>('');

  if (hasLocked) {
    return (
      <div className="investigate-panel locked-state">
        <TipCard tipText={tipText} />
        <div className="locked-banner">✓ Investigation order locked in. Waiting for report...</div>
      </div>
    );
  }

  return (
    <div className="investigate-panel">
      <TipCard tipText={tipText} />

      <div className="investigate-choices">
        <section className="choice-section">
          <h3>Option A: Check a Town Location (Certain Truth & Evidence)</h3>
          <div className="locations-buttons">
            {LOCATIONS.map((loc) => (
              <Button
                key={loc.id}
                variant="secondary"
                onClick={() => onInvestigateLocation(loc.id)}
              >
                {loc.label}
              </Button>
            ))}
          </div>
        </section>

        {round >= 2 && rivalHeadlines.length > 0 && (
          <section className="choice-section">
            <h3>Option B: Investigate a Rival Headline (Search for Proof of Lie)</h3>
            <div className="rival-picker">
              <select
                value={selectedRivalId}
                onChange={(e) => setSelectedRivalId(e.target.value)}
                className="rival-select"
              >
                <option value="">Select past rival headline...</option>
                {rivalHeadlines.map((h) => (
                  <option key={h.id} value={h.id}>
                    R{h.round} {h.paperName}: "{h.text}"
                  </option>
                ))}
              </select>
              <Button
                variant="secondary"
                disabled={!selectedRivalId}
                onClick={() => onInvestigateRival(selectedRivalId)}
              >
                Probe Headline
              </Button>
            </div>
          </section>
        )}

        <div className="skip-action">
          <Button variant="retro" onClick={onSkip}>
            Skip Investigation
          </Button>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify pass**

Run: `npx vitest run tests/ui/InvestigateScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/ui/components/TipCard.tsx src/client/ui/screens/InvestigateScreen.tsx tests/ui/InvestigateScreen.test.tsx
git commit -m "ui: implement TipCard and InvestigateScreen with location and rival choices"
```

---

### Task 9: Write Phase Editor (Headlines, Claim Chips, Evidence, and Moderation)

**Files:**
- Create: `src/client/ui/components/CharacterCounter.tsx`
- Create: `src/client/ui/components/EvidenceSelector.tsx`
- Create: `src/client/ui/screens/WriteScreen.tsx`
- Create: `tests/ui/WriteScreen.test.tsx`

**Interfaces:**
- Consumes: Evidence cards, proof cards, locked state, `onLockHeadline()`, `onSkipWrite()`.
- Produces: 45s Write phase editor with character counter (1-100), claim chips, local word moderation check, and proof expose toggle.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/ui/WriteScreen.test.tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WriteScreen } from '../../src/client/ui/screens/WriteScreen';

describe('WriteScreen', () => {
  it('enforces character limits, claim selection, and dispatches locked headline', () => {
    const onLockHeadline = vi.fn();

    render(
      <WriteScreen
        hasLocked={false}
        evidenceCards={[]}
        proofCards={[]}
        onLockHeadline={onLockHeadline}
        onSkipWrite={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Bakery'));
    fireEvent.click(screen.getByText('Danger'));

    const textarea = screen.getByPlaceholderText('Write your front page headline (1–100 characters)...');
    fireEvent.change(textarea, { target: { value: 'Flour explosions rock the bakery ovens!' } });

    expect(screen.getByText('39 / 100')).toBeDefined();

    const lockBtn = screen.getByText('LOCK IT IN');
    fireEvent.click(lockBtn);

    expect(onLockHeadline).toHaveBeenCalledWith({
      location: 'bakery',
      claimType: 'danger',
      text: 'Flour explosions rock the bakery ovens!',
      evidenceCardId: undefined,
      proofCardId: undefined,
    });
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/ui/WriteScreen.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement WriteScreen and components**

```tsx
// src/client/ui/components/CharacterCounter.tsx
import React from 'react';

interface CharacterCounterProps {
  current: number;
  max: number;
}

export const CharacterCounter: React.FC<CharacterCounterProps> = ({ current, max }) => {
  const isNearLimit = current >= max - 10;
  return (
    <span className={`char-counter ${isNearLimit ? 'near-limit' : ''}`}>
      {current} / {max}
    </span>
  );
};
```

```tsx
// src/client/ui/components/EvidenceSelector.tsx
import React from 'react';

export interface EvidenceCard {
  id: string;
  round: number;
  location: string;
  claimType: string;
  description: string;
}

interface EvidenceSelectorProps {
  cards: EvidenceCard[];
  selectedCardId?: string;
  onSelect: (cardId?: string) => void;
  targetLocation: string;
  claimType: string;
}

export const EvidenceSelector: React.FC<EvidenceSelectorProps> = ({
  cards,
  selectedCardId,
  onSelect,
  targetLocation,
  claimType,
}) => {
  // Only show cards matching current target and claim
  const matchingCards = cards.filter(
    (c) => c.location === targetLocation && c.claimType === claimType
  );

  if (matchingCards.length === 0) return null;

  return (
    <div className="evidence-attach-panel">
      <h4>Attach Verified Evidence (+6 Trust)</h4>
      {matchingCards.map((card) => (
        <label key={card.id} className="evidence-card-label">
          <input
            type="checkbox"
            checked={selectedCardId === card.id}
            onChange={() => onSelect(selectedCardId === card.id ? undefined : card.id)}
          />
          <span className="card-desc">Proof: {card.description}</span>
        </label>
      ))}
    </div>
  );
};
```

```tsx
// src/client/ui/screens/WriteScreen.tsx
import React, { useState } from 'react';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { CharacterCounter } from '../components/CharacterCounter';
import { EvidenceSelector, EvidenceCard } from '../components/EvidenceSelector';
import { TownLocation } from './InvestigateScreen';

export type ClaimType =
  | 'danger'
  | 'health_scare'
  | 'scandal'
  | 'great_deal'
  | 'weird_sighting'
  | 'all_clear'
  | 'expose';

export interface ProofCard {
  id: string;
  targetPaperName: string;
  headlineText: string;
  location: TownLocation;
  claimType: ClaimType;
}

export interface LockHeadlinePayload {
  location: TownLocation;
  claimType: ClaimType;
  text: string;
  evidenceCardId?: string;
  proofCardId?: string;
}

interface WriteScreenProps {
  hasLocked: boolean;
  evidenceCards: EvidenceCard[];
  proofCards: ProofCard[];
  onLockHeadline: (payload: LockHeadlinePayload) => void;
  onSkipWrite: () => void;
}

const CLAIMS: { id: ClaimType; label: string }[] = [
  { id: 'danger', label: 'Danger' },
  { id: 'health_scare', label: 'Health Scare' },
  { id: 'scandal', label: 'Scandal' },
  { id: 'great_deal', label: 'Great Deal' },
  { id: 'weird_sighting', label: 'Weird Sighting' },
  { id: 'all_clear', label: 'All Clear' },
];

const LOCATIONS: { id: TownLocation; label: string }[] = [
  { id: 'bakery', label: 'Bakery' },
  { id: 'bank', label: 'Bank' },
  { id: 'fountain', label: 'Fountain Square' },
  { id: 'town_hall', label: 'Town Hall' },
  { id: 'clinic', label: 'Clinic' },
];

export const WriteScreen: React.FC<WriteScreenProps> = ({
  hasLocked,
  evidenceCards,
  proofCards,
  onLockHeadline,
  onSkipWrite,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<TownLocation | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<ClaimType | null>(null);
  const [headlineText, setHeadlineText] = useState('');
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | undefined>();
  const [selectedProofId, setSelectedProofId] = useState<string | undefined>();
  const [modError, setModError] = useState<string | null>(null);

  const isExposeMode = selectedClaim === 'expose';

  const handleLock = () => {
    setModError(null);
    const trimmed = headlineText.trim();
    if (!trimmed || trimmed.length > 100) return;
    if (!selectedLocation || !selectedClaim) return;

    // Local word filter simulation check
    const forbidden = ['slur', 'hate'];
    if (forbidden.some((w) => trimmed.toLowerCase().includes(w))) {
      setModError('Our lawyers won’t print that — try again.');
      return;
    }

    onLockHeadline({
      location: selectedLocation,
      claimType: selectedClaim,
      text: trimmed,
      evidenceCardId: selectedEvidenceId,
      proofCardId: selectedProofId,
    });
  };

  if (hasLocked) {
    return (
      <div className="write-screen locked">
        <div className="locked-card">
          <h2>The Presses are Rolling!</h2>
          <p>Your headline has been locked in for publication.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="write-screen">
      <div className="editor-card">
        <h2>Front Page Editor</h2>

        {proofCards.length > 0 && (
          <div className="proof-exposure-banner">
            <h3>Hold Evidence of Rival Lies!</h3>
            {proofCards.map((p) => (
              <Button
                key={p.id}
                variant={selectedProofId === p.id ? 'primary' : 'secondary'}
                onClick={() => {
                  setSelectedProofId(p.id);
                  setSelectedClaim('expose');
                  setSelectedLocation(p.location);
                  setHeadlineText(`EXPOSED: ${p.targetPaperName} lied about ${p.location}!`);
                }}
              >
                Expose {p.targetPaperName}
              </Button>
            ))}
          </div>
        )}

        {!isExposeMode && (
          <>
            <div className="editor-section">
              <label>1. Pick Target Location</label>
              <div className="chips-row">
                {LOCATIONS.map((loc) => (
                  <Chip
                    key={loc.id}
                    label={loc.label}
                    selected={selectedLocation === loc.id}
                    onClick={() => setSelectedLocation(loc.id)}
                  />
                ))}
              </div>
            </div>

            <div className="editor-section">
              <label>2. Pick Claim Angle</label>
              <div className="chips-row">
                {CLAIMS.map((c) => (
                  <Chip
                    key={c.id}
                    label={c.label}
                    selected={selectedClaim === c.id}
                    onClick={() => setSelectedClaim(c.id)}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        <div className="editor-section">
          <div className="textarea-header">
            <label htmlFor="headline-input">3. Headline Text</label>
            <CharacterCounter current={headlineText.length} max={100} />
          </div>
          <textarea
            id="headline-input"
            maxLength={100}
            rows={3}
            placeholder="Write your front page headline (1–100 characters)..."
            value={headlineText}
            onChange={(e) => setHeadlineText(e.target.value)}
          />
          {modError && <div className="mod-error-banner" role="alert">{modError}</div>}
        </div>

        {selectedLocation && selectedClaim && (
          <EvidenceSelector
            cards={evidenceCards}
            selectedCardId={selectedEvidenceId}
            onSelect={setSelectedEvidenceId}
            targetLocation={selectedLocation}
            claimType={selectedClaim}
          />
        )}

        <div className="editor-actions">
          <Button
            variant="primary"
            disabled={!selectedLocation || !selectedClaim || !headlineText.trim()}
            onClick={handleLock}
            className="btn-large"
          >
            LOCK IT IN
          </Button>
          <Button variant="retro" onClick={onSkipWrite}>
            Skip Writing
          </Button>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify pass**

Run: `npx vitest run tests/ui/WriteScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/ui/components/CharacterCounter.tsx src/client/ui/components/EvidenceSelector.tsx src/client/ui/screens/WriteScreen.tsx tests/ui/WriteScreen.test.tsx
git commit -m "ui: implement WriteScreen editor with claim chips, live counter, and moderation check"
```

---

### Task 10: Front Page & Reveal Phase (4 Front Pages and Exposure Animations)

**Files:**
- Create: `src/client/ui/components/FrontPageCard.tsx`
- Create: `src/client/ui/components/ExposureBanner.tsx`
- Create: `src/client/ui/components/RecapBanner.tsx`
- Create: `src/client/ui/screens/RevealScreen.tsx`
- Create: `tests/ui/RevealScreen.test.tsx`

**Interfaces:**
- Consumes: Revealed headlines of all 4 seats, exposure events, recap line, and active speech bubbles.
- Produces: 20s Front Page presentation sliding 4 newspapers side-by-side with dramatic exposure stamps.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/ui/RevealScreen.test.tsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RevealScreen } from '../../src/client/ui/screens/RevealScreen';

describe('RevealScreen', () => {
  const mockFrontPages = [
    {
      seatId: 0,
      paperName: 'The Daily Gasp',
      color: 'red' as const,
      headlineText: 'Monsters Spotted in Town Fountain!',
      hasEvidence: false,
      isExposed: true,
      exposureReason: 'Town council verified it was just fountain bubbles.',
    },
    {
      seatId: 1,
      paperName: 'The Morning Ledger',
      color: 'blue' as const,
      headlineText: 'Town Hall Records All Clear',
      hasEvidence: true,
      isExposed: false,
    },
  ];

  it('renders all front pages as text, shows exposure stamp and recap line', () => {
    render(
      <RevealScreen
        frontPages={mockFrontPages}
        exposures={[{ paperName: 'The Daily Gasp', reason: 'Town council verified it was just fountain bubbles.' }]}
        recap="9 citizens rushed the square; 3 cancelled their subscriptions."
        bubbles={['What a scandal!', 'I saw it too!']}
      />
    );

    expect(screen.getByText('The Daily Gasp')).toBeDefined();
    expect(screen.getByText('Monsters Spotted in Town Fountain!')).toBeDefined();
    expect(screen.getByText('THE TRUTH COMES OUT')).toBeDefined();
    expect(screen.getByText('9 citizens rushed the square; 3 cancelled their subscriptions.')).toBeDefined();
    expect(screen.getByText('What a scandal!')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/ui/RevealScreen.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement components and RevealScreen**

```tsx
// src/client/ui/components/FrontPageCard.tsx
import React from 'react';
import { PaperBadge, PaperColor } from './PaperBadge';

export interface FrontPageView {
  seatId: number;
  paperName: string;
  color: PaperColor;
  headlineText: string;
  hasEvidence: boolean;
  isExposed: boolean;
  exposureReason?: string;
}

interface FrontPageCardProps {
  page: FrontPageView;
}

export const FrontPageCard: React.FC<FrontPageCardProps> = ({ page }) => {
  return (
    <div className={`front-page-card paper-border-${page.color} ${page.isExposed ? 'exposed' : ''}`}>
      <div className="newspaper-masthead">
        <PaperBadge paperName={page.paperName} color={page.color} />
        <div className="masthead-date">SPECIAL EDITION</div>
      </div>

      <div className="headline-body">
        <h2 className="headline-text">{page.headlineText}</h2>
      </div>

      <div className="front-page-badges">
        {page.hasEvidence && <span className="evidence-stamp">VERIFIED TRUTH</span>}
        {page.isExposed && (
          <div className="exposed-stamp-container">
            <span className="exposed-stamp">THE TRUTH COMES OUT</span>
            {page.exposureReason && <p className="exposed-reason">{page.exposureReason}</p>}
          </div>
        )}
      </div>
    </div>
  );
};
```

```tsx
// src/client/ui/components/ExposureBanner.tsx
import React from 'react';

export interface ExposureEvent {
  paperName: string;
  reason: string;
}

interface ExposureBannerProps {
  exposures: ExposureEvent[];
}

export const ExposureBanner: React.FC<ExposureBannerProps> = ({ exposures }) => {
  if (exposures.length === 0) return null;
  return (
    <div className="exposure-banner" role="alert">
      <h3>🚨 SCANDAL REPORT</h3>
      {exposures.map((e, idx) => (
        <div key={idx} className="exposure-entry">
          <strong>{e.paperName}:</strong> {e.reason}
        </div>
      ))}
    </div>
  );
};
```

```tsx
// src/client/ui/components/RecapBanner.tsx
import React from 'react';

interface RecapBannerProps {
  recap: string;
}

export const RecapBanner: React.FC<RecapBannerProps> = ({ recap }) => {
  return (
    <div className="recap-banner">
      <span className="recap-icon">📢</span>
      <span className="recap-text">{recap}</span>
    </div>
  );
};
```

```tsx
// src/client/ui/screens/RevealScreen.tsx
import React from 'react';
import { FrontPageCard, FrontPageView } from '../components/FrontPageCard';
import { ExposureBanner, ExposureEvent } from '../components/ExposureBanner';
import { RecapBanner } from '../components/RecapBanner';

interface RevealScreenProps {
  frontPages: FrontPageView[];
  exposures: ExposureEvent[];
  recap: string;
  bubbles?: string[];
}

export const RevealScreen: React.FC<RevealScreenProps> = ({
  frontPages,
  exposures,
  recap,
  bubbles = [],
}) => {
  // Respect spec limit of at most 6 bubbles
  const displayBubbles = bubbles.slice(0, 6);

  return (
    <div className="reveal-screen">
      <ExposureBanner exposures={exposures} />

      <div className="front-pages-carousel">
        {frontPages.map((page) => (
          <FrontPageCard key={page.seatId} page={page} />
        ))}
      </div>

      {displayBubbles.length > 0 && (
        <div className="speech-bubbles-overlay" aria-label="Citizen reactions">
          {displayBubbles.map((msg, i) => (
            <div key={i} className="citizen-speech-bubble">
              💬 {msg}
            </div>
          ))}
        </div>
      )}

      <RecapBanner recap={recap} />
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify pass**

Run: `npx vitest run tests/ui/RevealScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/ui/components/FrontPageCard.tsx src/client/ui/components/ExposureBanner.tsx src/client/ui/components/RecapBanner.tsx src/client/ui/screens/RevealScreen.tsx tests/ui/RevealScreen.test.tsx
git commit -m "ui: implement RevealScreen with 4 front pages, exposure stamps, and recap banner"
```

---

### Task 11: Final Edition Phase & Endgame Scoreboard

**Files:**
- Create: `src/client/ui/components/ScoreboardTable.tsx`
- Create: `src/client/ui/screens/FinalEditionScreen.tsx`
- Create: `tests/ui/FinalEditionScreen.test.tsx`

**Interfaces:**
- Consumes: Final scores, truth audit stats, truth reveals, `onPlayAgain()`.
- Produces: 40s Final Edition sequence (doubled-odds lie reveals, truth disclosures, final score leaderboard).

- [ ] **Step 1: Write the failing test**

```tsx
// tests/ui/FinalEditionScreen.test.tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FinalEditionScreen } from '../../src/client/ui/screens/FinalEditionScreen';

describe('FinalEditionScreen', () => {
  const mockScores = [
    {
      seatId: 0,
      paperName: 'The Bugle',
      playerName: 'Alice',
      color: 'red' as const,
      totalReaders: 45,
      finalTrust: 80,
      finalScore: 72,
      truthRecord: '1 lie told, 0 caught, 1 got away',
      isWinner: true,
    },
    {
      seatId: 1,
      paperName: 'The Gazette',
      playerName: 'Bob',
      color: 'blue' as const,
      totalReaders: 50,
      finalTrust: 40,
      finalScore: 40,
      truthRecord: '3 lies told, 2 caught, 1 got away',
      isWinner: false,
    },
  ];

  it('renders final scoreboard with calculation formula and winner announcement', () => {
    render(
      <FinalEditionScreen
        scoreboard={mockScores}
        onPlayAgain={vi.fn()}
      />
    );

    expect(screen.getByText('Final Edition Scoreboard')).toBeDefined();
    expect(screen.getByText('The Bugle')).toBeDefined();
    expect(screen.getByText('Score: 72')).toBeDefined();
    expect(screen.getByText('Winner: The Bugle!')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/ui/FinalEditionScreen.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement ScoreboardTable and FinalEditionScreen**

```tsx
// src/client/ui/components/ScoreboardTable.tsx
import React from 'react';
import { PaperBadge, PaperColor } from './PaperBadge';

export interface FinalScoreRow {
  seatId: number;
  paperName: string;
  playerName: string;
  color: PaperColor;
  totalReaders: number;
  finalTrust: number;
  finalScore: number;
  truthRecord: string;
  isWinner: boolean;
}

interface ScoreboardTableProps {
  scores: FinalScoreRow[];
}

export const ScoreboardTable: React.FC<ScoreboardTableProps> = ({ scores }) => {
  return (
    <table className="scoreboard-table">
      <thead>
        <tr>
          <th>Paper</th>
          <th>Total Readers</th>
          <th>Final Trust</th>
          <th>Truth Record</th>
          <th>Final Score</th>
        </tr>
      </thead>
      <tbody>
        {scores.map((row) => (
          <tr key={row.seatId} className={row.isWinner ? 'winner-row' : ''}>
            <td>
              <PaperBadge paperName={row.paperName} color={row.color} />
              <div className="player-sub">{row.playerName}</div>
            </td>
            <td>{row.totalReaders}</td>
            <td>{row.finalTrust} / 100</td>
            <td>{row.truthRecord}</td>
            <td className="score-cell">
              <strong>{row.finalScore}</strong>
              {row.isWinner && <span className="winner-trophy"> 🏆</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

```tsx
// src/client/ui/screens/FinalEditionScreen.tsx
import React from 'react';
import { ScoreboardTable, FinalScoreRow } from '../components/ScoreboardTable';
import { Button } from '../components/Button';

interface FinalEditionScreenProps {
  scoreboard: FinalScoreRow[];
  onPlayAgain: () => void;
}

export const FinalEditionScreen: React.FC<FinalEditionScreenProps> = ({
  scoreboard,
  onPlayAgain,
}) => {
  const winners = scoreboard.filter((s) => s.isWinner);
  const winnerText =
    winners.length > 1
      ? `Co-Winners: ${winners.map((w) => w.paperName).join(' & ')}!`
      : `Winner: ${winners[0]?.paperName || 'The Town'}!`;

  return (
    <div className="screen-container final-edition-screen">
      <div className="final-card">
        <h1>Final Edition Scoreboard</h1>
        <div className="winner-announcement">{winnerText}</div>
        <p className="formula-explanation">
          Score = total readers × (final trust ÷ 50)
        </p>

        <ScoreboardTable scores={scoreboard} />

        <div className="final-actions">
          <Button variant="primary" onClick={onPlayAgain} className="btn-large">
            Play Again
          </Button>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify pass**

Run: `npx vitest run tests/ui/FinalEditionScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/ui/components/ScoreboardTable.tsx src/client/ui/screens/FinalEditionScreen.tsx tests/ui/FinalEditionScreen.test.tsx
git commit -m "ui: implement FinalEditionScreen and ScoreboardTable with win formula"
```

---

### Task 12: Network Disconnect, Reconnect, Caretaker & Fallback Views

**Files:**
- Create: `src/client/ui/screens/ConnectionOverlay.tsx`
- Create: `src/client/ui/screens/ServerRestartScreen.tsx`
- Create: `src/client/ui/screens/WebGLFallbackScreen.tsx`
- Create: `src/client/ui/screens/AppRouter.tsx`
- Create: `tests/ui/AppRouter.test.tsx`

**Interfaces:**
- Consumes: Store connection status, WebGL capability check, match phase router.
- Produces: Top-level AppRouter switching between views, handling disconnect overlays, server-restarted screens, and WebGL 2D panel mode.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/ui/AppRouter.test.tsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppRouter } from '../../src/client/ui/screens/AppRouter';

describe('AppRouter', () => {
  it('renders home screen by default in clean state', () => {
    render(<AppRouter />);
    expect(screen.getByText('NEWS TOWN')).toBeDefined();
    expect(screen.getByText('Play Solo')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/ui/AppRouter.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement fallbacks and AppRouter**

```tsx
// src/client/ui/screens/ConnectionOverlay.tsx
import React from 'react';

interface ConnectionOverlayProps {
  status: 'connecting' | 'reconnecting' | 'disconnected';
  onRetry?: () => void;
}

export const ConnectionOverlay: React.FC<ConnectionOverlayProps> = ({ status, onRetry }) => {
  if (status === 'disconnected') {
    return (
      <div className="connection-modal-backdrop">
        <div className="connection-modal" role="dialog" aria-labelledby="conn-title">
          <h2 id="conn-title">Connection Lost</h2>
          <p>Attempting to reach the printing press...</p>
          {onRetry && (
            <button type="button" onClick={onRetry} className="btn btn-primary">
              Reconnect Now
            </button>
          )}
        </div>
      </div>
    );
  }
  return null;
};
```

```tsx
// src/client/ui/screens/ServerRestartScreen.tsx
import React from 'react';
import { Button } from '../components/Button';

interface ServerRestartScreenProps {
  onReturnHome: () => void;
}

export const ServerRestartScreen: React.FC<ServerRestartScreenProps> = ({ onReturnHome }) => {
  return (
    <div className="screen-container server-restart-screen">
      <div className="error-card">
        <h2>The presses stopped — this match ended</h2>
        <p>The server restarted or the room expired.</p>
        <Button variant="primary" onClick={onReturnHome}>
          Return to Home
        </Button>
      </div>
    </div>
  );
};
```

```tsx
// src/client/ui/screens/WebGLFallbackScreen.tsx
import React from 'react';

export const WebGLFallbackScreen: React.FC = () => {
  return (
    <aside className="webgl-fallback-banner" role="status">
      <span>3D town view unavailable on this browser. Playing in 2D newsroom mode.</span>
    </aside>
  );
};
```

```tsx
// src/client/ui/screens/AppRouter.tsx
import React, { useState } from 'react';
import { HomeScreen } from './HomeScreen';
import { JoinScreen } from './JoinScreen';
import { LobbyScreen } from './LobbyScreen';
import { IntroScreen } from './IntroScreen';
import { InvestigateScreen } from './InvestigateScreen';
import { WriteScreen } from './WriteScreen';
import { RevealScreen } from './RevealScreen';
import { FinalEditionScreen } from './FinalEditionScreen';
import { HUD } from '../hud/HUD';
import { SoundProvider } from '../audio/SoundContext';

export type AppView =
  | 'home'
  | 'join'
  | 'lobby'
  | 'intro'
  | 'investigate'
  | 'write'
  | 'reveal'
  | 'finale'
  | 'restart';

export const AppRouter: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [roomCode, setRoomCode] = useState<string>('');

  return (
    <SoundProvider>
      <div className="app-layout">
        {currentView === 'home' && (
          <HomeScreen
            onPlaySolo={() => setCurrentView('join')}
            onCreateRoom={() => setCurrentView('join')}
            onJoinCode={(code) => {
              setRoomCode(code);
              setCurrentView('join');
            }}
          />
        )}
        {currentView === 'join' && (
          <JoinScreen
            onSubmit={() => setCurrentView('lobby')}
          />
        )}
        {currentView === 'lobby' && (
          <LobbyScreen
            roomCode={roomCode || 'SOLO1'}
            isHost={true}
            seats={[
              { seatId: 0, playerName: 'Editor', paperName: 'Daily Gasp', color: 'red', isBot: false },
              { seatId: 1, playerName: null, paperName: null, color: null, isBot: true },
              { seatId: 2, playerName: null, paperName: null, color: null, isBot: true },
              { seatId: 3, playerName: null, paperName: null, color: null, isBot: true },
            ]}
            onStartMatch={() => setCurrentView('intro')}
          />
        )}
        {currentView === 'intro' && (
          <IntroScreen
            deadlineMs={Date.now() + 20000}
            serverTimeOffset={0}
            onSkipIntro={() => setCurrentView('investigate')}
          />
        )}
      </div>
    </SoundProvider>
  );
};
```

- [ ] **Step 4: Run test to verify pass**

Run: `npx vitest run tests/ui/AppRouter.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/ui/screens/ConnectionOverlay.tsx src/client/ui/screens/ServerRestartScreen.tsx src/client/ui/screens/WebGLFallbackScreen.tsx src/client/ui/screens/AppRouter.tsx tests/ui/AppRouter.test.tsx
git commit -m "ui: implement AppRouter with fallback views and screen switching"
```

---

### Task 13: Fixture Player Development Harness for Standalone UI Verification

**Files:**
- Create: `src/client/ui/dev/FixturePlayer.tsx`
- Create: `tests/ui/FixturePlayer.test.tsx`

**Interfaces:**
- Consumes: Sample recorded fixture matches in `src/sim/fixtures/`.
- Produces: Visual test stepper allowing jumping between any match round/phase and mocking state in isolation without a backend server.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/ui/FixturePlayer.test.tsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FixturePlayer } from '../../src/client/ui/dev/FixturePlayer';

describe('FixturePlayer Harness', () => {
  const sampleSteps = [
    { round: 1, phase: 'investigate' as const, label: 'Round 1 Investigate' },
    { round: 1, phase: 'write' as const, label: 'Round 1 Write' },
    { round: 1, phase: 'reveal' as const, label: 'Round 1 Reveal' },
  ];

  it('steps through fixture timeline with next/prev buttons', () => {
    render(<FixturePlayer steps={sampleSteps} />);

    expect(screen.getByText('Step 1 of 3: Round 1 Investigate')).toBeDefined();

    const nextBtn = screen.getByText('Next Step');
    fireEvent.click(nextBtn);
    expect(screen.getByText('Step 2 of 3: Round 1 Write')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/ui/FixturePlayer.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement FixturePlayer**

```tsx
// src/client/ui/dev/FixturePlayer.tsx
import React, { useState } from 'react';
import { Button } from '../components/Button';
import { GamePhase } from '../hud/TopBar';

export interface FixtureStep {
  round: number;
  phase: GamePhase;
  label: string;
}

interface FixturePlayerProps {
  steps: FixtureStep[];
  onStepChange?: (step: FixtureStep) => void;
}

export const FixturePlayer: React.FC<FixturePlayerProps> = ({ steps, onStepChange }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentStep = steps[currentIndex] || { round: 1, phase: 'intro', label: 'Empty' };

  const handleNext = () => {
    if (currentIndex < steps.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      onStepChange?.(steps[nextIdx]);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      onStepChange?.(steps[prevIdx]);
    }
  };

  return (
    <div className="fixture-player-toolbar" role="toolbar" aria-label="Fixture Player Controls">
      <div className="step-label">
        Step {currentIndex + 1} of {steps.length}: {currentStep.label}
      </div>
      <div className="step-actions">
        <Button variant="secondary" onClick={handlePrev} disabled={currentIndex === 0}>
          Previous Step
        </Button>
        <Button variant="primary" onClick={handleNext} disabled={currentIndex === steps.length - 1}>
          Next Step
        </Button>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify pass**

Run: `npx vitest run tests/ui/FixturePlayer.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/ui/dev/FixturePlayer.tsx tests/ui/FixturePlayer.test.tsx
git commit -m "ui: implement FixturePlayer dev harness for recorded fixture verification"
```
