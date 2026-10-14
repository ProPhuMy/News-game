import type { IncomingHttpHeaders } from 'node:http';
import { isIP } from 'node:net';

export function clientAddress(peer: string, headers: IncomingHttpHeaders, trustRenderProxy = false): string {
  // Render's Cloudflare edge overwrites this header; direct deployments must not trust it.
  const forwarded = headers['cf-connecting-ip'];
  return trustRenderProxy && typeof forwarded === 'string' && isIP(forwarded) ? forwarded : peer;
}
