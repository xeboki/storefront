'use client';

/**
 * The departments in the bar itself, with no second row.
 *
 * The shallow header a small catalogue wants: every department is one click
 * away and the page starts higher up the screen. What makes it work is that
 * it never tries to show more than fits — the ones past the edge fold into
 * "More" rather than pushing the search box off the bar.
 *
 * That count is measured, not guessed. A fixed number is wrong at almost
 * every width: seven departments fit beside a short shop name at 1440px and
 * three fit beside a long one at 1024px, and a guess that is too high does
 * not merely look tight — a flex row whose items refuse to shrink overflows
 * its box and paints over whatever is beside it, which is what the search
 * field and the store picker looked like before this.
 *
 * So the items are laid out twice: once hidden, at their natural width, to
 * find out how wide each one is, and once for real with as many as fit. The
 * hidden row costs one layout pass per resize and is the only honest way to
 * ask the question, because the visible row's widths are already the answer
 * to a different one.
 */
import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { useDismiss } from '../chrome';
import type { MenuStyleProps } from '../types';
import styles from './inline.module.css';

/**
 * The fewest departments the bar will carry.
 *
 * Zero, deliberately. A floor sounds kinder and is not: it forces names into
 * a row too narrow for them, so they come out cut off mid-word, which reads
 * as broken rather than as full. A shop whose name and search box leave room
 * for nothing gets "All products" and a menu button — which is honest, and is
 * the thing that tells the merchant this arrangement is wrong for their shop.
 */
const FLOOR = 0;

export default function InlineMenu({
  entries, allHref, allLabel, links, menuLabel, linkCase, onDark, align, showAll,
}: MenuStyleProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const dismissRef = useDismiss(open, close);

  const navRef = useRef<HTMLElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  /**
   * How many departments are in the bar.
   *
   * Starts at the floor and grows once measured, never the other way round.
   * Starting with all of them would draw one frame of a row too wide for its
   * box, and a flex row that cannot shrink does not clip — it paints over the
   * search field beside it.
   */
  const [visible, setVisible] = useState(FLOOR);

  const fit = useCallback(() => {
    const nav = navRef.current;
    const row = measureRef.current;
    if (!nav || !row) return;

    const available = nav.clientWidth;
    if (available === 0) return;

    const children = Array.from(row.children) as HTMLElement[];
    // [0] is "everything", then one per department, then the trigger.
    const escape = children[0];
    const trigger = children.at(-1);
    const departments = children.slice(1, -1);
    if (!escape || !trigger) return;

    const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    const width = (el: HTMLElement) => el.offsetWidth + gap;

    // Everything at once, if everything fits. Worth asking first: it is the
    // only case with no trigger to pay for, and it is the common one for the
    // small catalogue this arrangement is meant for.
    const base = showAll ? width(escape) : 0;
    const whole = departments.reduce((sum, el) => sum + width(el), base);
    if (whole <= available) {
      setVisible(departments.length);
      return;
    }

    // Otherwise the trigger is certain, so its width comes off the top rather
    // than being re-checked per item — a per-item check can pass for the last
    // one and then leave nowhere to put the trigger it implies.
    const room = available - base - width(trigger);
    let used = 0;
    let count = 0;
    for (const el of departments) {
      if (used + width(el) > room) break;
      used += width(el);
      count += 1;
    }
    setVisible(Math.max(FLOOR, count));
  }, [showAll]);

  // Before paint, so the bar is never shown with the wrong number for a frame.
  useLayoutEffect(fit, [fit, entries, links]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(fit);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [fit]);

  if (entries.length === 0 && links.length === 0) return null;

  const shown = entries.slice(0, visible);
  const overflow = [
    ...entries.slice(visible).map((e) => ({ key: e.id, label: e.label, href: e.href, external: false })),
    ...links.map((l) => ({ key: l.url, label: l.label, href: l.url, external: l.external })),
  ];

  const item = (
    label: string,
    href: string,
    external: boolean,
    key: string,
    onClick?: () => void,
  ) =>
    external ? (
      <a key={key} href={href} onClick={onClick} className={styles.item}>
        {label}
      </a>
    ) : (
      <Link key={key} href={href} onClick={onClick} className={styles.item}>
        {label}
      </Link>
    );

  return (
    <nav
      ref={navRef}
      aria-label={allLabel}
      data-dark={onDark || undefined}
      className={clsx(styles.nav, linkCase === 'upper' && styles.upper,
        align === 'centre' && 'justify-center', 'hidden lg:flex')}
    >
      {/* Every item at its natural width, laid out and never shown. The real
          row below can only say how wide things are once they have been
          squeezed, which is the question this one exists to avoid. */}
      <div ref={measureRef} aria-hidden className={styles.measure}>
        <span className={styles.item}>{allLabel}</span>
        {entries.map((entry) => (
          <span key={entry.id} className={styles.item}>{entry.label}</span>
        ))}
        <span className={clsx(styles.item, styles.trigger)}>
          {menuLabel}
          <ChevronDown size={14} />
        </span>
      </div>

      {/* The departments clip; the trigger does not. They are siblings rather
          than nested so that a row narrow enough to cut a department in half
          can never also cut off the control that reaches the rest of them —
          and so the panel, which hangs out of the bar, is not clipped either. */}
      <div className={styles.row}>
        {showAll && item(allLabel, allHref, false, '__all')}
        {shown.map((entry) => item(entry.label, entry.href, false, entry.id))}
      </div>

      <div ref={dismissRef}>
        {overflow.length > 0 && (
          <div className={styles.slot}>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className={clsx(styles.item, styles.trigger)}
            >
              {menuLabel}
              <ChevronDown size={14} className={clsx(styles.chevron, open && styles.chevronOpen)} />
            </button>
            {open && (
              <div className={styles.panel}>
                {overflow.map((o) =>
                  o.external ? (
                    <a key={o.key} href={o.href} className={styles.panelItem} onClick={close}>
                      {o.label}
                    </a>
                  ) : (
                    <Link key={o.key} href={o.href} className={styles.panelItem} onClick={close}>
                      {o.label}
                    </Link>
                  ),
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
