'use client';

/**
 * The shop, on a phone.
 *
 * Its own setting rather than a narrow version of the desktop menu, because
 * the constraint is different: a phone has one hand holding it and a thumb
 * that reaches the bottom third of the screen comfortably and the top of it
 * barely. Which is why `sheet` — up from the bottom — is the default, and why
 * the menu styles above make no attempt to shrink themselves into this space.
 *
 * Three presentations, one list. The list is the part that matters and the
 * part a shop is judged on; the presentation is where the shop's character
 * goes.
 */
import Link from 'next/link';
import { useEffect } from 'react';
import { clsx } from 'clsx';
import { X, User, MapPin } from 'lucide-react';
import { ColorSchemeToggle } from '../layout/ColorSchemeToggle';
import { StorePicker } from '../layout/StorePicker';
import { LanguageSwitcher } from '../layout/LanguageSwitcher';
import { NodeLink } from './NodeLink';
import type { MenuNode } from '@/lib/navigation';
import type { FulfillmentLocation } from '@xeboki/sdk';
import styles from './mobile.module.css';

export const MOBILE_MENUS = ['sheet', 'drawer', 'fullscreen'] as const;
export type MobileMenu = (typeof MOBILE_MENUS)[number];

export function asMobileMenu(value: string | null | undefined): MobileMenu {
  return (MOBILE_MENUS as readonly string[]).includes(value ?? '')
    ? (value as MobileMenu)
    : 'sheet';
}

interface Props {
  presentation: MobileMenu;
  open: boolean;
  onClose: () => void;
  nodes: MenuNode[];
  allHref: string;
  allLabel: string;
  menuLabel: string;
  accountHref: string;
  accountLabel: string;
  storesLabel: string;
  stores: FulfillmentLocation[];
  activeLocationId: string | null;
  storeSlug: string;
  locales: string[];
  locale: string;
}

/** Where the panel comes from, and what shape it is when it arrives. */
const SHELL: Record<MobileMenu, { wrap: string; panel: string }> = {
  sheet:      { wrap: styles.wrapBottom, panel: styles.sheet },
  drawer:     { wrap: styles.wrapRight,  panel: styles.drawer },
  fullscreen: { wrap: styles.wrapFill,   panel: styles.fullscreen },
};

export function MobileNav({
  presentation, open, onClose, nodes, allHref, allLabel, menuLabel,
  accountHref, accountLabel, storesLabel, stores, activeLocationId, storeSlug,
  locales, locale,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const shell = SHELL[presentation];

  /**
   * The tree as an indented list.
   *
   * Not a drill-down with a back button, which the research prefers for deep
   * catalogues — this menu is at most three levels and a phone has the height
   * for all of it. A drill-down here would cost a tap to see what is already
   * on the screen.
   */
  const branch = (node: MenuNode, depth: number): React.ReactNode => (
    <div key={node.id} style={{ paddingLeft: depth * 14 }}>
      <NodeLink
        node={node}
        onNavigate={onClose}
        className={depth === 0 && node.children.length > 0 ? styles.group : styles.entry}
      />
      {node.children.map((child) => branch(child, depth + 1))}
    </div>
  );

  return (
    <div className={clsx('lg:hidden', styles.overlay, shell.wrap)}>
      <button type="button" aria-label="Close menu" className={styles.scrim} onClick={onClose} />

      <div className={shell.panel} role="dialog" aria-modal="true" aria-label={menuLabel}>
        <div className={styles.head}>
          <span className={styles.headLabel}>{menuLabel}</span>
          <button type="button" onClick={onClose} aria-label="Close" className={styles.close}>
            <X size={18} />
          </button>
        </div>

        <nav className={styles.list}>
          <Link href={allHref} onClick={onClose} className={styles.all}>
            {allLabel}
          </Link>
          {nodes.map((node) => branch(node, 0))}

          <Link href={accountHref} onClick={onClose} className={styles.entry}>
            <span className={styles.withIcon}>
              <User size={16} className={styles.icon} />
              {accountLabel}
            </span>
          </Link>

          {stores.length > 0 && (
            <div className={styles.row}>
              <span className={styles.rowLabel}>
                <MapPin size={15} /> {storesLabel}
              </span>
              <StorePicker stores={stores} activeId={activeLocationId} storeSlug={storeSlug} />
            </div>
          )}

          <div className={styles.row}>
            <span className={styles.rowLabel}>Language</span>
            <LanguageSwitcher locales={locales} active={locale} />
          </div>

          <div className={styles.row}>
            <span className={styles.rowLabel}>Appearance</span>
            <ColorSchemeToggle compact />
          </div>
        </nav>
      </div>
    </div>
  );
}
