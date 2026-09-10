/**
 * Server-side SDK factory.
 *
 * Each request creates a scoped SDK instance authenticated with the merchant's API key.
 * API keys are stored in Xeboki's backend keyed by merchant slug — we fetch them via
 * the `GET /v1/pos/store-config` endpoint which returns the key as part of provisioning.
 *
 * NEVER import this in client components. Only use in Server Components and Route Handlers.
 */
import { XebokiClient } from '@xeboki/sdk';

// Module-level cache: slug → client (lives for process lifetime = warm cache in serverless)
const clientCache = new Map<string, XebokiClient>();

/**
 * Returns a cached XebokiClient for a given merchant API key.
 * Cache key is the API key itself so different merchants never share an instance.
 */
export function getXebokiClient(apiKey: string): XebokiClient {
  if (clientCache.has(apiKey)) {
    return clientCache.get(apiKey)!;
  }
  const secret = process.env.STOREFRONT_SERVICE_SECRET;
  const client = new XebokiClient({
    apiKey,
    baseUrl: process.env.XEBOKI_API_BASE_URL ?? 'https://api.xeboki.com',
    // First-party marker: lets the gateway exempt this shop's traffic from the
    // per-key daily quota (a store's whole public traffic runs through one key).
    // Server-side only — never reaches the browser.
    ...(secret ? { headers: { 'X-Xeboki-Storefront-Secret': secret } } : {}),
  });
  clientCache.set(apiKey, client);
  return client;
}
