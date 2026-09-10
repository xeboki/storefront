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
  },
} as const;

export type Locale = keyof typeof MESSAGES;
export type MessageKey = keyof (typeof MESSAGES)['en'];
export const LOCALES = Object.keys(MESSAGES) as Locale[];
export const DEFAULT_LOCALE: Locale = 'en';
