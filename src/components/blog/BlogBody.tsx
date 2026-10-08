/**
 * A blog post's body, rendered from Markdown.
 *
 * The `prose-*` classes here were inert for the life of the blog: the plugin
 * that defines them, `@tailwindcss/typography`, was never installed and
 * `plugins: []` sat in the Tailwind config. So a post rendered with nothing
 * but the global reset, and an `<h2>` came out *smaller* than the paragraph
 * beneath it — on every post, on every shop.
 *
 * The colours come from the shop's own tokens rather than a `prose-slate`
 * preset, because a shop sets its text and background and a preset that
 * ignores them is a second palette fighting the first. `prose-invert` would
 * only swap one fixed palette for another; naming the tokens works in both
 * themes without knowing which is on.
 */
'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  body: string;
}

export function BlogBody({ body }: Props) {
  return (
    <div
      className="
        prose max-w-none
        prose-headings:font-semibold prose-headings:text-fg
        prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-3
        prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-2
        prose-p:text-fg-muted prose-p:leading-relaxed
        prose-li:text-fg-muted prose-strong:text-fg
        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
        prose-img:rounded-brand
        prose-code:text-primary prose-code:bg-primary/5
        prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
        prose-code:before:content-none prose-code:after:content-none
        prose-blockquote:border-s-4 prose-blockquote:border-primary
        prose-blockquote:text-fg prose-blockquote:not-italic
        prose-blockquote:font-medium
        prose-hr:border-line
      "
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
    </div>
  );
}
