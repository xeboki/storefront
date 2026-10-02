/**
 * UI message dictionaries. Add a locale by adding a key here; every string the
 * UI shows through t() lives in `en` (the source of truth) — untranslated keys
 * fall back to English, so a partial translation is safe to ship.
 */
export const MESSAGES = {
  en: {
    'nav.shop': 'Shop',
    'nav.allProducts': 'All Products',
    'nav.blog': 'Blog',
    'nav.account': 'Account',
    'nav.signIn': 'Sign in',
    'nav.myOrders': 'My Orders',
    'nav.addresses': 'Addresses',
    'product.addToCart': 'Add to Cart',
    'product.soldOut': 'Sold Out',
    'product.from': 'From',
    'cart.title': 'Your Cart',
    'cart.checkout': 'Proceed to Checkout',
    'cart.empty': 'Your cart is empty.',
    'cart.subtotal': 'Subtotal',
    'checkout.title': 'Checkout',
    'checkout.placeOrder': 'Place Order',
    'checkout.continue': 'Continue to Payment',
    'common.shopNow': 'Shop Now',
    'common.total': 'Total',
    'search.placeholder': 'Search products…',
    // The word over the field when search has a row to itself. Short on
    // purpose: the field already says what it is, and repeating the
    // placeholder above it says it twice.
    'search.label': 'Search',
    'search.noMatches': 'Nothing matched “{term}”.',
    'search.inCategory': 'Category',
    'search.seeAll': 'See all {count} results',
    'search.soldOut': 'Sold out',
    'nav.stores': 'Stores',
    'nav.wishlist': 'Saved',
    'nav.home': 'Home',
    'nav.menu': 'Menu',
    'nav.cart': 'Cart',
  },
  es: {
    'nav.shop': 'Tienda',
    'nav.allProducts': 'Todos los productos',
    'nav.blog': 'Blog',
    'nav.account': 'Cuenta',
    'nav.signIn': 'Iniciar sesión',
    'nav.myOrders': 'Mis pedidos',
    'nav.addresses': 'Direcciones',
    'product.addToCart': 'Añadir al carrito',
    'product.soldOut': 'Agotado',
    'product.from': 'Desde',
    'cart.title': 'Tu carrito',
    'cart.checkout': 'Ir a pagar',
    'cart.empty': 'Tu carrito está vacío.',
    'cart.subtotal': 'Subtotal',
    'checkout.title': 'Pago',
    'checkout.placeOrder': 'Realizar pedido',
    'checkout.continue': 'Continuar al pago',
    'common.shopNow': 'Comprar ahora',
    'common.total': 'Total',
    'search.placeholder': 'Buscar productos…',
    'search.label': 'Buscar',
    'search.noMatches': 'Nada coincide con «{term}».',
    'search.inCategory': 'Categoría',
    'search.seeAll': 'Ver los {count} resultados',
    'search.soldOut': 'Agotado',
    'nav.stores': 'Tiendas',
    'nav.wishlist': 'Guardados',
    'nav.home': 'Inicio',
    'nav.menu': 'Menú',
    'nav.cart': 'Carrito',
  },
} as const;

export type Locale = keyof typeof MESSAGES;
export type MessageKey = keyof (typeof MESSAGES)['en'];
export const LOCALES = Object.keys(MESSAGES) as Locale[];
export const DEFAULT_LOCALE: Locale = 'en';

/**
 * Which languages are written right to left.
 *
 * Only `en` and `es` ship today and both are left to right, so nothing in
 * the shop had a `dir` at all — `<html>` carried `lang` and nothing else.
 * That is not a missing translation, it is a missing *mechanism*: adding an
 * Arabic dictionary to a document with no direction would have produced
 * Arabic text in a left-to-right layout, with the basket on the wrong side
 * and every chevron pointing the wrong way.
 *
 * Listed by language rather than detected, because direction is a property
 * of the script and there is no way to work it out from a two-letter code.
 */
const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'yi']);

export function direction(locale: string | null | undefined): 'ltr' | 'rtl' {
  const base = (locale || '').toLowerCase().split('-')[0];
  return RTL_LOCALES.has(base) ? 'rtl' : 'ltr';
}
