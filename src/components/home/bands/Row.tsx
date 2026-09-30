/**
 * A row of columns — the thing that makes a page a layout rather than a pile.
 *
 * Every band before this was full width, stacked on the one above, which is a
 * shape no modern shop front has. What they all have instead is rows: a
 * narrow coloured card beside a product carousel, a big banner beside two
 * stacked tiles, a vertical "new in" list beside a wider grid.
 *
 * Depth stops at one. A row holds columns, a column holds blocks, and a block
 * is never a row — the API refuses it. Deeper is a grid engine rather than a
 * shop front, and it is the shape nobody can edit.
 */
import { setting } from '@/lib/band-words';
import { bandFor } from '../registry';
import { Band } from './Band';
import type { SectionProps } from '../types';
import type { HomeSection } from '@xeboki/sdk';

/**
 * How each shape divides twelve.
 *
 * Twelve because it is the only small number divisible by two, three and
 * four, so halves, thirds and quarters all land on whole columns and no
 * arrangement needs a rounded width.
 *
 * Named fractions, never pixels: a merchant choosing a width is how somebody
 * breaks their own page on a laptop they do not own.
 */
const SHAPES: Record<string, number[]> = {
  'half-half': [6, 6],
  'third-twothirds': [4, 8],
  'twothirds-third': [8, 4],
  'quarter-rest': [3, 9],
  'rest-quarter': [9, 3],
  'thirds': [4, 4, 4],
  'quarter-half-quarter': [3, 6, 3],
};

/** Tailwind needs whole class names, so the spans are written out. */
const SPAN: Record<number, string> = {
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
  6: 'lg:col-span-6',
  8: 'lg:col-span-8',
  9: 'lg:col-span-9',
};

interface Column { blocks: HomeSection[] }

function columnsOf(section: HomeSection): Column[] {
  // Read directly rather than through `setting<T>`: this is a nested
  // structure, not a value with a fallback, and typing it as one would hide
  // that a column is itself a list of section instances.
  const raw = setting<unknown>(section, 'columns', []);
  if (!Array.isArray(raw)) return [];
  return raw.map((column) => {
    const blocks = (column as { blocks?: unknown })?.blocks;
    return { blocks: Array.isArray(blocks) ? (blocks as HomeSection[]) : [] };
  });
}

export function RowBand({ section, ctx }: SectionProps) {
  const columns = columnsOf(section).filter((c) => c.blocks.length > 0);
  if (columns.length === 0) return null;

  // The shape names a number of columns; the merchant may have filled fewer.
  // Rather than leave a gap, the widths are taken from the front and the last
  // filled column takes what is left — an empty third of a row reads as the
  // page having failed to load.
  const shape = SHAPES[section.variant] ?? SHAPES['half-half'];
  const widths = shape.slice(0, columns.length);
  const short = 12 - widths.reduce((a, b) => a + b, 0);
  if (short > 0) widths[widths.length - 1] += short;

  return (
    <Band>
      {/* One column on a phone, whatever the shape. Two things side by side
          in 180px is two things nobody can read, and every reference layout
          stacks on a phone for exactly that reason. */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
        {columns.map((column, i) => (
          <div key={i} className={`${SPAN[widths[i]] ?? 'lg:col-span-6'} flex flex-col gap-8`}>
            {column.blocks.map((block) => {
              if (!block.visible) return null;
              const Block = bandFor(block.type);
              if (!Block) return null;
              return <Block key={block.id} section={block} ctx={ctx} nested />;
            })}
          </div>
        ))}
      </div>
    </Band>
  );
}
