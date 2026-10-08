/**
 * The shop's blog as RSS.
 *
 * Every blog platform serves one and ours did not, so there was no way to
 * follow a shop's writing without visiting it. Readers, aggregators and a
 * merchant's own newsletter tooling all expect it at a predictable address.
 *
 * Public posts only, through the same loader the index uses — so a post
 * scheduled for next Tuesday does not leak out of the feed, which is
 * precisely how a scheduled post usually escapes.
 */
import { loadStore, loadBlogPosts } from '@/lib/sdk/store';
import { storeName } from '@/lib/store-name';

/** Text inside an XML element. Five characters, and all five matter. */
function xml(text: string): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET(
  request: Request,
  { params }: { params: { store: string } },
) {
  const resolved = await loadStore(params.store);
  if (!resolved) {
    return new Response('Not found', { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const base = `${origin}/${params.store}`;
  const name = storeName(resolved.storeConfig);

  // 50 is what a reader wants on a first fetch; more is an archive, not a
  // feed.
  const result = await loadBlogPosts(resolved.apiKey, 'published', {
    perPage: 50,
  }).catch(() => ({ data: [] as Awaited<ReturnType<typeof loadBlogPosts>>['data'] }));

  const items = result.data.map((post) => {
    const when = post.publishedAt ?? post.createdAt;
    return [
      '    <item>',
      `      <title>${xml(post.title)}</title>`,
      `      <link>${xml(`${base}/blog/${post.slug}`)}</link>`,
      // The link doubles as the id. It is stable and it is unique, which is
      // all a guid has to be.
      `      <guid isPermaLink="true">${xml(`${base}/blog/${post.slug}`)}</guid>`,
      when ? `      <pubDate>${new Date(when).toUTCString()}</pubDate>` : '',
      post.authorName ? `      <dc:creator>${xml(post.authorName)}</dc:creator>` : '',
      post.excerpt ? `      <description>${xml(post.excerpt)}</description>` : '',
      ...post.tags.map((tag) => `      <category>${xml(tag)}</category>`),
      '    </item>',
    ].filter(Boolean).join('\n');
  });

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" ' +
      'xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${xml(name)}</title>`,
    `    <link>${xml(`${base}/blog`)}</link>`,
    `    <description>${xml(`News, updates and stories from ${name}`)}</description>`,
    `    <atom:link href="${xml(`${base}/blog/feed.xml`)}" rel="self" type="application/rss+xml" />`,
    '    <language>en</language>',
    ...items,
    '  </channel>',
    '</rss>',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      // The same ten minutes the blog loader holds. A feed is read by
      // machines on a timer; it does not need to be fresher than the page.
      'Cache-Control': 'public, max-age=600, s-maxage=600',
    },
  });
}
