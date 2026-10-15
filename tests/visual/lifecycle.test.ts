import { describe, expect, it } from 'vitest';
import { withBrowserAndServer } from '../../scripts/visual/lifecycle.ts';
import type { GameServer } from '../../scripts/visual/server.ts';

function fakeServer(events: string[]): GameServer {
  return { stop: () => { events.push('server stopped'); }, logTail: () => '', exited: new Promise(() => {}) };
}

describe('withBrowserAndServer', () => {
  it('starts no server when the browser fails to launch', async () => {
    const events: string[] = [];
    await expect(withBrowserAndServer(
      { launch: () => Promise.reject(new Error("Executable doesn't exist")), start: () => { events.push('server started'); return fakeServer(events); } },
      async () => { events.push('body'); },
    )).rejects.toThrow("Executable doesn't exist");
    expect(events).toEqual([]);
  });

  it('closes the browser and stops the server when the body fails', async () => {
    const events: string[] = [];
    await expect(withBrowserAndServer(
      {
        launch: async () => ({ close: async () => { events.push('browser closed'); } }),
        start: () => { events.push('server started'); return fakeServer(events); },
      },
      async () => { events.push('body'); throw new Error('harness reported error'); },
    )).rejects.toThrow('harness reported error');
    expect(events).toEqual(['server started', 'body', 'browser closed', 'server stopped']);
  });

  it('closes the browser if starting the server throws', async () => {
    const events: string[] = [];
    await expect(withBrowserAndServer(
      {
        launch: async () => ({ close: async () => { events.push('browser closed'); } }),
        start: () => { throw new Error('spawn failed'); },
      },
      async () => { events.push('body'); },
    )).rejects.toThrow('spawn failed');
    expect(events).toEqual(['browser closed']);
  });
});
