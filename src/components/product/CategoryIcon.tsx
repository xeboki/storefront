import {
  Baby, BatteryCharging, Bike, Book, Car, Coffee, Cookie, Dumbbell, Gamepad2,
  Gem, Gift, Hammer, Headphones, Heart, Home, Laptop, Leaf, type LucideIcon,
  Monitor, PawPrint, Pill, Scissors, Shirt, ShoppingBasket, Smartphone,
  Sparkles, Store, Tag, Utensils, Watch, Wine, Wrench,
} from 'lucide-react';

/**
 * Categories carry a *Material* icon id (`phone_iphone`, `local_grocery_store`)
 * because that is what the till and the back office draw them with. The
 * storefront used to render that string straight into the tile, so a category
 * with an icon showed the literal text "phone_iphone" to shoppers.
 *
 * So: translate the ids we know to their Lucide twin, pass an emoji through
 * untouched, and fall back to a generic tag rather than print an identifier.
 */
const MATERIAL_TO_LUCIDE: Record<string, LucideIcon> = {
  phone_iphone: Smartphone, smartphone: Smartphone, phone_android: Smartphone,
  tablet_mac: Smartphone, headphones: Headphones, headset: Headphones,
  laptop: Laptop, computer: Monitor, tv: Monitor, desktop_windows: Monitor,
  watch: Watch, videogame_asset: Gamepad2, sports_esports: Gamepad2,
  checkroom: Shirt, dry_cleaning: Shirt, diamond: Gem, local_offer: Tag,
  card_giftcard: Gift, redeem: Gift, favorite: Heart, auto_awesome: Sparkles,
  content_cut: Scissors, build: Wrench, handyman: Hammer, construction: Hammer,
  local_grocery_store: ShoppingBasket, shopping_basket: ShoppingBasket,
  shopping_cart: ShoppingBasket, storefront: Store, store: Store,
  restaurant: Utensils, restaurant_menu: Utensils, fastfood: Cookie,
  local_cafe: Coffee, coffee: Coffee, cake: Cookie, bakery_dining: Cookie,
  wine_bar: Wine, liquor: Wine, local_bar: Wine, nightlife: Wine,
  battery_full: BatteryCharging, battery_charging_full: BatteryCharging,
  battery_std: BatteryCharging, power: BatteryCharging,
  local_pharmacy: Pill, medication: Pill, spa: Leaf, eco: Leaf, yard: Leaf,
  fitness_center: Dumbbell, sports: Dumbbell, directions_bike: Bike,
  directions_car: Car, car_repair: Car, pets: PawPrint,
  child_friendly: Baby, toys: Baby, menu_book: Book, book: Book,
  home: Home, chair: Home, weekend: Home,
};

/** A Material id is lowercase words joined by underscores — never an emoji. */
const MATERIAL_ID = /^[a-z0-9_]+$/;

interface Props {
  icon?: string | null;
  name: string;
  className?: string;
}

export function CategoryIcon({ icon, name, className = 'h-5 w-5' }: Props) {
  const raw = (icon ?? '').trim();

  if (raw && !MATERIAL_ID.test(raw)) {
    // An emoji or other glyph a merchant typed in — show it as they meant it.
    return <span className="text-lg leading-none">{raw}</span>;
  }

  const Icon = MATERIAL_TO_LUCIDE[raw];
  if (Icon) return <Icon className={className} aria-hidden />;

  // Unmapped id, or no icon at all. An initial says more than a generic tag
  // when there is a name to take it from.
  const initial = name.trim().charAt(0).toUpperCase();
  if (initial) {
    return <span className="text-base font-semibold leading-none">{initial}</span>;
  }
  return <Tag className={className} aria-hidden />;
}
