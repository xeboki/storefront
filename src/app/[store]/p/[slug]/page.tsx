/**
 * Custom page renderer — /[store]/p/[slug]
 * Covers About Us, FAQ, Returns Policy, Terms, Privacy, etc.
 */
import { notFound, permanentRedirect } from 'next/navigation';
import Link from 'next/link';
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

  // **An old address redirects to the current one.** A merchant who renames
  // a page otherwise 404s every link anybody ever shared — and nothing
  // tells them, because the new page works perfectly. 308, not a rewrite:
  // the old address should stop being the one search engines index, and a
  // shopper who bookmarked it should end up with the address that will
  // still be right next year.
  if (page.redirectTo && page.redirectTo !== params.slug) {
    permanentRedirect(`/${params.store}/p/${page.redirectTo}`);
  }

  const breadcrumbJsonLd = generateBreadcrumbs(params.store, resolved.storefrontConfig, [
    { name: page.title, path: `/p/${page.slug}` },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Where this is. The page emitted BreadcrumbList structured data
            for a trail no reader could see — the same gap the blog post
            had before its own walk. */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-subtle">
            <li>
              <Link href={`/${params.store}`} className="hover:text-primary transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-fg-subtle/50">/</li>
            <li aria-current="page" className="text-fg-muted">{page.title}</li>
          </ol>
        </nav>
        <h1 className="text-3xl sm:text-4xl font-bold text-fg mb-8 pb-6 border-b border-line text-balance">
          {page.title}
        </h1>
        <BlogBody body={page.body} />
        {/* When it last changed. A returns policy or a set of terms is a
            document somebody may need to know the date of, and every other
            shop prints one. */}
        {page.updatedAt && (
          <p className="mt-12 border-t border-line pt-6 text-sm text-fg-subtle">
            Last updated{' '}
            <time dateTime={page.updatedAt}>
              {new Date(page.updatedAt).toLocaleDateString([], {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </time>
          </p>
        )}
      </div>
    </>
  );
}
