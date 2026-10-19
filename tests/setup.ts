// Vitest setup for every test file (owner: Claude). Vitest runs with globals off, so Testing Library's
// automatic cleanup is off too; without it, mounted timers (CountdownTimer's 250 ms interval) outlive
// the test file and fire after jsdom teardown ("window is not defined").
import { afterAll, afterEach } from 'vitest';

afterEach(async () => {
  if (typeof document === 'undefined') return; // node-environment files never load Testing Library
  const { cleanup } = await import('@testing-library/react');
  cleanup();
});

afterAll(() => {
  if (typeof document === 'undefined') return;
  const leaked = document.querySelectorAll('[role="timer"]').length;
  if (leaked > 0) throw new Error(`${leaked} mounted timer(s) left after the test file; unmount them (cleanup)`);
});
