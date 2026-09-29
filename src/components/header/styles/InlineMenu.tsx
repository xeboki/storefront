'use client';

/**
 * The entries in the bar itself, with no second row.
 *
 * The shallow header a small menu wants: everything is one click away and the
 * page starts higher up the screen. What makes it work is that it never tries
 * to show more than fits — the entries past the edge fold into "More" rather
 * than pushing the search box off the bar.
 *
 * That count is measured, not guessed. A fixed number is wrong at almost
 * every width, and a guess that is too high does not merely look tight: a
 * flex row whose items refuse to shrink overflows its box and paints over
 * whatever is beside it, which is what the search field looked like.
 *
 * So the entries are laid out twice — once hidden, at natural width, to find
 * out how wide each is, and once for real with as many as fit. The hidden row
 * costs one layout pass per resize and is the only honest way to ask, because
 * the visible row's widths are already the answer to a different question.
 *
 * An entry with a submenu opens a short panel under itself. A panel the width
 * of the bar belongs to the mega menu; this one is a list.
 */
import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { useCloseOnScroll, useDismiss } from '../chrome';
import { AnchoredPanel } from '../AnchoredPanel';
import { NodeLink } from '../NodeLink';
import type { MenuNode } from '@/lib/navigation';
import type { MenuStyleProps } from '../types';
import styles from './inline.module.css';

/**
 * The fewest entries the bar will carry.
 *
 * Zero, deliberately. A floor sounds kinder and is not: it forces names into
 * a row too narrow for them, so they come out cut off mid-word, which reads
 * as broken rather than as full. A shop whose name and search box leave room
 * for nothing gets the way out and a menu button — which is honest, and is
 * the thing that tells the merchant this arrangement is wrong for their shop.
 */
const FLOOR = 0;

