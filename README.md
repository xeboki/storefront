<p align="center">
  <img src="public/icon.svg" alt="Xeboki" width="120" />
</p>

<h1 align="center">Xeboki Storefront</h1>

<p align="center">
  Self-hosted Next.js ecommerce storefront for <a href="https://xeboki.com/xe-pos">Xeboki POS</a> subscribers.<br/>
  Your domain. Your brand. Fully connected to your POS inventory and orders.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-000000?logo=next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" />
  <img src="https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss" />
  <img src="https://img.shields.io/badge/License-Xeboki%20Subscriber-6366F1" />
</p>

---

## What is this?

A production-ready, self-hosted ecommerce storefront that connects directly to your **Xeboki POS**. Deploy it on your own domain — Vercel, any Node host, or Docker. Your products, inventory, orders, and customer accounts all sync live from the POS with no extra work.

**What your customers get:**
- Full product catalog with categories, search, and modifiers
- Shopping cart with persistent sessions
- Checkout — Stripe card payments, PayPal, cash on delivery, gift cards, and discount codes
- Customer accounts — order history, saved addresses, wishlist, re-order
- Appointment booking (salons, gyms, clinics, service businesses)
- Repair / work order lookup (phone repair, auto, IT)
- Blog with full Markdown / rich-text support
- Static pages — About, FAQ, Returns Policy, Terms, and custom pages
- Auto-generated sitemap and per-page SEO meta

**What stays in sync from your POS automatically:**
- Products, categories, inventory levels, and out-of-stock status
- Prices, tax rates, and currency
- Business name, address, trading hours
- Enabled payment methods (Stripe, PayPal, COD)
- Discount codes and promotions
- Store settings (accept orders toggle, require login, show out-of-stock)

---

## Requirements

