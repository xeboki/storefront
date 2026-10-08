import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Calendar, Clock, User, Tag } from 'lucide-react';
import { loadStore, loadBlogPost, loadBlogPosts, loadBlogCategories, loadCatalog } from '@/lib/sdk/store';
import { ProductCard } from '@/components/product/ProductCard';
import { generateBlogPosting, generateBreadcrumbs } from '@/lib/seo/structured-data';
import { BlogBody } from '@/components/blog/BlogBody';
import { headingId } from '@/lib/heading-id';
import { ArticleRail, ArticleContents, ArticleShare } from '@/components/blog/ArticleRail';
import { shopUrl } from '@/lib/request-origin';
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
  const [siblings, products, categories] = await Promise.all([
    loadBlogPosts(resolved.apiKey, 'published', { perPage: 24 })
      .then((r) => r.data)
      .catch(() => []),
    // Asked for BY ID. Filtering a page of fifty to find three silently
    // showed nothing on a shop with 160 products.
    post.relatedProductIds.length
      ? loadCatalog(resolved.apiKey, {
          ids: post.relatedProductIds,
          perPage: post.relatedProductIds.length,
        })
          .then((r) => r.data)
          .catch(() => [])
      : Promise.resolve([]),
    loadBlogCategories(resolved.apiKey).catch(() => []),
  ]);

  // What to read next, scored. A shared category counts for more than a
  // shared tag — a category is a grouping the merchant made, a tag is a word
  // they typed. Same ranking the API uses for the same question.
  const nearby = siblings
    .filter((other) => other.id !== post.id)
    .map((other) => ({
      ...other,
      near: (other.categoryId && other.categoryId === post.categoryId ? 3 : 0)
        + other.tags.filter((t) => post.tags.includes(t)).length,
    }))
    .sort((a, b) => b.near - a.near)
    .slice(0, 3);

  // The posts either side of this one, in publication order — the two links
  // a reader working through a blog actually wants, and the pair that
  // "All Posts" has been standing in for.
  //
  // Drawn from the same page of twenty-four as everything else: on a blog
  // longer than that the oldest post has no "older" link, which is a quieter
  // wrong than a second request on every article.
  const inOrder = [...siblings].sort(
    (a, b) => Date.parse(b.publishedAt ?? b.createdAt) - Date.parse(a.publishedAt ?? a.createdAt));
  const place = inOrder.findIndex((other) => other.id === post.id);
  const newer = place > 0 ? inOrder[place - 1] : null;
  const older = place >= 0 && place < inOrder.length - 1 ? inOrder[place + 1] : null;

  const category = categories.find((c) => c.id === post.categoryId) ?? null;

  // The article's own headings, for the contents list beside it. Read from
  // the Markdown rather than from the DOM, so the list is in the first
  // response rather than appearing a moment after the page does.
  //
  // Fenced code is stripped first: a `# comment` inside a shell example is
  // not a section of the article.
  const headings = (post.body ?? '')
    .replace(/```[\s\S]*?```/g, '')
    .split('\n')
    .map((line) => /^##\s+(.*\S)\s*$/.exec(line))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ id: headingId(m[1]), text: m[1] }));

  // This post's own address, absolute, resolved from the request. Built
  // from `window.location.href` at first and it shipped empty: the share
  // links carried the title and no URL, in the served HTML and in the live
  // DOM after hydration. React does not repair an attribute that differed.
  const postUrl = shopUrl(params.store, `/blog/${post.slug}`);

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

      {/* The same container the product page uses.
          The post sat in `max-w-3xl` while a product page ran to
          `max-w-7xl`, so an article looked pinched beside the rest of the
          shop with a third of the screen empty either side.

          Wide container, narrow READING column: a 1280px measure is about
          160 characters a line, which is a worse read than a narrow one. So
          the picture, the product strip and what-to-read-next take the full
          width, and the prose keeps a column you can actually follow. */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* The article, and the column beside it.
            Everything a person reads line by line lives in the first, at a
            measure they can follow. The second holds what a reader reaches
            for WHILE reading — where they are, and how to send it on — and
            exists only from `xl`, where there is room for it beside a
            72-character column rather than instead of one. */}
        <div className="mx-auto grid w-full max-w-[72ch] grid-cols-1 gap-x-12 xl:max-w-none xl:grid-cols-[minmax(0,72ch)_16rem] xl:justify-center">
        {/* Inside the grid too — at the container's edge it was the one
            thing on the page that did not start where the article
            starts. */}
        <div className="xl:col-span-2">
        {/* Where this is, not just how to leave.
            The page emitted BreadcrumbList structured data for a trail no
            reader could see — a search engine was shown the shop, the blog
            and the post while the page itself offered "Back to Blog" and
            nothing about which section the article belongs to. */}
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-subtle">
            <li>
              <Link href={`/${params.store}`} className="hover:text-primary transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-fg-subtle/50">/</li>
            <li>
              <Link href={`/${params.store}/blog`} className="hover:text-primary transition-colors">
                Blog
              </Link>
            </li>
            {category && (
              <>
                <li aria-hidden="true" className="text-fg-subtle/50">/</li>
                <li>
                  <Link
                    href={`/${params.store}/blog?category=${encodeURIComponent(category.slug)}`}
                    className="hover:text-primary transition-colors"
                  >
                    {category.name}
                  </Link>
                </li>
              </>
            )}
            <li aria-hidden="true" className="text-fg-subtle/50">/</li>
            {/* The last crumb is where you are, so it is not a link. */}
            <li aria-current="page" className="max-w-[22rem] truncate text-fg-muted">
              {post.title}
            </li>
          </ol>
        </nav>
        </div>

        {/* Spans both columns, so the picture's edges are the edges of
            the text under it. Outside the grid it ran the full
            container while the article began 120px in, and nothing on
            the page lined up with anything else. */}
        <div className="xl:col-span-2">
        {/* Featured image. Taller on a phone, wider on a desktop: a 21/9
            crop is a band on a 390px screen and shows almost nothing of the
            picture. The letterbox only earns its keep when there is width
            to fill. */}
        {post.featuredImageUrl && (
          <div className="relative aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9] rounded-brand overflow-hidden mb-10 bg-surface-alt">
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
              sizes="(max-width: 1280px) 100vw, 1280px"
            />
          </div>
        )}
        </div>

        <article className="min-w-0">

        {/* Category and tags. The category is the merchant's own grouping
            and sat invisible on the post while its tags did not — so it
            leads, and it is filled rather than outlined. */}
        {(category || post.tags.length > 0) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {category && (
              <Link
                href={`/${params.store}/blog?category=${encodeURIComponent(category.slug)}`}
                className="inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-primary text-on-primary font-semibold uppercase tracking-wide hover:opacity-90 transition-opacity"
              >
                {category.name}
              </Link>
            )}
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
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-fg leading-tight mb-4 text-balance">
          {post.title}
        </h1>

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

        {/* The same contents the rail shows, for every width that has no
            rail. Folded shut — a reader opened the article, not its index. */}
        <ArticleContents headings={headings} />

        {/* Body (rendered markdown) */}
        <BlogBody body={post.body} />

        {/* And the same share row, at the foot, where there is no rail to
            hold it. */}
        <ArticleShare title={post.title} url={postUrl} />

        </article>

        <ArticleRail headings={headings} title={post.title} url={postUrl} />

        {/* Everything below the article spans both columns, so a product
            card and a "read next" tile begin exactly where the first word
            of the article does. Outside the grid they started at the
            container's edge and the page had two left margins. */}

        {/* What this post is about, for sale.
            The thing that makes a shop's blog earn its keep: write about a
            fragrance, show the bottle with a way to buy it. */}
        {products.length > 0 && (
          <section className="mt-12 pt-8 border-t border-line xl:col-span-2">
            <h2 className="text-lg font-semibold text-fg mb-4">Featured in this post</h2>
            {/* Four across on a wide screen now that the page is not
                boxed into 768px. Two on a phone, never one — a single
                full-width product card under an article reads as an advert
                rather than a suggestion. */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} storeSlug={params.store} />
              ))}
            </div>
          </section>
        )}

        {/* What to read next. Public posts only — a "you might also like"
            leading to a 404 is worse than no suggestion. */}
        {nearby.length > 0 && (
          <section className="mt-12 pt-8 border-t border-line xl:col-span-2">
            <h2 className="text-lg font-semibold text-fg mb-4">Read next</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {nearby.map((other) => (
                <li key={other.id}>
                  <Link
                    href={`/${params.store}/blog/${other.slug}`}
                    className="group flex h-full flex-col justify-between gap-2 rounded-brand border border-line p-4 transition-colors hover:border-primary"
                  >
                    <span className="font-medium text-fg group-hover:text-primary transition-colors">
                      {other.title}
                    </span>
                    {other.readingMinutes > 0 && (
                      <span className="text-xs text-fg-subtle">
                        {other.readingMinutes} min read
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* The posts either side, and the way back to the index.
            A single "All Posts" link made a reader work through a blog by
            returning to the list and finding their place in it each time. */}
        <nav
          aria-label="More posts"
          className="mt-12 pt-8 border-t border-line xl:col-span-2"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Older on the left, newer on the right: the direction a
                reader already associates with back and forward. The empty
                side keeps its column so the other does not slide across. */}
            {older ? (
              <Link
                href={`/${params.store}/blog/${older.slug}`}
                className="group flex flex-col gap-1 rounded-brand border border-line p-4 transition-colors hover:border-primary"
              >
                <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-fg-subtle">
                  <ArrowLeft size={13} /> Older
                </span>
                <span className="font-medium text-fg transition-colors group-hover:text-primary">
                  {older.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {newer ? (
              <Link
                href={`/${params.store}/blog/${newer.slug}`}
                className="group flex flex-col items-end gap-1 rounded-brand border border-line p-4 text-end transition-colors hover:border-primary"
              >
                <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-fg-subtle">
                  Newer <ArrowRight size={13} />
                </span>
                <span className="font-medium text-fg transition-colors group-hover:text-primary">
                  {newer.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
          </div>
          <Link
            href={`/${params.store}/blog`}
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:opacity-80 transition-opacity"
          >
            <ArrowLeft size={16} /> All Posts
          </Link>
        </nav>
        </div>{/* end article grid */}
      </div>
    </>
  );
}
