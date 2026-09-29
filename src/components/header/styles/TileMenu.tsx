'use client';

/**
 * The menu as pictures, in a row under the bar.
 *
 * How grocery, marketplaces and anything with visually distinct departments
 * does it. A shopper recognises the picture before they read the word, and on
 * a catalogue of unrelated things — a card shop, a hardware shop — the
 * picture is carrying meaning no label of two words can.
 *
 * Top level only, for the same reason as the rail: this is a strip a finger
 * drags sideways, and a panel hanging off something that is itself moving is
 * not a thing anybody can aim at. A shop wanting submenus wants the mega.
 *
 * An entry with no picture keeps its place and gets a plain frame. The mega
 * panel drops a pictureless tile on the grounds that an empty tile is worse
 * than a gap; that is right THERE, where the tiles are one curated group
 * inside a panel that also lists everything in words. Here they are the
 * navigation, and a dropped entry is a part of the shop with no way in.
 *
 * The row folds on the way down the page and returns on the way up, by the
 * same 1fr -> 0fr grid track as the rail — a height cannot be animated to
 * `auto`, and a fixed max-height either clips a tall label or leaves dead
 * space under a short one.
 */
import Link from 'next/link';
import { clsx } from 'clsx';
import { ScrollRail } from '../../layout/ScrollRail';
import { NodeLink } from '../NodeLink';
import type { MenuStyleProps } from '../types';
import styles from './tiles.module.css';

export default function TileMenu({
  nodes, allHref, allLabel, collapsed, linkCase, onDark, align, showAll,
}: MenuStyleProps) {
  if (nodes.length === 0) return null;

  const tile = clsx(styles.tile, onDark && styles.onDark);

  return (
    <nav
      aria-label={allLabel}
      className={clsx(
        styles.rail,
        collapsed && styles.folded,
        'hidden sm:grid',
        onDark ? 'border-t border-white/15' : 'border-t border-line',
      )}
    >
      <div className="overflow-hidden">
        <ScrollRail
          fade={onDark ? 'from-transparent' : 'from-surface'}
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
          trackClassName={clsx(
            styles.track,
            align === 'centre' && '[justify-content:safe_center]',
            linkCase === 'upper' && 'uppercase tracking-wide',
          )}
        >
          {showAll && (
            /* Label first, picture second — the order NodeLink emits, so the
               stylesheet can find the label as the first child either way. */
            <Link href={allHref} className={tile}>
              <span>{allLabel}</span>
              <span className={clsx(styles.picture, styles.blank)} aria-hidden />
            </Link>
          )}
          {nodes.map((node) => (
            <NodeLink key={node.id} node={node} className={tile}>
              {node.imageUrl ? (
                /* The merchant's own file, unoptimised for the same reason the
                   mega panel's is: it is their picture at their dimensions,
                   and a menu that waited on a resize would pop in under a bar
                   that had already drawn. */
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={node.imageUrl} alt="" className={styles.picture} />
              ) : (
                <span className={clsx(styles.picture, styles.blank)} aria-hidden />
              )}
            </NodeLink>
          ))}
        </ScrollRail>
      </div>
    </nav>
  );
}
