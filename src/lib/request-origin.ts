/**
 * Where this shop is, as the request arrived at it.
 *
 * A share link has to be absolute — a relative one pasted into WhatsApp goes
 * nowhere — and `window.location` cannot answer during SSR, which has now
 * cost two features: the order page's share row rendered as nothing, and the
 * article rail shipped WhatsApp and X links with an empty URL after it.
 *
 * So the answer is resolved once, here, on the server, and passed down as a
 * prop. A component that needs the address asks for it rather than reaching
 * for a global that is only there half the time.
 */
import { headers } from 'next/headers';

/** `https://shop.example` — empty when the host header is missing. */
export function requestOrigin(): string {
  const incoming = headers();
  const host = incoming.get('x-forwarded-host') ?? incoming.get('host') ?? '';
  if (!host) return '';
  // A proxy states the scheme. Without one, only a local host is plain HTTP;
  // guessing `http` for a real domain would hand out a link that redirects.
  const proto =
    incoming.get('x-forwarded-proto') ??
    (/^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(host) ? 'http' : 'https');
  return `${proto}://${host}`;
}

/** The absolute address of a path within a shop, or `''` if unknowable. */
export function shopUrl(storeSlug: string, path = ''): string {
  const origin = requestOrigin();
  if (!origin) return '';
  const tail = path && !path.startsWith('/') ? `/${path}` : path;
  return `${origin}/${storeSlug}${tail}`;
}
