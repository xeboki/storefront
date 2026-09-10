# Storefront e-commerce roadmap — execution tracker

Follows the readiness assessment (2026-09-10). Status: done | needs-config (keys) | blocked (decision/account).

## P0 — revenue / trust blockers  → COMPLETE
- [done] Transactional email — order confirmation on Stripe/PayPal/COD; provider-agnostic mailer (lib/email/, Resend via env), best-effort. needs-config: RESEND_API_KEY + EMAIL_FROM.
- [done] Shipping cost — API shipping_amount folded into total; storefront lib/shipping.ts (flat / free-over-threshold, pickup free), Shipping line at checkout; rules from config or env.
- [done] Analytics + conversion — GA4 + Meta Pixel via config/env ids; view_item / add_to_cart / begin_checkout / purchase (deduped). needs-config: GA4/Pixel ids.
- [done] Reliability net — free SDK<->API contract test (fails CI on path drift); opt-in live checkout smoke (verify_storefront_live.py).

## P1 — conversion / AOV
- [done] Customer accounts — rebuilt on the tenant's Firebase Auth (were calling non-existent /customers/register|login). Client Firebase sign-in -> ID token -> /api/auth/* -> session.
- [done] Server-side search + pagination — URL-driven search / category / in-stock / sort / paging, resolved by the API (removed the 100-product client cap and the dead CatalogClientWrapper).
- [done] Upsell/cross-sell on PDP — wired the existing /catalog/upsells; "You might also like" on the product page.
- [done] Express Apple/Google Pay — already provided by Stripe PaymentElement; needs-config: enable wallets + verify the Apple Pay domain in the Stripe dashboard (no code). A top-of-funnel ExpressCheckoutElement button is a future nicety.
- [blocked] Loyalty redemption in checkout — API applies loyalty_points_redeemed as a POST-write ledger entry; it does NOT reduce the order's charged total at creation. Exposing it in checkout would misprice the order. Needs a careful API spec: compute redemption_value before the total, subtract it like a discount, and stop the post-write ledger op double-counting. Deferred to avoid a money bug.
- [blocked] Abandoned-cart capture + recovery email — needs a persistence store for in-progress carts + a scheduled job (cron) to send. Infra decision.
- [blocked] Address autocomplete/validation — needs an external provider (Google Places / Loqate) + key.

## P2 — scale / enterprise
- [done] Distributed rate limiting — middleware uses Upstash REST (one pipelined call, Edge-safe, fails open) when UPSTASH_REDIS_REST_URL/_TOKEN are set, else the in-memory map. needs-config: Upstash env in prod.
- [blocked] Observability (Sentry/uptime/perf) — add @sentry/nextjs gated on SENTRY_DSN; needs a Sentry account/DSN + uptime monitor choice.
- [blocked] Multi-currency + i18n — large; needs locale/currency model + translated-content decisions.
- [blocked] Returns / RMA self-service — needs API endpoints + UI; product decision on policy.
- [blocked] A/B testing hooks — needs a framework / flag-provider choice.
- [blocked] Headless-CMS content / per-store storefront editor — large; product decision.

## Decisions the team needs to make (to unblock)
- Provider picks: email (Resend assumed), address validation, Sentry, Upstash; GA4/Pixel ids per store.
- Loyalty-in-checkout needs the API accounting change above before it can be exposed safely.
- Gateway free tier is 100 req/day/key — upgrade for real load.
- API is always LIVE (never mock); StoreFront runs on :7090.