export default function InlineMenu({
  nodes, allHref, allLabel, menuLabel, linkCase, onDark, align, showAll,
}: MenuStyleProps) {
  const [open, setOpen] = useState<string | null>(null);
  /**
   * The control the open panel hangs from.
   *
   * Kept rather than positioning against the trigger in place: the row of
   * departments clips, so a panel inside it is drawn nowhere — see
   * AnchoredPanel.
   */
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = useCallback(() => {
    setOpen(null);
    setAnchor(null);
  }, []);
  const dismissRef = useDismiss(open !== null, close);
  // The departments row folds away as the page moves; a panel hanging off a
  // trigger in it would be left pointing at nothing.
  useCloseOnScroll(open !== null, close);

  const show = useCallback((id: string, el: HTMLElement) => {
    setOpen(id);
    setAnchor(el);
  }, []);

  const navRef = useRef<HTMLElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(FLOOR);

  const fit = useCallback(() => {
    const nav = navRef.current;
    const row = measureRef.current;
    if (!nav || !row) return;

    const available = nav.clientWidth;
    if (available === 0) return;

    const children = Array.from(row.children) as HTMLElement[];
    // [0] is the way out, then one per entry, then the overflow trigger.
    const escape = children[0];
    const trigger = children.at(-1);
    const items = children.slice(1, -1);
    if (!escape || !trigger) return;

    const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    const width = (el: HTMLElement) => el.offsetWidth + gap;
    const base = showAll ? width(escape) : 0;

    // Everything at once, if everything fits. Worth asking first: it is the
    // only case with no trigger to pay for, and it is the common one.
    const whole = items.reduce((sum, el) => sum + width(el), base);
    if (whole <= available) {
      setVisible(items.length);
      return;
    }

    // Otherwise the trigger is certain, so its width comes off the top rather
    // than being re-checked per item — a per-item check can pass for the last
    // one and then leave nowhere to put the trigger it implies.
    const room = available - base - width(trigger);
    let used = 0;
    let count = 0;
    for (const el of items) {
      if (used + width(el) > room) break;
      used += width(el);
      count += 1;
    }
    setVisible(Math.max(FLOOR, count));
  }, [showAll]);

  // Before paint, so the bar is never shown with the wrong number for a frame.
  useLayoutEffect(fit, [fit, nodes]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(fit);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [fit]);

  if (nodes.length === 0) return null;

  const shown = nodes.slice(0, visible);
  const overflow = nodes.slice(visible);

  /** An entry in the bar: a link, or a trigger when it has a submenu. */
  const inBar = (node: MenuNode) =>
    node.children.length === 0 ? (
      <NodeLink key={node.id} node={node} className={styles.item} />
    ) : (
      <div key={node.id} className={styles.slot}>
        <button
          type="button"
          aria-expanded={open === node.id}
          onClick={(e) => show(node.id, e.currentTarget)}
          onMouseEnter={(e) => show(node.id, e.currentTarget)}
          onFocus={(e) => show(node.id, e.currentTarget)}
          className={clsx(styles.item, styles.trigger)}
        >
          {node.label}
          <ChevronDown
            size={14}
            className={clsx(styles.chevron, open === node.id && styles.chevronOpen)}
          />
        </button>
        {open === node.id && (
          <AnchoredPanel anchor={anchor}>
            <div className={styles.panel} onMouseLeave={close}>
              {node.children.flatMap((child) =>
                // Two levels flattened into one list: a submenu inside a
                // dropdown is a panel, and a panel is the mega menu's job.
                child.children.length > 0
                  ? [
                      <p key={child.id} className={styles.panelHeading}>{child.label}</p>,
                      ...child.children.map((leaf) => (
                        <NodeLink key={leaf.id} node={leaf} className={styles.panelItem} onNavigate={close} />
                      )),
                    ]
                  : [<NodeLink key={child.id} node={child} className={styles.panelItem} onNavigate={close} />],
              )}
            </div>
          </AnchoredPanel>
        )}
      </div>
    );

  return (
    <nav
      ref={navRef}
      aria-label={allLabel}
      data-dark={onDark || undefined}
      className={clsx(
        styles.nav,
        linkCase === 'upper' && styles.upper,
        align === 'centre' && styles.centred,
        'hidden lg:flex',
      )}
    >
      {/* Every entry at its natural width, laid out and never shown. The real
          row below can only say how wide things are once they have been
          squeezed, which is the question this one exists to avoid. */}
      <div ref={measureRef} aria-hidden className={styles.measure}>
        <span className={styles.item}>{allLabel}</span>
        {nodes.map((node) => (
          <span key={node.id} className={styles.item}>
            {node.label}
            {node.children.length > 0 && <ChevronDown size={14} />}
          </span>
        ))}
        <span className={clsx(styles.item, styles.trigger)}>
          {menuLabel}
          <ChevronDown size={14} />
        </span>
      </div>

      {/* The entries clip; the overflow trigger does not. They are siblings
          rather than nested so a row narrow enough to cut an entry in half
          can never also cut off the control that reaches the rest of them. */}
      <div className={styles.row}>
        {showAll && (
          <Link href={allHref} className={styles.item}>
            {allLabel}
          </Link>
        )}
        {shown.map(inBar)}
      </div>

      <div ref={dismissRef}>
        {overflow.length > 0 && (
          <div className={styles.slot}>
            <button
              type="button"
              aria-expanded={open === '__more'}
              onClick={(e) =>
                open === '__more' ? close() : show('__more', e.currentTarget)}
              className={clsx(styles.item, styles.trigger)}
            >
              {menuLabel}
              <ChevronDown
                size={14}
                className={clsx(styles.chevron, open === '__more' && styles.chevronOpen)}
              />
            </button>
            {open === '__more' && (
              <AnchoredPanel anchor={anchor}>
                <div className={styles.panel}>
                  {overflow.map((node) => (
                    <NodeLink key={node.id} node={node} className={styles.panelItem} onNavigate={close} />
                  ))}
                </div>
              </AnchoredPanel>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
