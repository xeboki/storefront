/**
 * What a shop's business type turns on — in one place, spelled every way.
 *
 * The API serves `business_type` as the id Manager stores, which is
 * snake_case: `mobile_repair`, `pet_store`, `coffee_shop`, `liquor`. Four
 * copies of these sets around the storefront were written in camelCase
 * instead, so every gate on a multi-word type was permanently shut:
 *
 *   * a mobile repair shop's Book page and Classes page both 404'd;
 *   * its Book and Track links never appeared in the header;
 *   * the appointments panel never appeared in a customer's account;
 *   * the alcohol age gate matched `liquorStore`, an id that does not exist —
 *     no liquor store has ever seen it.
 *
 * Nothing failed, because a gate that stays shut looks exactly like a shop
 * that does not offer the feature. Single-word types — salon, gym, optical,
 * laundry — worked, which is what kept it hidden.
 *
 * So the comparison is on a normalised form rather than on one chosen
 * spelling, and everything reads these predicates instead of keeping its own
 * copy of the list.
 *
 * These sets are the storefront's half of a pair: the API's catalogue holds
 * the same six in `services/storefront_sections.py`, because it has to know
 * which bands a trade can fill without asking the browser. The two are held
 * identical by `test_trade_sets_agree.py` — they had already drifted twice
 * over, on classes and on `foodtruck`.
 */

/** `mobile_repair`, `mobileRepair` and `Mobile Repair` all land on the same key. */
function key(businessType: string | null | undefined): string {
  return (businessType ?? '').toLowerCase().replace(/[^a-z]/g, '');
}

const APPOINTMENTS = new Set(['salon', 'gym', 'service', 'petstore', 'optical', 'mobilerepair']);
const WORK_ORDERS = new Set(['mobilerepair', 'laundry', 'service', 'optical']);
/**
 * Who has to say something about age.
 *
 * `liquor` is the id Manager stores. A bar is here too: a pub shipping bottles
 * is selling alcohol to someone it cannot see, which is the whole reason the
 * notice exists. `liquorStore`, which this set used to hold on its own, is not
 * an id Manager has ever written — see the guard in the API's tests.
 */
const AGE_GATE = new Set(['liquor', 'bar']);
const TABLES = new Set(['restaurant', 'bar']);
const FOOD = new Set(['restaurant', 'bar', 'coffeeshop', 'qsr', 'bakery']);
/**
 * Who runs a timetable of classes.
 *
 * A gym, and only a gym — which is what the API's catalogue says, and what
 * decides whether the `timetable` band is even offered. This used to be an
 * alias of `hasAppointments` on the grounds that a class is booked the way
 * an appointment is, which is true of the MECHANISM and not of the
 * question being asked. The effect was that a salon, an optician, a pet
 * shop, a laundry and a mobile repair shop each had a live `/classes` page,
 * titled for the shop and listing nothing, with no way to take it down.
 */
const CLASSES = new Set(['gym']);

export function hasAppointments(businessType: string | null | undefined): boolean {
  return APPOINTMENTS.has(key(businessType));
}

export function hasWorkOrders(businessType: string | null | undefined): boolean {
  return WORK_ORDERS.has(key(businessType));
}

export function needsAgeGate(businessType: string | null | undefined): boolean {
  return AGE_GATE.has(key(businessType));
}

export function hasTables(businessType: string | null | undefined): boolean {
  return TABLES.has(key(businessType));
}

export function isFoodBusiness(businessType: string | null | undefined): boolean {
  return FOOD.has(key(businessType));
}

export function hasClasses(businessType: string | null | undefined): boolean {
  return CLASSES.has(key(businessType));
}

/**
 * What this shop is, in schema.org's vocabulary.
 *
 * Every Xeboki shop used to declare itself `LocalBusiness`, the most
 * generic type there is — a restaurant, a pharmacy, an optician and a gym
 * all looked identical to a search engine, and none of them could be shown
 * as what they are. schema.org has an exact type for nearly all 22 trades,
 * and the whole point of emitting JSON-LD is to be specific.
 *
 * `LocalBusiness` stays the fallback, for `service` (a genuinely general
 * trade) and for any id this map has not been taught.
 */
const SCHEMA_TYPES: Record<string, string> = {
  restaurant: 'Restaurant',
  bar: 'BarOrPub',
  coffeeshop: 'CafeOrCoffeeShop',
  qsr: 'FastFoodRestaurant',
  bakery: 'Bakery',
  grocery: 'GroceryStore',
  conveniencestore: 'ConvenienceStore',
  liquor: 'LiquorStore',
  pharmacy: 'Pharmacy',
  optical: 'Optician',
  salon: 'BeautySalon',
  gym: 'ExerciseGym',
  laundry: 'DryCleaningOrLaundry',
  petstore: 'PetStore',
  florist: 'Florist',
  jewelry: 'JewelryStore',
  bookstore: 'BookStore',
  electronics: 'ElectronicsStore',
  mobilerepair: 'MobilePhoneStore',
  autoparts: 'AutoPartsStore',
  retail: 'Store',
  service: 'LocalBusiness',
};

export function schemaType(businessType: string | null | undefined): string {
  return SCHEMA_TYPES[key(businessType)] ?? 'LocalBusiness';
}

/**
 * What the unfiltered catalogue listing calls itself, and what it counts.
 *
 * "Shop / All Products / 12 products" was every trade's, which reads wrong
 * on a menu: a kitchen does not sell twelve products. The merchant can
 * still override the words — `sectionWords(…, 'catalog')` — so this is only
 * the starting point, and it changes only where the generic one was plainly
 * wrong rather than guessing for trades that genuinely sell things.
 *
 * Deliberately NOT keyed on appointments. A salon's catalogue is its
 * treatments, but an optician's and a repair shop's hold frames and
 * handsets, and all three take bookings — so "services" would be wrong for
 * two of the three. Those shops are better served by the override.
 */
export function catalogueWords(businessType: string | null | undefined): {
  eyebrow: string; title: string; one: string; many: string;
} {
  if (isFoodBusiness(businessType)) {
    return { eyebrow: 'The menu', title: 'Everything we serve',
             one: 'dish', many: 'dishes' };
  }
  return { eyebrow: 'Shop', title: 'All Products',
           one: 'product', many: 'products' };
}
