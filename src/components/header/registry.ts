/**
 * The menu styles this storefront can draw, by the name the API serves.
 *
 * One entry per name in `_HEADER_MENUS`. A name the API offers and this file
 * does not have is a merchant choosing something and watching nothing change,
 * which is what `test_header_styles_are_implemented.py` fails on.
 *
 * Each is a dynamic import so a shop ships the one it uses. Four menus is
 * four panels' worth of markup and CSS, and a shop running the plain rail has
 * no reason to download a mega panel it will never open.
 */
import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import type { MenuPlacement, MenuStyleProps } from './types';

interface Style {
  placement: MenuPlacement;
  /**
   * Whether the menu grows to take whatever room the bar has.
   *
   * Only `inline` does, and it is the whole reason this flag exists: a search
   * box set to "fills the bar" is also elastic, so the two share the row and
   * each starves the other — the departments come out as two names and a
   * "More", and the search box comes out too narrow to read a word in. Two
   * things cannot both have the rest of the space.
   *
   * A trigger is not elastic. `mega` and `drawer` are one word wide whatever
   * the catalogue holds, so a filling search box beside them is fine.
   */
  elastic: boolean;
  Component: ComponentType<MenuStyleProps>;
}

export const MENU_STYLES: Record<string, Style> = {
  rail:   { placement: 'below', elastic: false, Component: dynamic(() => import('./styles/RailMenu')) },
  inline: { placement: 'bar',   elastic: true,  Component: dynamic(() => import('./styles/InlineMenu')) },
  mega:   { placement: 'bar',   elastic: false, Component: dynamic(() => import('./styles/MegaMenu')) },
  drawer: { placement: 'bar',   elastic: false, Component: dynamic(() => import('./styles/DrawerMenu')) },
};

/** What the API falls back to, and so must this. */
export const DEFAULT_MENU = 'rail';

export function menuStyle(name: string | null | undefined): Style {
  return MENU_STYLES[name ?? ''] ?? MENU_STYLES[DEFAULT_MENU];
}
