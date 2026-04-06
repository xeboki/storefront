/**
 * Custom page renderer — /[store]/p/[slug]
 * Covers About Us, FAQ, Returns Policy, Terms, Privacy, etc.
 */
import { notFound } from 'next/navigation';
import { loadStore, loadCustomPage } from '@/lib/sdk/store';
import { BlogBody } from '@/components/blog/BlogBody';
import { generateBreadcrumbs } from '@/lib/seo/structured-data';
import type { Metadata } from 'next';

interface Props {
  params: { store: string; slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = await loadStore(params.store);
  if (!resolved) return {};
  const page = await loadCustomPage(resolved.apiKey, params.slug);
  if (!page || !page.isPublished) return {};

  return {
    title: page.seoTitle ?? page.title,
    description: page.seoDescription ?? undefined,
    openGraph: {
      title: page.seoTitle ?? page.title,
      description: page.seoDescription ?? undefined,
    },
  };
}

export default async function CustomPagePage({ params }: Props) {
  const resolved = await loadStore(params.store);
  if (!resolved) notFound();

  const page = await loadCustomPage(resolved.apiKey, params.slug);
  if (!page || !page.isPublished) notFound();

  const breadcrumbJsonLd = generateBreadcrumbs(params.store, resolved.storefrontConfig, [
    { name: page.title, path: `/p/${page.slug}` },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-8 pb-6 border-b border-slate-100">
          {page.title}
        </h1>
        <BlogBody body={page.body} />
      </div>
    </>
  );
}
