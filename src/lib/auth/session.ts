/**
 * Session management using signed JWT cookies.
 *
 * Uses the Web Crypto API (available in Edge and Node 18+) — no additional packages.
 * Algorithm: HS256 via a STOREFRONT_JWT_SECRET env variable.
 */
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'xbk_session';

export interface SessionPayload {
  customerId: string;
  email: string;
  name: string;
  storeSlug: string;
  firebaseToken?: string;
  iat?: number;
  exp?: number;
}

// ---------------------------------------------------------------------------
// Crypto helpers
// ---------------------------------------------------------------------------

function base64UrlEncode(input: string | Uint8Array): string {
  const bytes =
    typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function getSigningKey(): Promise<CryptoKey> {
  const secret = process.env.STOREFRONT_JWT_SECRET;
  if (!secret) throw new Error('STOREFRONT_JWT_SECRET is not set');
  const keyBytes = new TextEncoder().encode(secret);
  return crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

// ---------------------------------------------------------------------------
// Sign / verify
// ---------------------------------------------------------------------------

export async function signSession(payload: SessionPayload): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: SessionPayload = { ...payload, iat: now, exp: now + 60 * 60 * 24 * 7 };

  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify(fullPayload));
  const signingInput = `${header}.${body}`;

  const key = await getSigningKey();
  const sigBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signingInput),
  );
  const sig = base64UrlEncode(new Uint8Array(sigBytes));

  return `${signingInput}.${sig}`;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const signingInput = `${parts[0]}.${parts[1]}`;
  const key = await getSigningKey();

  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    base64UrlDecode(parts[2]),
    new TextEncoder().encode(signingInput),
  );
  if (!valid) return null;

  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1]))) as SessionPayload;

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload;
}

// ---------------------------------------------------------------------------
// Server-component helper
// ---------------------------------------------------------------------------

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}