| | |
|---|---|
| **Xeboki POS subscription** | **Paid plan required.** Free accounts cannot access the developer API. Get a plan at [xeboki.com/xe-pos](https://xeboki.com/xe-pos) |
| Node.js | ≥ 18 LTS |
| npm / pnpm | Any recent version |
| Xeboki API Key | `pos:read` + `pos:write` scopes — create at [account.xeboki.com](https://account.xeboki.com) |
| Stripe account | Required for card payments (optional if COD/PayPal only) |
| PayPal developer app | Required for PayPal checkout (optional) |
| Hosting | Vercel (recommended), any Node 18+ host, or Docker |

---

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/xeboki/storefront.git
cd storefront

# 2. Install dependencies
npm install

# 3. Copy environment template and fill in your values
cp .env.example .env.local

# 4. Run locally
npm run dev
```

Your store is now running at `http://localhost:3000`.

In development, set `NEXT_PUBLIC_DEV_STORE_SLUG=your-slug` in `.env.local` to emulate your subdomain locally without DNS configuration.

---

## Get Your API Key

1. Log in to **[account.xeboki.com](https://account.xeboki.com) → Developer → API Keys**
2. Create a key with `pos:read` and `pos:write` scopes
3. Copy the key — it starts with `xbk_live_...`

> Your API key is validated on every page load. Free plan accounts are blocked and shown an upgrade screen. Only paid subscribers with Storefront access can use the developer API.

---

## Environment Variables

Create `.env.local` from `.env.example` and fill in:

```env
# ── Required ──────────────────────────────────────────────────────────────────

# Your Xeboki API key (pos:read + pos:write)
XEBOKI_API_KEY=xbk_live_...

# Base domain for subdomain routing
# Local dev: localhost:3000
# Production: yourdomain.com or yourbrand.xeboki.store
NEXT_PUBLIC_BASE_DOMAIN=yourdomain.com

# Your store slug (matches your Xeboki POS account slug)
NEXT_PUBLIC_DEV_STORE_SLUG=your-slug         # dev only — remove in production

# ── Stripe (card payments) ────────────────────────────────────────────────────
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ── PayPal (optional) ─────────────────────────────────────────────────────────
NEXT_PUBLIC_PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...

# ── Session (customer auth) ───────────────────────────────────────────────────
SESSION_SECRET=a-random-string-at-least-32-chars

# ── Firebase (optional — customer auth via Firebase) ─────────────────────────
# Leave empty to use the default REST-based auth
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
```

**Never commit `.env.local`.** It is gitignored. For Vercel, add these as Environment Variables in your project settings.

---

## Routing — Subdomain vs Path

The storefront supports two routing modes controlled by `NEXT_PUBLIC_BASE_DOMAIN`:

**Subdomain mode (production)**

Each store gets its own subdomain: `{slug}.yourdomain.com`.

The Next.js middleware reads the subdomain from the `Host` header and rewrites the request to `/[store]/...` internally. No DNS wildcard is required at the app level — configure `*.yourdomain.com` at your DNS provider / Vercel.

**Path mode (development)**

Set `NEXT_PUBLIC_DEV_STORE_SLUG=mystore` and all requests are treated as `mystore.localhost:3000` without any DNS setup.

---

## Deployment

### Vercel (recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

1. Push your fork to GitHub
2. Import the repo in [vercel.com/new](https://vercel.com/new)
3. Add all environment variables in **Settings → Environment Variables**
4. Add a wildcard domain `*.yourdomain.com` in **Settings → Domains**

Vercel automatically handles builds, CDN, and HTTPS.

### Self-hosted (Node)

```bash
npm run build
npm run start          # starts on port 3000 by default
```

Serve with nginx or a reverse proxy in front. Point your `*.yourdomain.com` wildcard DNS to your server IP.

### Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

Build and run:
```bash
docker build -t xeboki-storefront .
docker run -p 3000:3000 --env-file .env.local xeboki-storefront
```

---

## Customisation

### Theme & Brand

Colours, typography, and logo are controlled from the **Xeboki Manager → Storefront & CMS → Design** tab. Changes take effect immediately — no redeploy needed.

To override locally, edit `src/lib/theme.ts`:

```ts
export const theme = {
  primary:    '#6366F1',   // brand colour
  secondary:  '#F59E0B',
  font:       'Inter',
  borderRadius: '0.75rem',
}
```

### Logo

Replace `public/icon.svg` with your logo or add a PNG and reference it in `src/components/layout/StorefrontHeader.tsx`.

### Pages & Content

Manage blog posts, custom pages (About, FAQ, Returns, Terms), SEO titles, and navigation links from **Manager → Storefront & CMS** — no code changes required.

### Feature Toggles

Controlled from **Manager → Storefront & CMS → Overview**:

| Toggle | Effect |
|--------|--------|
| Enable Online Store | Makes the store visible / invisible |
| Accept Online Orders | Turns checkout on or off |
| Show Out-of-Stock Products | Controls whether zero-inventory products appear |
| Require Login to Browse | Forces authentication before viewing catalog |

---

## Checkout & Payments

The storefront supports multiple checkout paths through Next.js API routes that proxy to the Xeboki POS API:

| Payment method | Route | Notes |
|---|---|---|
| Stripe card | `/api/checkout/payment-intent` | Creates PaymentIntent; webhook at `/api/webhook/stripe` |
| PayPal | `/api/checkout/paypal/create` + `/api/checkout/paypal/capture` | Standard PayPal Orders v2 flow |
| Cash on delivery | `/api/checkout/cod` | Order placed immediately, payment collected on delivery |
| Gift card | `/api/checkout/giftcard` | Validates balance, deducts on order confirmation |
| Discount code | `/api/checkout/discount` | Validates and applies promo code to cart |

### Stripe Webhooks

1. Install the Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Forward events locally: `stripe listen --forward-to localhost:3000/api/webhook/stripe`
3. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET` in `.env.local`

In production, add `https://yourdomain.com/api/webhook/stripe` as a webhook endpoint in your Stripe dashboard with the `payment_intent.succeeded` and `payment_intent.payment_failed` events.

---

## Subscription Gate

Your API key and subscription are validated on every server-side render. Invalid or free-plan accounts are served a blocking page — this check is enforced server-side and cannot be bypassed through the browser.

---

## Rate Limiting

All API routes have built-in sliding-window rate limiting. For multi-instance production deployments, replace the in-memory store (`src/middleware.ts`) with Upstash Redis or Vercel KV.

---

## SEO

Each store page generates:
- `<title>` and `<meta name="description">` from POS product/category data
- Open Graph tags (`og:title`, `og:image`, `og:description`)
- JSON-LD structured data (Product, BreadcrumbList, Organization)
- Auto-generated `/sitemap.xml` (dynamic, scoped per store slug)
- `/robots.txt` scoped per store

Configure the title template, default OG image, and social links from **Manager → Storefront & CMS → SEO & Navigation**.

---

## Project Structure

```
storefront/
├── .env.example                 ← Environment variable template
├── next.config.ts               ← Next.js config (subdomain rewrites)
│
├── public/
│   └── icon.svg                 ← Brand logo (replace with yours)
│
└── src/
    ├── middleware.ts             ← Subdomain routing + rate limiting
    │
    ├── app/
    │   ├── layout.tsx            ← Root layout (fonts, providers)
    │   ├── [store]/              ← Per-store dynamic segment
    │   │   ├── layout.tsx        ← Store shell (header, footer, theme inject)
    │   │   ├── page.tsx          ← Home page (hero, featured, categories)
    │   │   ├── catalog/          ← Product listing with filters
    │   │   ├── product/[slug]/   ← Product detail + modifiers
    │   │   ├── cart/             ← Cart page
    │   │   ├── checkout/         ← Checkout (address, payment, confirmation)
    │   │   ├── orders/[orderId]/ ← Order tracking
    │   │   ├── account/          ← Customer dashboard (orders, addresses, wishlist, appointments)
    │   │   ├── (auth)/           ← Login / register
    │   │   ├── blog/             ← Blog listing + post detail
    │   │   ├── book/             ← Appointment booking
    │   │   ├── repairs/          ← Repair / work order lookup
    │   │   ├── p/[slug]/         ← Custom static pages (About, FAQ, etc.)
    │   │   ├── sitemap.ts        ← Dynamic sitemap
    │   │   └── robots.ts         ← robots.txt
    │   │
    │   └── api/                  ← Next.js API routes (server-side proxies)
    │       ├── checkout/         ← Stripe, PayPal, COD, gift card, discount
    │       ├── auth/             ← Login, register, logout
    │       ├── appointments/     ← Booking CRUD
    │       ├── repairs/          ← Work order lookup
    │       └── orders/           ← Order status
    │
    ├── components/
    │   ├── layout/               ← Header, footer, hero, providers
    │   ├── product/              ← ProductCard, ProductGrid, ProductDetail, CategoryGrid
    │   ├── checkout/             ← CheckoutForm, PayPalPanel, CodPanel
    │   ├── cart/                 ← CartView
    │   ├── account/              ← AccountDashboard, OrdersList, AddressBook, Wishlist
    │   ├── booking/              ← BookingWidget
    │   ├── repairs/              ← RepairLookup
    │   └── blog/                 ← BlogBody
    │
    ├── stores/                   ← Zustand client state
    │   ├── cartStore.ts          ← Cart items, totals
    │   ├── authStore.ts          ← Customer session
    │   ├── wishlistStore.ts      ← Wishlist (localStorage persisted)
    │   └── storeConfigStore.ts   ← Live store config from POS
    │
    └── lib/
        ├── sdk/
        │   ├── client.ts         ← Xeboki SDK client (API key auth)
        │   └── store.ts          ← Store config fetcher
        ├── auth/session.ts       ← Server-side customer session (httpOnly cookie)
        ├── theme.ts              ← Default theme values
        ├── seo/structured-data.ts← JSON-LD generators
        └── utils/store-slug.ts   ← Subdomain extraction helper
```

---

## Analytics

Connect Google Analytics 4, Meta Pixel, Google Tag Manager, and Google Search Console from **Manager → Storefront & CMS → Analytics**. Tracking IDs are injected server-side — no code changes needed.

---

## Support

- **Subscription & billing:** [xeboki.com/xe-pos](https://xeboki.com/xe-pos)
- **Technical issues:** [Open an issue](https://github.com/xeboki/storefront/issues)
- **POS Manager:** [pos.xeboki.com](https://pos.xeboki.com)
- **Developer docs:** [docs.xeboki.com](https://docs.xeboki.com)
