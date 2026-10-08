/**
 * A blog post's body, rendered from Markdown.
 *
 * The `prose-*` classes here were inert for the life of the blog: the plugin
 * that defines them, `@tailwindcss/typography`, was never installed and
 * `plugins: []` sat in the Tailwind config, so an `<h2>` came out *smaller*
 * than the paragraph beneath it.
 *
 * Colours come from the shop's own tokens rather than a `prose-slate`
 * preset: a shop sets its text and background, and a preset that ignores
 * them is a second palette fighting the first.
 *
 * Two things that are deliberate rather than default:
 *
 *   * **the running text is `text-fg`, not `text-fg-muted`.** Muted is for
 *     captions and metadata. An article's body is the thing the reader came
 *     for, and 60%-opacity grey on a dark page is a hard read at length.
 *   * **`prose-lg`.** 16px is a UI size. Long-form wants 18px, which also
 *     makes the 72-character measure a wider, better-proportioned column.
 */
'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ReactNode } from 'react';
import { headingId } from '@/lib/heading-id';

function textOf(children: ReactNode): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(textOf).join('');
  if (children && typeof children === 'object' && 'props' in (children as never)) {
    return textOf((children as { props: { children: ReactNode } }).props.children);
  }
  return '';
}

interface Props {
  body: string;
}

export function BlogBody({ body }: Props) {
  return (
    <div
      className={[
        'prose prose-lg max-w-none',
        'prose-headings:font-semibold prose-headings:text-fg prose-headings:scroll-mt-28',
        'prose-h2:text-[1.75rem] prose-h2:leading-snug prose-h2:mt-14 prose-h2:mb-4',
        'prose-h3:text-xl prose-h3:mt-10 prose-h3:mb-3',
        'prose-p:text-fg prose-p:leading-[1.75]',
        'prose-li:text-fg prose-li:leading-[1.75] prose-li:my-1',
        'prose-li:marker:text-primary/60',
        'prose-strong:text-fg prose-strong:font-semibold',
        'prose-a:text-primary prose-a:underline prose-a:underline-offset-4',
        'prose-a:decoration-primary/40 hover:prose-a:decoration-primary',
        'prose-img:rounded-brand prose-img:w-full',
        'prose-code:text-primary prose-code:bg-primary/10',
        'prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-normal',
        'prose-code:before:content-none prose-code:after:content-none',
        'prose-pre:bg-surface-alt prose-pre:text-fg prose-pre:border prose-pre:border-line',
        'prose-hr:border-line prose-hr:my-14',
        // A table has to hold its own on a phone, where the measure is
        // narrower than any sensible three-column table. The wrapper below
        // scrolls it; these keep the rules visible against the shop's own
        // background rather than the plugin's grey.
        'prose-thead:border-line prose-tr:border-line',
        'prose-th:text-fg prose-td:text-fg prose-td:align-top',
        // The opening paragraph, given the weight an opening deserves.
        //
        // Written first as `prose-p:first-of-type:…` and it did nothing:
        // measured at 18px, exactly like the paragraph after it. A direct
        // child selector says what is meant and outranks the plugin's
        // `:where()` rules, which carry no specificity at all.
        '[&>p:first-of-type]:text-[1.2em] [&>p:first-of-type]:leading-[1.6]',
        '[&>p:first-of-type]:text-fg',
      ].join(' ')}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Anchored, so the contents list beside the article can link to
          // them and so a reader can share a link to one section.
          h2: ({ children }) => (
            <h2 id={headingId(textOf(children))}>{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 id={headingId(textOf(children))}>{children}</h3>
          ),
          // A pull quote should read as one. The default is an indented
          // paragraph in italics, which on a dark page is quieter than the
          // text around it rather than louder.
          blockquote: ({ children }) => (
            <blockquote className="not-prose my-10 border-s-2 border-primary ps-6 text-[1.25em] font-medium leading-snug text-fg">
              {children}
            </blockquote>
          ),
          // A picture in the body, optionally captioned: the Markdown title
          // becomes the caption — `![alt](/photo.jpg "Harvest, November")`.
          // The alt text stays the alt text; a caption that doubles as the
          // screen-reader description serves neither reader well.
          //
          // Spans, not a `<figure>`: Markdown puts an image inside a
          // paragraph, and a figure inside a `<p>` closes the paragraph
          // early — the text after it ends up outside the prose rules.
          img: ({ src, alt, title }) =>
            typeof src === 'string' && src ? (
              <span className="my-8 block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={alt ?? ''}
                  className="w-full rounded-brand"
                  loading="lazy"
                />
                {title && (
                  <span className="mt-2 block text-center text-sm text-fg-subtle">
                    {title}
                  </span>
                )}
              </span>
            ) : null,
          // A table is the one block that cannot be made narrower. Let it
          // scroll inside the measure rather than widening the column or
          // spilling off a phone.
          table: ({ children }) => (
            <div className="my-8 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <table className="my-0 w-full">{children}</table>
            </div>
          ),
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
