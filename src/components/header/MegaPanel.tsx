'use client';

/**
 * The panel a menu entry opens, drawn the way the merchant laid it out.
 *
 * It lived inside `MegaMenu`, which meant only the mega menu could show a
 * submenu the way the back end describes one. The rail — the DEFAULT style —
 * grew its own dropdown and flattened everything into a single list, so a
 * merchant who had built four headed columns and a promo tile got one long
 * column of names. The server's whole `menu_display` vocabulary (`auto`,
 * `column`, `tiles`, `strip`) existed and exactly one component honoured it.
 *
 * So the panel is a component now, and a style's job is only to say WHERE it
 * opens. The layout comes from the tree and nowhere else.
 *
 * Each child of the open entry is a column, that child's own label is the
 * column's heading, and its children are the links under it. A child carrying
 * a picture becomes a promo tile instead — the last column in most themes.
 */
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { NodeLink } from './NodeLink';
import type { MenuNode } from '@/lib/navigation';
import styles from './styles/mega.module.css';

/*
 * There were caps here: four columns, eight links each, six tiles, two
 * promos. The reasoning was navigation research — past four columns the eye
 * has nowhere to land — and the claim was that a merchant who built more got
 * "the rest behind the way out". They did not. The rest was dropped, and the
 * way out is a link to the whole catalogue, not to the entries that vanished.
 *
 * Subscriber 34's "Shops" menu is four columns of eight links: sitting
 * exactly on both caps, one more link away from losing one with no word
 * anywhere. A shop's menu is the shop's to decide, and the thing that decides
 * it is the tree the merchant built in the back office, not a number in this
 * file.
 *
 * The layout was already able to cope, which is what made the caps pure
 * loss: `.inner` is `max-height: calc(100vh - 9rem)` with `overflow-y: auto`,
 * and `.columns` is `repeat(auto-fit, …)`, so a big panel scrolls and a wide
 * one wraps. Depth is still bounded, server-side, by `MAX_MENU_DEPTH`.
 */

interface Props {
  node: MenuNode;
  close: () => void;
  allHref: string;
  allLabel: string;
  showAll: boolean;
}

export function MegaPanel({ node, close, allHref, allLabel, showAll }: Props) {
  // Each child says how it wants to be laid out. `auto` keeps the old
  // inference — a column when it holds links, a picture when it holds a
  // picture — so a menu built before this is drawn exactly as it was.
  const shapeOf = (child: MenuNode) => {
    if (child.display !== 'auto') return child.display;
    if (child.imageUrl) return 'tile';
    return child.children.length > 0 ? 'column' : 'loose';
  };

  const columns: MenuNode[] = [];
  const tileGroups: MenuNode[] = [];
  const strips: MenuNode[] = [];
  const loose: MenuNode[] = [];
  const promos: MenuNode[] = [];

  for (const child of node.children) {
    switch (shapeOf(child)) {
      case 'column': columns.push(child); break;
      case 'tiles':  tileGroups.push(child); break;
      case 'strip':  strips.push(child); break;
      case 'tile':   promos.push(child); break;
      default:       loose.push(child);
    }
  }

  // Every column the merchant built. The grid wraps; the panel scrolls.
  const shown = columns;

  return (
    <div className={styles.panel} onMouseLeave={close} role="navigation" aria-label={node.label}>
      <div className={styles.inner}>
        <div className={styles.columns}>
          {shown.map((heading) => (
            <div key={heading.id} className={styles.column}>
              <p className={styles.heading}>{heading.label}</p>
              <ul className={styles.list}>
                {heading.children.map((leaf) => (
                  <li key={leaf.id}>
                    <NodeLink node={leaf} className={styles.entry} onNavigate={close} />
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Children with no group of their own, gathered rather than each
              taking a column and leaving a row of one-line stacks. */}
          {loose.length > 0 && (
            <div className={styles.column}>
              <ul className={styles.list}>
                {loose.map((leaf) => (
                  <li key={leaf.id}>
                    <NodeLink node={leaf} className={styles.entry} onNavigate={close} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* A group drawn as its pictures. An entry with no picture is left
            out: a tile with nothing in it is worse than a gap. */}
        {tileGroups.map((group) => (
          <div key={group.id} className={styles.tiles}>
            {group.label && <p className={styles.heading}>{group.label}</p>}
            <div className={styles.tileGrid}>
              {group.children.filter((c) => c.imageUrl).map((tile) => (
                <NodeLink key={tile.id} node={tile} className={styles.tile} onNavigate={close}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={tile.imageUrl} alt="" className={styles.tileImage} />
                </NodeLink>
              ))}
            </div>
          </div>
        ))}

        {promos.map((promo) => (
          <NodeLink key={promo.id} node={promo} className={styles.promo} onNavigate={close}>
            {/* The merchant's own picture. Unoptimised on purpose: it is
                their file at their dimensions, and a menu tile that waited
                on a resize would pop in after the panel it sits in. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={promo.imageUrl} alt="" className={styles.promoImage} />
          </NodeLink>
        ))}
      </div>

      {/* Along the foot, under the columns: the things that belong to the
          whole menu rather than to one part of it. */}
      {strips.map((strip) => (
        <div key={strip.id} className={styles.strip}>
          {strip.children.map((leaf) => (
            <NodeLink key={leaf.id} node={leaf} className={styles.stripItem} onNavigate={close} />
          ))}
        </div>
      ))}

      {showAll && (
        <Link href={allHref} onClick={close} className={styles.escape}>
          {allLabel}
          <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}
