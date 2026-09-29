'use client';

/**
 * One menu entry, drawn.
 *
 * Three things every style would otherwise get subtly wrong on its own:
 *
 * A heading has no address and must not be a link. It is how a mega panel's
 * columns are titled, and a heading rendered as an `<a href="">` is a row a
 * shopper can click that takes them nowhere.
 *
 * An address that leaves the shop goes through `<a>`; one that does not goes
 * through `<Link>`, or the router is dropped and the page reloads. A merchant
 * writing their own shop's address in full is the common way to hit that.
 *
 * And the badge belongs beside the label, inside the same control, so it
 * cannot wrap onto its own line.
 */
import Link from 'next/link';
import { clsx } from 'clsx';
import type { MenuNode } from '@/lib/navigation';
import styles from './node-link.module.css';

interface Props {
  node: MenuNode;
  className?: string;
  onNavigate?: () => void;
  /** A trailing count, tally or chevron the style wants inside the control. */
  children?: React.ReactNode;
}

export function NodeLink({ node, className, onNavigate, children }: Props) {
  const body = (
    <>
      <span className={styles.label}>{node.label}</span>
      {node.badge && <span className={styles.badge}>{node.badge}</span>}
      {children}
    </>
  );

  if (!node.href) {
    return <span className={clsx(className, styles.heading)}>{body}</span>;
  }
  if (node.external) {
    return (
      <a
        href={node.href}
        className={className}
        onClick={onNavigate}
        target="_blank"
        rel="noreferrer"
      >
        {body}
      </a>
    );
  }
  return (
    <Link href={node.href} className={className} onClick={onNavigate}>
      {body}
    </Link>
  );
}
