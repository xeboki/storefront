import type { Rgb } from './color';
import { parseHex, triplet } from './color';
import { STEP, buildScale, onSolid } from './scale';

/**
 * The four things a shop has to say that are not its brand.
 *
 * "In stock", "only two left", "sold out", "your order is on its way" — a shop
 * says these constantly, and until now every one of them was a hardcoded
 * Tailwind class. Sixty of them across the storefront, in the shape
 * `bg-emerald-50 text-emerald-700`. Two problems with that, and the second is
 * the worse one:
 *
 *   * they ignore the merchant entirely, so a shop with a red brand shows
 *     green success badges that belong to no one;
 *   * they ignore DARK MODE. `bg-emerald-50` is a near-white block, and on a
 *     near-black page it is a white rectangle with pale green text in it.
 *
 * Each role is built through the same twelve-step machinery as the brand, so
 * it gets an even ramp, a light and a dark variant, and text that is checked
 * to be readable rather than assumed.
 *
 * The defaults are hues, not hexes: a merchant who sets nothing gets the
 * conventional green/amber/red/blue, and one who sets a colour gets theirs
 * with the same guarantees.
 */
export const ROLES = ['success', 'warning', 'danger', 'info'] as const;
export type Role = (typeof ROLES)[number];

/** What a shop means by each, so nobody has to guess from the name. */
export const ROLE_MEANING: Record<Role, string> = {
  success: 'In stock, paid, delivered — anything that went right.',
  warning: 'Low stock, ending soon, needs attention but is not wrong.',
  danger: 'Sold out, failed, cancelled.',
  info: 'Neutral notices — delivery estimates, opening hours, a note.',
};

/**
 * Conventional and deliberately not the brand's hue.
 *
 * A shop whose brand is red must not have a red "success": the point of these
 * is that a shopper reads them before they read the words.
 */
const DEFAULTS: Record<Role, Rgb> = {
  success: [22, 143, 94],
  warning: [201, 138, 4],
  danger: [206, 46, 46],
  info: [37, 99, 235],
};

/** The four steps a badge, a pill or a notice actually needs. */
export interface RoleColours {
  /** The tint behind it. */
  bg: Rgb;
  /** Its hairline. */
  border: Rgb;
  /** A filled version, for a solid pill or a dot. */
  solid: Rgb;
  /** What reads ON the solid. */
  onSolid: Rgb;
  /** The words, against `bg`. */
  fg: Rgb;
}

export function roleColours(base: Rgb, dark: boolean): RoleColours {
  const scale = buildScale(base, dark);
  return {
    bg: scale[STEP.subtleBg],
    border: scale[STEP.border],
    solid: scale[STEP.solid],
    onSolid: onSolid(scale[STEP.solid]),
    fg: scale[STEP.textHigh],
  };
}

/**
 * The merchant's colour for a role, or the conventional one.
 *
 * Absent means the default, so every shop that predates this gets exactly the
 * colours the storefront already drew — with dark mode working, which it did
 * not before.
 */
export function roleBase(overrides: Record<string, string> | null | undefined,
                         role: Role): Rgb {
  return parseHex(overrides?.[role]) ?? DEFAULTS[role];
}

/** `--l-success-bg` and friends, for one mode. */
export function roleVars(prefix: 'l' | 'd',
                         overrides: Record<string, string> | null | undefined,
                         ): Record<string, string> {
  const dark = prefix === 'd';
  const out: Record<string, string> = {};
  for (const role of ROLES) {
    const c = roleColours(roleBase(overrides, role), dark);
    out[`--${prefix}-${role}-bg`] = triplet(c.bg);
    out[`--${prefix}-${role}-border`] = triplet(c.border);
    out[`--${prefix}-${role}-solid`] = triplet(c.solid);
    out[`--${prefix}-${role}-on`] = triplet(c.onSolid);
    out[`--${prefix}-${role}-fg`] = triplet(c.fg);
  }
  return out;
}
