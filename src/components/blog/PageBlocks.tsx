/**
 * The blocks a page can be built out of.
 *
 * A body is Markdown, and bold/italic/heading is enough for a paragraph
 * and nothing else. A size guide, an About page or an FAQ needs a picture,
 * a table, a question-and-answer list, a notice, a button.
 *
 * **Each block is a fenced code block with a word after the backticks** —
 * ```callout, ```faq — which every Markdown reader already understands and
 * `react-markdown` hands straight to the `code` component. Three things
 * follow, and they are the reason it is done this way:
 *
 *   * a block this file does not recognise renders as **plain text**
 *     rather than as broken markup. A shop running an older storefront
 *     shows the words, not a stack trace;
 *   * the body stays a text file — searchable, diff-able, editable by hand;
 *   * no new dependency on either side.
 *
 * Everything here is deliberately forgiving: these are typed by a merchant
 * in a textarea, so a missing colon or a stray blank line must degrade,
 * never throw. A page is not worth 500ing over a malformed FAQ.
 */
import { AlertCircle, Info, CheckCircle2 } from 'lucide-react';

/** `info` | `warning` | `success`, and anything else is info. */
const TONES = {
  info: { Icon: Info, box: 'border-info-border bg-info-bg', mark: 'text-info-solid' },
  warning: { Icon: AlertCircle, box: 'border-warning-border bg-warning-bg', mark: 'text-warning-solid' },
  success: { Icon: CheckCircle2, box: 'border-success-border bg-success-bg', mark: 'text-success-solid' },
} as const;

export function Callout({ tone, children }: { tone?: string; children: string }) {
  const { Icon, box, mark } = TONES[(tone ?? 'info') as keyof typeof TONES] ?? TONES.info;
  return (
    <aside className={`not-prose my-8 flex gap-3 rounded-brand border p-4 ${box}`}>
      <Icon size={18} className={`mt-0.5 shrink-0 ${mark}`} aria-hidden="true" />
      <div className="space-y-2 text-fg">
        {children.split('\n\n').map((para, i) => (
          <p key={i} className="leading-relaxed">{para}</p>
        ))}
      </div>
    </aside>
  );
}

/**
 * `Label | /where/it/goes`, one a line.
 *
 * A link in a sentence and a thing somebody is meant to press are
 * different, and a merchant writing "click here" in prose gets neither.
 */
export function Buttons({ children }: { children: string }) {
  const buttons = children
    .split('\n')
    .map((line) => line.split('|').map((part) => part.trim()))
    .filter(([label, href]) => label && href);
  if (buttons.length === 0) return null;
  return (
    <div className="not-prose my-8 flex flex-wrap gap-3">
      {buttons.map(([label, href]) => (
        <a
          key={`${label}-${href}`}
          href={href}
          className="inline-flex items-center rounded-brand bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
        >
          {label}
        </a>
      ))}
    </div>
  );
}

/**
 * `Q:` / `A:` pairs, as a list that opens and closes.
 *
 * `<details>` rather than React state: it works before any JavaScript
 * arrives, it is searchable by the browser's own find, and it carries its
 * keyboard behaviour for free.
 */
export function Faq({ children }: { children: string }) {
  const pairs: Array<{ q: string; a: string[] }> = [];
  for (const raw of children.split('\n')) {
    const line = raw.trim();
    if (/^q:/i.test(line)) pairs.push({ q: line.slice(2).trim(), a: [] });
    else if (/^a:/i.test(line) && pairs.length) pairs[pairs.length - 1].a.push(line.slice(2).trim());
    // A line that is neither continues the answer, so a long one can be
    // written across two lines without the whole block falling apart.
    else if (line && pairs.length) pairs[pairs.length - 1].a.push(line);
  }
  if (pairs.length === 0) return null;
  return (
    <div className="not-prose my-8 divide-y divide-line rounded-brand border border-line">
      {pairs.map(({ q, a }) => (
        <details key={q} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 font-medium text-fg marker:content-none">
            {q}
            <span aria-hidden="true" className="shrink-0 text-fg-subtle transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <div className="space-y-2 px-4 pb-4 text-fg-muted">
            {a.map((line, i) => <p key={i}>{line}</p>)}
          </div>
        </details>
      ))}
    </div>
  );
}

/**
 * Two columns on a wide screen, stacked on a phone.
 *
 * Split on a `---` line. Stacked below `sm` without being asked: two
 * 180px columns on a 390px screen is worse than one.
 */
export function Columns({ children }: { children: string }) {
  const parts = children.split(/^\s*---\s*$/m).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <div
      className={`not-prose my-8 grid gap-6 ${
        parts.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
      }`}
    >
      {parts.map((part, i) => (
        <div key={i} className="space-y-2">
          {part.split('\n').map((line, j) => {
            const heading = /^#{2,4}\s+/.exec(line);
            if (heading) {
              return (
                <h3 key={j} className="text-lg font-semibold text-fg">
                  {line.slice(heading[0].length)}
                </h3>
              );
            }
            return line.trim() ? (
              <p key={j} className="text-fg-muted">{line}</p>
            ) : null;
          })}
        </div>
      ))}
    </div>
  );
}

/**
 * A YouTube or Vimeo link, sized to the page.
 *
 * The URL is turned into an embed address here rather than trusting a
 * merchant to find one: nobody pastes an `/embed/` URL, they paste what is
 * in the address bar. Anything we cannot recognise is shown as a link
 * instead of as an empty frame.
 */
export function Video({ children }: { children: string }) {
  const url = children.trim().split('\n')[0]?.trim() ?? '';
  const youtube = /(?:youtube\.com\/.*[?&]v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/.exec(url);
  const vimeo = /vimeo\.com\/(?:video\/)?(\d+)/.exec(url);
  const src = youtube
    ? `https://www.youtube-nocookie.com/embed/${youtube[1]}`
    : vimeo
    ? `https://player.vimeo.com/video/${vimeo[1]}`
    : null;

  if (!src) {
    return url ? (
      <p className="my-6">
        <a href={url} className="text-primary underline underline-offset-4">
          {url}
        </a>
      </p>
    ) : null;
  }
  return (
    <div className="not-prose my-8 aspect-video w-full overflow-hidden rounded-brand bg-surface-alt">
      <iframe
        src={src}
        title="Video"
        allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
        allowFullScreen
        loading="lazy"
        className="h-full w-full border-0"
      />
    </div>
  );
}

/** Which block a fenced language maps to, and nothing else is a block. */
export const BLOCKS: Record<string, (body: string, arg?: string) => JSX.Element | null> = {
  callout: (body, arg) => <Callout tone={arg}>{body}</Callout>,
  button: (body) => <Buttons>{body}</Buttons>,
  faq: (body) => <Faq>{body}</Faq>,
  columns: (body) => <Columns>{body}</Columns>,
  video: (body) => <Video>{body}</Video>,
};
