/**
 * The menu is the merchant's, in full.
 *
 * The panel used to cap itself: four columns, eight links each, six tiles,
 * two promos. Everything past those was dropped — not deferred, not folded
 * behind anything, gone — and subscriber 34's own menu sat exactly on both
 * caps, one link away from silently losing one.
 *
 * The layout copes without a cap: the panel scrolls and the column grid
 * wraps. So what a shopper sees is what the back office holds, and this fails
 * if a `slice` creeps back in to decide otherwise.
 */
import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MegaPanel } from './MegaPanel';
import type { MenuNode } from '@/lib/navigation';

const leaf = (id: string): MenuNode => ({
  id, label: `Link ${id}`, href: `/${id}`, external: false,
  badge: '', imageUrl: '', display: 'auto', children: [],
});

const column = (id: string, links: number): MenuNode => ({
  ...leaf(id),
  label: `Column ${id}`,
  href: null,
  children: Array.from({ length: links }, (_, i) => leaf(`${id}-${i}`)),
});

const render = (node: MenuNode) =>
  renderToStaticMarkup(
    createElement(MegaPanel, {
      node, close: () => {}, allHref: '/all', allLabel: 'All', showAll: false,
    }),
  );

describe('a panel with more than the old caps allowed', () => {
  // Six columns of twelve: past the old four-and-eight either way.
  const node: MenuNode = {
    ...leaf('shops'),
    label: 'Shops',
    children: Array.from({ length: 6 }, (_, i) => column(`c${i}`, 12)),
  };
  const html = render(node);

  it('draws every column', () => {
    for (let i = 0; i < 6; i++) expect(html).toContain(`Column c${i}`);
  });

  it('draws every link in every column', () => {
    for (let c = 0; c < 6; c++) {
      for (let l = 0; l < 12; l++) expect(html).toContain(`Link c${c}-${l}`);
    }
  });
});

describe('the panel decides nothing about size for the merchant', () => {
  it('has no slice left in it', () => {
    // A cap is a decision about somebody else's menu, taken in a file they
    // cannot see. The grid wraps and the panel scrolls; there is no need.
    const src = readFileSync(join(process.cwd(),
      'src/components/header/MegaPanel.tsx'), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(code).not.toMatch(/\.slice\(/);
  });
});
