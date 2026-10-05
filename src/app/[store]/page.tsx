import { notFound } from 'next/navigation';
import { loadSectionContext } from '@/lib/section-context';
import { HomeSections } from '@/components/home/HomeSections';
import type { HomeSection } from '@xeboki/sdk';

interface Props {
  params: { store: string };
}

/**
 * The shop's front page.
 *
 * It used to be nine bands in a fixed order written into this file, so every
 * Xeboki shop on the internet had the same page in the same sequence whether
 * it sold engine parts, haircuts or espresso. Now it is a list the merchant
 * arranged, and this file's whole job is to gather what every band might need
 * and hand it over.
 *
 * The API resolves the fallback, so `homeSections` is never empty: a shop
 * that has arranged nothing is served the page its trade has always had. One
 * default, defined once, in `services/storefront_sections.py`.
 */
export default async function StorePage({ params }: Props) {
  const loaded = await loadSectionContext(params.store);
  if (!loaded) notFound();

  // One control for whether a band shows: the band's own `visible`.
  //
  // The old `sections` on/off map is NOT consulted here. It is carried into
  // the band's `visible` the first time a shop opens the editor, so a band
  // switched off years ago stays off — and after that there is one answer
  // rather than two that can disagree. Honouring both would have meant a
  // band a merchant had just switched ON staying hidden by a map they can no
  // longer see.
  return (
    <HomeSections
      sections={loaded.homeSections as HomeSection[]}
      ctx={loaded.ctx}
    />
  );
}
