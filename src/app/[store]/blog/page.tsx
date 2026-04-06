import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Tag } from 'lucide-react';
import { loadStore, loadBlogPosts } from '@/lib/sdk/store';
import type { Metadata } from 'next';

interface Props {
  params: { store: string };
  searchParams: { tag?: string };
}

export async function generateMetadata({ params }: { params: { store: string } }): Promise<Metadata> {
  const resolved = await loadStore(params.store);
  if (!resolved) return {};
  const name = resolved.storeConfig.businessName;
  return {
    title: 'Blog',
    description: `News, updates, and stories from ${name}`,
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });
}

export default async function BlogListPage({ params, searchParams }: Props) {
  const resolved = await loadStore(params.store);
  if (!resolved) notFound();

  const result = await loadBlogPosts(resolved.apiKey, 'published');
  const posts = searchParams.tag
    ? result.data.filter((p) => p.tags.includes(searchParams.tag!))
    : result.data;

  // Collect all tags from published posts
  const allTags = Array.from(new Set(result.data.flatMap((p) => p.tags))).sort();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-slate-900">Blog</h1>
        <p className="text-slate-500 mt-2">
          News, updates, and stories from {resolved.storeConfig.businessName}
        </p>
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <Link
            href={`/${params.store}/blog`}
            className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
              !searchParams.tag
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-surface text-slate-600 border-slate-200 hover:border-primary'
            }`}
          >
            All
          </Link>
          {allTags.map((tag) => (
            <Link
              key={tag}
              href={`/${params.store}/blog?tag=${encodeURIComponent(tag)}`}
              className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                searchParams.tag === tag
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-surface text-slate-600 border-slate-200 hover:border-primary'
              }`}
            >
              {tag}
            </Link>
          ))}
        </div>
      )}

      {/* Post grid */}
      {posts.length === 0 ? (
        <p className="text-slate-400 text-sm">No posts yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <article key={post.id} className="group flex flex-col rounded-brand border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Featured image */}
              <Link href={`/${params.store}/blog/${post.slug}`} className="block">
                <div className="relative aspect-video bg-slate-100 overflow-hidden">
                  {post.featuredImageUrl ? (
                    <Image
                      src={post.featuredImageUrl}
                      alt={post.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/30 flex items-center justify-center">
                      <span className="text-4xl font-bold text-primary/20">
                        {post.title.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </Link>

              {/* Content */}
              <div className="flex flex-col flex-1 p-5">
                {/* Tags */}
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {post.tags.slice(0, 3).map((tag) => (
                      <Link
                        key={tag}
                        href={`/${params.store}/blog?tag=${encodeURIComponent(tag)}`}
                        className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
                      >
                        {tag}
                      </Link>
                    ))}
                  </div>
                )}

                <Link href={`/${params.store}/blog/${post.slug}`}>
                  <h2 className="font-bold text-slate-900 text-lg leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h2>
                </Link>

                {post.excerpt && (
                  <p className="text-slate-500 text-sm line-clamp-2 flex-1">{post.excerpt}</p>
                )}

                <div className="mt-4 flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {formatDate(post.publishedAt ?? post.createdAt)}
                  </span>
                  {post.authorName && (
                    <span className="truncate">{post.authorName}</span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
