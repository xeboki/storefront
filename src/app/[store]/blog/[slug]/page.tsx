import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Calendar, User, Tag } from 'lucide-react';
import { loadStore, loadBlogPost } from '@/lib/sdk/store';
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
  if (!post || post.status !== 'published') return {};

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
  if (!post || post.status !== 'published') notFound();

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
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft size={16} /> Back to Blog
        </Link>

        {/* Featured image */}
        {post.featuredImageUrl && (
          <div className="relative aspect-video rounded-brand overflow-hidden mb-8 bg-slate-100">
            <Image
              src={post.featuredImageUrl}
              alt={post.title}
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
        <h1 className="text-4xl font-bold text-slate-900 leading-tight mb-4">{post.title}</h1>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 mb-8 pb-8 border-b border-slate-100">
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
        </div>

        {/* Body (rendered markdown) */}
        <BlogBody body={post.body} />

        {/* Footer nav */}
        <div className="mt-12 pt-8 border-t border-slate-100">
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
