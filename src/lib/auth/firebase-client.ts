'use client';

/**
 * Client-side customer auth against the tenant's own Firebase Auth.
 *
 * The API stores no passwords — customer identity lives in the merchant's
 * Firebase project. The browser signs in there and exchanges the resulting ID
 * token for a Xeboki session (see /api/auth/login|register). We fetch the
 * public Firebase config per store at runtime and initialise a NAMED secondary
 * app so this never clashes with anything else on the page.
 */
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  type Auth,
} from 'firebase/auth';

export class AccountsUnavailableError extends Error {
  constructor() {
    super('Online accounts are not available for this store.');
    this.name = 'AccountsUnavailableError';
  }
}

const APP_PREFIX = 'xbk-store-';
const configCache = new Map<string, Record<string, string>>();

async function authFor(storeSlug: string): Promise<Auth> {
  let config = configCache.get(storeSlug);
  if (!config) {
    const res = await fetch(`/api/auth/firebase-config?store=${encodeURIComponent(storeSlug)}`);
    if (!res.ok) throw new AccountsUnavailableError();
    const cfg = await res.json();
    if (!cfg?.apiKey || !cfg?.projectId) throw new AccountsUnavailableError();
    config = {
      apiKey: cfg.apiKey,
      appId: cfg.appId,
      projectId: cfg.projectId,
      authDomain: cfg.authDomain || `${cfg.projectId}.firebaseapp.com`,
      ...(cfg.messagingSenderId ? { messagingSenderId: cfg.messagingSenderId } : {}),
      ...(cfg.storageBucket ? { storageBucket: cfg.storageBucket } : {}),
    };
    configCache.set(storeSlug, config);
  }

  const name = `${APP_PREFIX}${storeSlug}`;
  const app: FirebaseApp = getApps().find((a) => a.name === name)
    ? getApp(name)
    : initializeApp(config, name);
  return getAuth(app);
}

/** Signs the customer in and returns a fresh Firebase ID token. */
export async function signInWithEmail(
  storeSlug: string,
  email: string,
  password: string,
): Promise<string> {
  const auth = await authFor(storeSlug);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user.getIdToken();
}

/** Creates the Firebase user, sets the display name, and returns an ID token. */
export async function registerWithEmail(
  storeSlug: string,
  email: string,
  password: string,
  name?: string,
): Promise<string> {
  const auth = await authFor(storeSlug);
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (name) {
    try {
      await updateProfile(cred.user, { displayName: name });
    } catch {
      /* non-fatal — the name is also sent to registerCustomerToken */
    }
  }
  return cred.user.getIdToken();
}

/** Maps Firebase Auth error codes to human copy. */
export function friendlyAuthError(err: unknown): string {
  if (err instanceof AccountsUnavailableError) return err.message;
  const code = (err as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in.';
    case 'auth/weak-password':
      return 'Please choose a password of at least 6 characters.';
    case 'auth/invalid-email':
      return 'That email address looks invalid.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
