import { notFound } from 'next/navigation';
import { storeName } from '@/lib/store-name';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Tag } from 'lucide-react';
import { loadStore, loadBlogPosts, loadBlogCategories } from '@/lib/sdk/store';
import type { Metadata } from 'next';

interface Props {
  params: { store: string };
  searchParams: { tag?: string; category?: string; page?: string };
}

export async function generateMetadata({ params }: { params: { store: string } }): Promise<Metadata> {
  const resolved = await loadStore(params.store);
  if (!resolved) return {};
  const name = storeName(resolved.storeConfig);
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

  const perPage = 12;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const categories = await loadBlogCategories(resolved.apiKey);
  const category = categories.find((c) => c.slug === searchParams.category);

  // Filtered and paged by the SERVER. Filtering a page of results in the
  // browser meant a tag used only on old posts looked unused, and anything
  // past the hundredth post was invisible.
  const result = await loadBlogPosts(resolved.apiKey, 'published', {
    tag: searchParams.tag,
    categoryId: category?.id,
    page,
    perPage,
  });
  const posts = result.data;
  const total = result.total ?? posts.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));

  // The tags of this page. A complete tag list needs its own endpoint; this
  // is honest about being the tags you can see rather than pretending to be
  // all of them.
  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags))).sort();

  const withParams = (next: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const merged = { tag: searchParams.tag, category: searchParams.category, ...next };
    Object.entries(merged).forEach(([k, v]) => { if (v) q.set(k, v); });
    const query = q.toString();
    return `/${params.store}/blog${query ? `?${query}` : ''}`;
  };

  // The same container as a post and a product page. The shop had three
  // different widths — 5xl here, 3xl on a post, 7xl on a product — so
  // moving between them shifted the whole page sideways.
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-fg">Blog</h1>
        <p className="text-fg-muted mt-2 max-w-[60ch]">
          News, updates, and stories from {storeName(resolved.storeConfig)}
        </p>
      </div>

      {/* Categories — the merchant's own groupings, as distinct from tags. */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <Link
            href={withParams({ category: undefined, page: undefined })}
            className={`text-sm px-3 py-1.5 rounded-brand font-medium border transition-colors ${
              !searchParams.category
                ? 'bg-primary-solid text-primary-foreground border-primary'
                : 'bg-surface text-fg border-line hover:border-primary'
            }`}
          >
            All posts
          </Link>
          {categories
            .filter((c) => c.postCount > 0)
            .map((c) => (
              <Link
                key={c.id}
                href={withParams({ category: c.slug, page: undefined })}
                className={`text-sm px-3 py-1.5 rounded-brand font-medium border transition-colors ${
                  searchParams.category === c.slug
                    ? 'bg-primary-solid text-primary-foreground border-primary'
                    : 'bg-surface text-fg border-line hover:border-primary'
                }`}
              >
                {c.name}
                <span className="ms-1.5 text-xs opacity-70">{c.postCount}</span>
              </Link>
            ))}
        </div>
      )}

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <Link
            href={withParams({ tag: undefined, page: undefined })}
            className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
              !searchParams.tag
                ? 'bg-primary-solid text-primary-foreground border-primary'
                : 'bg-surface text-fg-muted border-line hover:border-primary'
            }`}
          >
            All
          </Link>
          {allTags.map((tag) => (
            <Link
              key={tag}
              href={withParams({ tag, page: undefined })}
              className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                searchParams.tag === tag
                  ? 'bg-primary-solid text-primary-foreground border-primary'
                  : 'bg-surface text-fg-muted border-line hover:border-primary'
              }`}
            >
              {tag}
            </Link>
          ))}
        </div>
      )}

      {/* Post grid */}
      {posts.length === 0 ? (
        <p className="text-fg-subtle text-sm">
          {searchParams.tag || searchParams.category
            ? 'Nothing here yet under that heading.'
            : 'No posts yet.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {posts.map((post) => (
            <article key={post.id} className="group flex flex-col rounded-brand border border-line overflow-hidden hover:shadow-md transition-shadow">
              {/* Featured image */}
              <Link href={`/${params.store}/blog/${post.slug}`} className="block">
                <div className="relative aspect-video bg-surface-alt overflow-hidden">
                  {post.featuredImageUrl ? (
                    <Image
                      src={post.featuredImageUrl}
                      alt={post.featuredImageAlt || post.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      // Four columns at xl, three at lg, two at sm. A
                      // `33vw` told the browser to fetch a third-width
                      // image for a card that is a quarter of the row.
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
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
                  <h2 className="font-bold text-fg text-lg leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h2>
                </Link>

                {post.excerpt && (
                  <p className="text-fg-muted text-sm line-clamp-2 flex-1">{post.excerpt}</p>
                )}

                <div className="mt-4 flex items-center gap-3 text-xs text-fg-subtle">
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
      {/* Paging. The index asked for 100 posts and showed them all, so a
          shop past its hundredth lost everything after it. */}
      {lastPage > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-3 text-sm">
          {page > 1 ? (
            <Link
              href={withParams({ page: page === 2 ? undefined : String(page - 1) })}
              className="rounded-brand border border-line px-3 py-1.5 font-medium hover:border-primary"
            >
              Newer
            </Link>
          ) : (
            <span className="rounded-brand border border-line px-3 py-1.5 text-fg-subtle">
              Newer
            </span>
          )}
          <span className="text-fg-muted">Page {page} of {lastPage}</span>
          {page < lastPage ? (
            <Link
              href={withParams({ page: String(page + 1) })}
              className="rounded-brand border border-line px-3 py-1.5 font-medium hover:border-primary"
            >
              Older
            </Link>
          ) : (
            <span className="rounded-brand border border-line px-3 py-1.5 text-fg-subtle">
              Older
            </span>
          )}
        </nav>
      )}
    </div>
  );
}
