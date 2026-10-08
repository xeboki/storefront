'use client';

/**
 * The column beside a long article.
 *
 * The post page is as wide as a product page now, and the reading column is
 * deliberately not — which left roughly 280px of empty page either side at
 * 1440px. This is what that width is for: the two things a reader reaches
 * for while reading, kept in view rather than left at the bottom.
 *
 * It appears only from `xl`, where there is genuinely room beside a
 * 72-character column. Below that it would squeeze the thing it is meant to
 * accompany — `ArticleContents` carries the same list into the article
 * instead, so a reader on a laptop is not the only one without it.
 *
 * **The URL comes in as a prop.** It was built from `window.location.href`
 * during render, which is `''` on the server; React does not repair an
 * attribute that differs at hydration, so both share links shipped carrying
 * the title and no address. Proven in the served HTML and in the live DOM.
 * Same fault the order page's share row had, in a component written after
 * it was fixed — hence `@/lib/request-origin`, which answers it once.
 */
import { useEffect, useState } from 'react';
import { Link2, Check, MessageCircle, Send, Mail } from 'lucide-react';

export interface Heading {
  id: string;
  text: string;
}

/** Which section the reader is in, watched rather than measured.
 *
 * A heading's offset changes as the images above it load, and a scroll
 * listener that re-measures costs that on every frame. */
function useSectionInView(headings: Heading[]): string {
  const [here, setHere] = useState('');
  useEffect(() => {
    if (headings.length === 0) return;
    const seen = new Map<string, boolean>();
    const watcher = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => seen.set(e.target.id, e.isIntersecting));
        const first = headings.find((h) => seen.get(h.id));
        if (first) setHere(first.id);
      },
      // The band is the top third: a heading counts as "here" once it has
      // reached reading height, not when it first peeks in at the bottom.
      { rootMargin: '-80px 0px -66% 0px' },
    );
    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) watcher.observe(el);
    });
    return () => watcher.disconnect();
  }, [headings]);
  return here;
}

function Eyebrow({ children, id }: { children: string; id?: string }) {
  return (
    <h2
      id={id}
      className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle"
    >
      {children}
    </h2>
  );
}

function ShareRow({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url || window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard refused — blocked, or an insecure origin. Saying nothing
      // is right for a convenience nobody asked for twice.
    }
  };

  // Plain intent URLs. No network SDK on a shop's own page, for the same
  // reason the order page carries none: a share button should not be a
  // third party watching every reader who does not press it.
  const text = encodeURIComponent(title);
  const link = encodeURIComponent(url);
  const elsewhere = [
    { name: 'WhatsApp', Icon: MessageCircle, href: `https://wa.me/?text=${text}%20${link}` },
    { name: 'X', Icon: Send, href: `https://twitter.com/intent/tweet?text=${text}&url=${link}` },
    { name: 'Email', Icon: Mail, href: `mailto:?subject=${text}&body=${link}` },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Nothing to share until the address is known. Rendering a link to
          `?text=title%20` is worse than rendering no link: it looks like it
          worked. */}
      {url &&
        elsewhere.map(({ name, Icon, href }) => (
          <a
            key={name}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Share on ${name}`}
            title={`Share on ${name}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-brand border border-line text-fg-muted transition-colors hover:border-primary hover:text-primary"
          >
            <Icon size={15} />
          </a>
        ))}
      <button
        type="button"
        onClick={copy}
        className="inline-flex h-9 items-center gap-1.5 rounded-brand border border-line px-3 text-sm text-fg-muted transition-colors hover:border-primary hover:text-primary"
      >
        {copied ? <Check size={14} /> : <Link2 size={14} />}
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  );
}

function ContentsList({ headings, here }: { headings: Heading[]; here: string }) {
  return (
    <ul className="space-y-2 border-s border-line">
      {headings.map((h) => (
        <li key={h.id}>
          <a
            href={`#${h.id}`}
            className={`-ms-px block border-s-2 ps-4 text-sm leading-snug transition-colors ${
              here === h.id
                ? 'border-primary font-medium text-fg'
                : 'border-transparent text-fg-muted hover:text-fg'
            }`}
          >
            {h.text}
          </a>
        </li>
      ))}
    </ul>
  );
}

interface Props {
  headings: Heading[];
  title: string;
  url: string;
}

export function ArticleRail({ headings, title, url }: Props) {
  const here = useSectionInView(headings);

  return (
    <aside className="hidden xl:block">
      <div className="sticky top-28 space-y-8">
        {headings.length > 1 && (
          <nav aria-labelledby="on-this-page">
            <Eyebrow id="on-this-page">On this page</Eyebrow>
            <ContentsList headings={headings} here={here} />
          </nav>
        )}

        <div>
          <Eyebrow>Share</Eyebrow>
          <ShareRow title={title} url={url} />
        </div>
      </div>
    </aside>
  );
}

/**
 * The same contents list, for every width the rail does not cover.
 *
 * Folded shut by default: a reader who opened the article wants the article,
 * and five headings between the title and the first sentence push the
 * writing below the fold on a phone. `<details>` because it works before any
 * JavaScript arrives and carries its own keyboard behaviour.
 */
export function ArticleContents({ headings }: { headings: Heading[] }) {
  const here = useSectionInView(headings);
  if (headings.length < 2) return null;
  return (
    <details className="group mb-10 rounded-brand border border-line px-4 py-3 xl:hidden">
      <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-wider text-fg-subtle marker:content-none">
        <span className="inline-flex w-full items-center justify-between">
          On this page
          <span className="text-fg-muted transition-transform group-open:rotate-180">⌄</span>
        </span>
      </summary>
      <div className="pt-3">
        <ContentsList headings={headings} here={here} />
      </div>
    </details>
  );
}

/** Share, for the foot of the article where there is no rail. */
export function ArticleShare({ title, url }: { title: string; url: string }) {
  return (
    <div className="mt-10 border-t border-line pt-6 xl:hidden">
      <Eyebrow>Share this post</Eyebrow>
      <ShareRow title={title} url={url} />
    </div>
  );
}
