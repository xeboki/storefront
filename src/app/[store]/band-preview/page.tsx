import { notFound } from 'next/navigation';
import { loadSectionContext } from '@/lib/section-context';
import { HomeSections } from '@/components/home/HomeSections';
import type { HomeSection } from '@xeboki/sdk';
import { ReportHeight } from './ReportHeight';

interface Props {
  params: { store: string };
  searchParams: Record<string, string | string[] | undefined>;
}

/**
 * One band, drawn by the shop itself, for the back office to show.
 *
 * A merchant choosing between "Picture beside the products", "A grid" and
 * "A row that scrolls" was choosing between three phrases. Nothing told them
 * what any of them looked like until they saved and went to look — and this
 * session alone found four bands where what they picked and what the shop
 * drew were different things.
 *
 * Deliberately the REAL renderer rather than a drawing of one. A wireframe
 * thumbnail in the editor is a second claim about what a band looks like,
 * kept by hand, and it goes stale the first time a band changes — which is
 * the same fault as an arrangement that is offered and never drawn. This
 * route cannot drift, because it is the page.
 *
 * Read-only and takes no token: everything on it is already public on the
 * shop's own front page, and a band drawn with a merchant's own catalogue is
 * not a secret. It is `noindex` because it is a fragment, not a page.
 */
export const metadata = { robots: { index: false, follow: false } };

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function json(value: string | string[] | undefined): Record<string, unknown> {
  const raw = one(value);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    // A half-typed setting should draw the band without it rather than a
    // crash: this re-renders on every keystroke in the editor.
    return {};
  }
}

export default async function BandPreview({ params, searchParams }: Props) {
  const type = one(searchParams.type);
  if (!type) notFound();

  const loaded = await loadSectionContext(params.store);
  if (!loaded) notFound();

  const section = {
    id: 'preview',
    type,
    variant: one(searchParams.variant),
    visible: true,
    copy: json(searchParams.copy) as Record<string, string>,
    settings: json(searchParams.settings),
  } as unknown as HomeSection;

  return (
    <>
      <HomeSections sections={[section]} ctx={loaded.ctx} />
      <ReportHeight />
    </>
  );
}
