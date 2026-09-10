# Storefront e-commerce roadmap — execution tracker

Follows the readiness assessment (2026-09-10). Status: ☐ todo · ◐ in progress · ☑ done · ⧗ needs live config/keys.

## P0 — revenue / trust blockers
- ☑ **Transactional email**: order confirmation on every payment path (Stripe/PayPal/COD); provider-agnostic mailer (Resend/SMTP via env), graceful no-op when unconfigured. Templates: order confirmation. (Password reset is API-side; noted.)
- ☑ **Shipping cost**: shipping rules (flat / free-over-threshold / pickup free) surfaced at checkout, added to order total; API order model gains `shipping_amount`; SDK + storefront wired; order summary shows a Shipping line.
- ☑ **Analytics + conversion tracking**: GA4 + Meta pixel via storefront config ids; `view_item`, `add_to_cart`, `begin_checkout`, `purchase` events; consent-safe.
- ☑ **Reliability net**: SDK↔API contract tests (paths + snake/camel shapes) so a wire mismatch fails CI; synthetic checkout smoke (create→pay→read) runnable against live.

## P1 — conversion / AOV
- ☑ **Customer accounts** (rebuilt on tenant Firebase Auth) (discovered): SDK `registerCustomer`/`loginCustomer` call `/customers/register|login`, which the API does not serve — customer auth is Firebase-based (`/customers/firebase-register|verify`). Rebuild storefront auth on the tenant's Firebase (createUser/signIn → token → firebase-register/verify), or add password endpoints to the API. Guest checkout unaffected.
- ☑ Server-side search + pagination (remove the 100-product client cap; faceting)
- ☐ Upsell/cross-sell on PDP (wire existing `/catalog/upsells`)
- ☐ Loyalty redemption in checkout (SDK/API already support `loyaltyPointsRedeemed`)
- ☐ Express checkout (Apple/Google Pay via Stripe Payment Request)
- ☐ Abandoned-cart capture + recovery email
- ☐ Address autocomplete/validation; free-shipping-threshold nudge

## P2 — scale / enterprise
- ☐ Distributed rate limiting (Upstash/Vercel KV) replacing in-memory map
- ☐ Observability: error tracking (Sentry), uptime, perf budgets
- ☐ Multi-currency + i18n (locale, currency per session/region)
- ☐ Returns / RMA self-service
- ☐ A/B testing hooks
- ☐ Headless-CMS content model / per-store storefront editor maturity

## Notes
- API is always LIVE (never mock); StoreFront on :7090; gateway free tier 100/day/key.
- Keep provider integrations env-driven; no hard dependency that breaks a store lacking the key.
