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
  Component: ComponentType<MenuStyleProps>;
}

export const MENU_STYLES: Record<string, Style> = {
  rail:   { placement: 'below', Component: dynamic(() => import('./styles/RailMenu')) },
  inline: { placement: 'bar',   Component: dynamic(() => import('./styles/InlineMenu')) },
  mega:   { placement: 'bar',   Component: dynamic(() => import('./styles/MegaMenu')) },
  drawer: { placement: 'bar',   Component: dynamic(() => import('./styles/DrawerMenu')) },
};

/** What the API falls back to, and so must this. */
export const DEFAULT_MENU = 'rail';

export function menuStyle(name: string | null | undefined): Style {
  return MENU_STYLES[name ?? ''] ?? MENU_STYLES[DEFAULT_MENU];
}
