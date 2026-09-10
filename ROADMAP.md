# Storefront e-commerce roadmap — execution tracker

Assessment 2026-09-10. Status: done | needs-config (keys/dashboard) | decision (product/FX choice).

## P0 — revenue / trust blockers  → COMPLETE
- [done] Transactional email — order confirmation on Stripe/PayPal/COD (lib/email/, Resend). needs-config: RESEND_API_KEY, EMAIL_FROM.
- [done] Shipping cost — API shipping_amount in total; storefront rules (flat / free-over-threshold, pickup free) + checkout line.
- [done] Analytics + conversion — GA4 + Meta Pixel; view_item/add_to_cart/begin_checkout/purchase (deduped). needs-config: ids.
- [done] Reliability net — free SDK<->API contract test; live checkout smoke (verify_storefront_live.py).

## P1 — conversion / AOV  → COMPLETE
- [done] Customer accounts — rebuilt on tenant Firebase Auth.
- [done] Server-side search + pagination — search/category/in-stock/sort/paging via API; 100-cap gone.
- [done] Upsell/cross-sell on PDP — /catalog/upsells.
- [done] Express Apple/Google Pay — via Stripe PaymentElement. needs-config: enable wallets + verify Apple Pay domain in Stripe dashboard.
- [done] Loyalty redemption in checkout — API now reduces the total by the clamped redemption value; checkout UI for signed-in customers.
- [done] Abandoned-cart recovery — capture at checkout, hourly cron emails via Resend, order closes the cart. needs-config: STOREFRONT_STORES, CRON_SECRET.
- [done] Address autocomplete/validation — Google Places on the address form. needs-config: NEXT_PUBLIC_GOOGLE_PLACES_KEY (degrades to manual entry).

## P2 — scale / enterprise
- [done] Distributed rate limiting — Upstash REST in middleware, in-memory fallback. needs-config: UPSTASH_REDIS_REST_URL/_TOKEN.
- [done] Observability baseline — error boundaries report to /api/log (ERROR_WEBHOOK_URL). Production: drop in @sentry/nextjs + SENTRY_DSN (needs install through workspace tooling).
- [done] i18n framework — locale resolver + en/es dictionaries + server/client t(); header wired. Extend by translating remaining strings.
- [done] Returns / RMA — self-service on the order page; API order_returns.
- [done] A/B testing — lib/experiments.tsx: registry + useExperiment() + exposure events. Register experiments to use.
- [decision] Multi-currency CHARGING — display is already store-currency-correct everywhere; charging a buyer in their own currency needs an FX source + Stripe presentment-currency setup. Product/finance decision.
- [decision] Headless-CMS / visual storefront editor — storefront already consumes blog + custom pages + config; a visual per-store editor belongs in the Manager app (separate surface), not the storefront.

## needs-config summary (set these to activate)
RESEND_API_KEY, EMAIL_FROM · GA4/Meta ids · UPSTASH_REDIS_REST_URL/_TOKEN · STOREFRONT_STORES, CRON_SECRET, ABANDONED_CART_MINUTES · NEXT_PUBLIC_GOOGLE_PLACES_KEY · ERROR_WEBHOOK_URL · NEXT_PUBLIC_DEFAULT_LOCALE · Stripe dashboard: wallets + Apple Pay domain.

## remaining decisions for the team
- Multi-currency charging (FX source + payment config) — the only true feature gap left.
- Sentry account/DSN if the /api/log baseline isn't enough.
- API is always LIVE (never mock); StoreFront on :7090; gateway free tier 100/day/key — upgrade for load.
