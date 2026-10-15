import type { GameServer } from './server.ts';

/**
 * Launches the browser before the server, so a launch failure (for example a missing Chromium build)
 * leaves nothing running. Once the server exists, it is stopped and the browser closed on every exit path.
 */
export async function withBrowserAndServer<B extends { close(): Promise<void> }>(
  deps: { launch: () => Promise<B>; start: () => GameServer },
  body: (browser: B, server: GameServer) => Promise<void>,
): Promise<void> {
  const browser = await deps.launch();
  let server: GameServer | undefined;
  try {
    server = deps.start();
    await body(browser, server);
  } finally {
    await browser.close();
    server?.stop();
  }
}
