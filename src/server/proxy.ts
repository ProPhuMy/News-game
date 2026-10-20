import type { IncomingHttpHeaders } from 'node:http';
import { isIP } from 'node:net';

export function clientAddress(peer: string, headers: IncomingHttpHeaders, trustRenderProxy = false, trustedProxyAddress?: string): string {
  const normalize = (ip: string) => ip.startsWith('::ffff:') && isIP(ip.slice(7)) === 4 ? ip.slice(7) : ip;
  if (trustedProxyAddress && normalize(peer) === normalize(trustedProxyAddress)) {
    const forwarded = headers['x-real-ip'];
    return typeof forwarded === 'string' && isIP(forwarded) ? forwarded : peer;
  }
  // Render's Cloudflare edge overwrites this header; direct deployments must not trust it.
  const forwarded = headers['cf-connecting-ip'];
  return trustRenderProxy && typeof forwarded === 'string' && isIP(forwarded) ? forwarded : peer;
}
