import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, User, Tag } from 'lucide-react';
import { loadStore, loadBlogPost, loadBlogPosts, loadCatalog } from '@/lib/sdk/store';
import { ProductCard } from '@/components/product/ProductCard';
import { generateBlogPosting, generateBreadcrumbs } from '@/lib/seo/structured-data';
import { BlogBody } from '@/components/blog/BlogBody';
import type { Metadata } from 'next';

interface Props {
  params: { store: string; slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = await loadStore(params.store);
  if (!resolved) return {};
  const post = await loadBlogPost(resolved.apiKey, params.slug);
  if (!post || post.visibility !== 'live') return {};

  const title = post.seoTitle ?? post.title;
  const description = post.seoDescription ?? post.excerpt ?? `Read ${post.title}`;
  const ogImages = post.featuredImageUrl
    ? [{ url: post.featuredImageUrl, alt: post.title }]
    : resolved.storefrontConfig?.seoOgImageUrl
    ? [{ url: resolved.storefrontConfig.seoOgImageUrl }]
    : [];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ogImages,
      type: 'article',
      publishedTime: post.publishedAt ?? post.createdAt,
      modifiedTime: post.updatedAt,
      authors: post.authorName ? [post.authorName] : [],
      tags: post.tags,
    },
    twitter: { card: 'summary_large_image', images: ogImages.map((i) => i.url) },
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });
}

export default async function BlogPostPage({ params }: Props) {
  const resolved = await loadStore(params.store);
  if (!resolved) notFound();

  const post = await loadBlogPost(resolved.apiKey, params.slug);
  // `status === 'published'` is no longer the whole answer: a post written
  // for next Tuesday is published in the document and must not be readable
  // until Tuesday. The API already refuses it; this is the second gate, and
  // it keeps the page honest if the API is ever called a different way.
  if (!post || post.visibility !== 'live') notFound();

  // What to read next, and what this post is about.
  //
  // Both are best-effort: a post renders whether or not its suggestions and
  // its product cards can be loaded. A blog that 500s because a linked
  // product was deleted would be a worse page than one without the strip.
  const [nearby, products] = await Promise.all([
    loadBlogPosts(resolved.apiKey, 'published', { perPage: 24 })
      .then((r) => r.data
        .filter((other) => other.id !== post.id)
        .map((other) => ({
          ...other,
          near: (other.categoryId && other.categoryId === post.categoryId ? 3 : 0)
            + other.tags.filter((t) => post.tags.includes(t)).length,
        }))
        .sort((a, b) => b.near - a.near)
        .slice(0, 3))
      .catch(() => []),
    post.relatedProductIds.length
      ? loadCatalog(resolved.apiKey, { perPage: 50 })
          .then((r) => r.data.filter((x) => post.relatedProductIds.includes(x.id)))
          .catch(() => [])
      : Promise.resolve([]),
  ]);

  const { storeConfig, storefrontConfig } = resolved;
  const blogJsonLd = generateBlogPosting(params.store, post, storefrontConfig, storeConfig);
  const breadcrumbJsonLd = generateBreadcrumbs(params.store, storefrontConfig, [
    { name: 'Blog', path: '/blog' },
    { name: post.title, path: `/blog/${post.slug}` },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Back link */}
        <Link
          href={`/${params.store}/blog`}
          className="inline-flex items-center gap-1.5 text-sm text-fg-subtle hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft size={16} /> Back to Blog
        </Link>

        {/* Featured image */}
        {post.featuredImageUrl && (
          <div className="relative aspect-video rounded-brand overflow-hidden mb-8 bg-surface-alt">
            <Image
              src={post.featuredImageUrl}
              // The merchant's own description of the picture, falling back
              // to the title. Shopify models alt on an article image; we
              // stored a bare URL, so every post picture was unlabelled to a
              // screen reader and invisible to a search engine.
              alt={post.featuredImageAlt || post.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
        )}

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag) => (
              <Link
                key={tag}
                href={`/${params.store}/blog?tag=${encodeURIComponent(tag)}`}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
              >
                <Tag size={10} />
                {tag}
              </Link>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="text-4xl font-bold text-fg leading-tight mb-4">{post.title}</h1>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-fg-subtle mb-8 pb-8 border-b border-line">
          <span className="flex items-center gap-1.5">
            <Calendar size={14} />
            {formatDate(post.publishedAt ?? post.createdAt)}
          </span>
          {post.authorName && (
            <span className="flex items-center gap-1.5">
              <User size={14} />
              {post.authorName}
            </span>
          )}
          {/* Zero means there is no body to time — "do not show it", which
              is different from "a minute". */}
          {post.readingMinutes > 0 && (
            <span className="flex items-center gap-1.5">
              <Clock size={14} />
              {post.readingMinutes} min read
            </span>
          )}
        </div>

        {/* Body (rendered markdown) */}
        <BlogBody body={post.body} />

        {/* What this post is about, for sale.
            The thing that makes a shop's blog earn its keep: write about a
            fragrance, show the bottle with a way to buy it. */}
        {products.length > 0 && (
          <section className="mt-12 pt-8 border-t border-line">
            <h2 className="text-lg font-semibold text-fg mb-4">
              {products.length === 1 ? 'Featured in this post' : 'Featured in this post'}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} storeSlug={params.store} />
              ))}
            </div>
          </section>
        )}

        {/* What to read next. Public posts only — a "you might also like"
            leading to a 404 is worse than no suggestion. */}
        {nearby.length > 0 && (
          <section className="mt-12 pt-8 border-t border-line">
            <h2 className="text-lg font-semibold text-fg mb-4">Read next</h2>
            <ul className="space-y-3">
              {nearby.map((other) => (
                <li key={other.id}>
                  <Link
                    href={`/${params.store}/blog/${other.slug}`}
                    className="group flex items-baseline justify-between gap-4"
                  >
                    <span className="font-medium text-fg group-hover:text-primary transition-colors">
                      {other.title}
                    </span>
                    {other.readingMinutes > 0 && (
                      <span className="shrink-0 text-xs text-fg-subtle">
                        {other.readingMinutes} min
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Footer nav */}
        <div className="mt-12 pt-8 border-t border-line">
          <Link
            href={`/${params.store}/blog`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:opacity-80 transition-opacity"
          >
            <ArrowLeft size={16} /> All Posts
          </Link>
        </div>
      </div>
    </>
  );
}
