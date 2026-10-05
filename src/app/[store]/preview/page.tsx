import { notFound } from 'next/navigation';
import Link from 'next/link';
import { loadSectionContext } from '@/lib/section-context';
import { HomeSections } from '@/components/home/HomeSections';
import type { HomeSection } from '@xeboki/sdk';

interface Props {
  params: { store: string };
  searchParams: Record<string, string | string[] | undefined>;
}

/**
 * The home page as the merchant is still arranging it.
 *
 * Every save used to go straight live, so a half-finished band was on the
 * internet the moment it was saved. This is the same page, drawn from the
 * draft, so a merchant can look at their work before anyone else does.
 *
 * Not indexed and not cached. The token names one shop, carries a purpose of
 * its own and expires within the hour, so a link pasted into a chat window
 * stops working on its own.
 */
export const metadata = { robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function PreviewPage({ params, searchParams }: Props) {
  const raw = searchParams.token;
  const token = Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '');
  if (!token) notFound();

  const loaded = await loadSectionContext(params.store, token);
  // A token for another shop, an expired one, or a forged one all land here:
  // the API simply does not hand back a draft, and a preview with nothing to
  // preview is not a page.
  if (!loaded) notFound();

  const config = loaded.ctx.storefrontConfig;

  return (
    <>
      {/* Said plainly, and at the top. A preview that cannot tell you it is
          a preview is how somebody ships a half-finished page believing they
          already had — or spends an afternoon wondering why their change is
          not on the shop. */}
      <div className="border-b border-line bg-surface-alt px-4 py-3 text-center text-sm sm:px-6">
        <span className="font-semibold text-fg">
          {config?.homeSectionsIsPreview
            ? 'Preview — these changes are not published yet.'
            : 'Preview — nothing is unpublished, so this is your live page.'}
        </span>{' '}
        <Link
          href={`/${params.store}`}
          className="font-medium text-primary underline underline-offset-2"
        >
          See the live shop
        </Link>
      </div>
      <HomeSections
        sections={loaded.homeSections as HomeSection[]}
        ctx={loaded.ctx}
      />
    </>
  );
}
