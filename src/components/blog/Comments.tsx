'use client';

/**
 * What readers have said under a post, and the form to say more.
 *
 * Three things it is careful about, each because the obvious version is
 * worse:
 *
 *   * **a held comment is not an error.** When the shop moderates, the new
 *     comment is shown immediately, in place, marked as waiting. Clearing
 *     the form and saying "submitted" leaves somebody staring at a thread
 *     their comment is not in, and they write it again.
 *   * **the form knows nothing.** Whether comments are open, whether a
 *     guest may post, whether moderation holds them — all of it arrives
 *     from the server with the thread. A form that decided for itself
 *     would disagree with the server the moment a merchant changed a
 *     setting, and a rule a form enforces is one a direct POST ignores.
 *   * **"closed" is explained or not mentioned.** A shop that has comments
 *     switched off shows nothing at all; a post that has aged out says so.
 *     "Comments are closed" with no reason reads as a fault.
 */
import { useState } from 'react';
import type { BlogComment, BlogCommentThread } from '@xeboki/sdk';
import { MessageCircle, CornerDownRight, Clock } from 'lucide-react';

interface Props {
  thread: BlogCommentThread;
  storeSlug: string;
  slug: string;
  /** The signed-in reader, when there is one. */
  viewer: { name: string; email: string } | null;
}

function when(iso: string | null): string {
  if (!iso) return '';
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '';
  return at.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });
}

function initial(name: string): string {
  const letter = name.trim().charAt(0).toUpperCase();
  return /[A-Z0-9]/.test(letter) ? letter : '·';
}

function Comment({ comment, onReply, replyingTo }: {
  comment: BlogComment & { pending?: boolean };
  onReply?: (id: string, name: string) => void;
  replyingTo: string | null;
}) {
  return (
    <li className={comment.depth > 0 ? 'ms-6 sm:ms-12' : ''}>
      <article
        className={`flex gap-3 rounded-brand border p-4 ${
          comment.pending
            ? 'border-dashed border-primary/50 bg-primary/5'
            : 'border-line'
        }`}
      >
        {/* A monogram, not an avatar service: a blog comment must not be a
            request to a third party carrying the reader's email hash. */}
        <span
          aria-hidden="true"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
            comment.isShopReply
              ? 'bg-primary text-on-primary'
              : 'bg-surface-alt text-fg-muted'
          }`}
        >
          {initial(comment.authorName)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium text-fg">{comment.authorName}</span>
            {comment.isShopReply && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                Shop
              </span>
            )}
            {comment.depth > 0 && (
              <CornerDownRight size={12} className="text-fg-subtle" aria-hidden="true" />
            )}
            {when(comment.createdAt) && (
              <time className="text-xs text-fg-subtle" dateTime={comment.createdAt ?? undefined}>
                {when(comment.createdAt)}
              </time>
            )}
          </div>
          {/* Plain text, deliberately. A comment box that renders Markdown
              is a comment box that renders a link, and a link is what the
              spam is for. */}
          <p className="mt-1.5 whitespace-pre-wrap break-words text-fg">{comment.body}</p>
          {comment.pending && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-fg-subtle">
              <Clock size={12} aria-hidden="true" />
              Waiting for the shop to read it — only you can see this.
            </p>
          )}
          {onReply && !comment.pending && comment.depth === 0 && (
            <button
              type="button"
              onClick={() => onReply(comment.id, comment.authorName)}
              className="mt-2 text-xs font-medium text-primary hover:opacity-80"
            >
              {replyingTo === comment.id ? 'Cancel reply' : 'Reply'}
            </button>
          )}
        </div>
      </article>
    </li>
  );
}

export function Comments({ thread, storeSlug, slug, viewer }: Props) {
  const [comments, setComments] = useState<(BlogComment & { pending?: boolean })[]>(
    thread.comments);
  const [body, setBody] = useState('');
  const [name, setName] = useState(viewer?.name ?? '');
  const [email, setEmail] = useState(viewer?.email ?? '');
  const [website, setWebsite] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);

  // The shop has comments switched off. Not "closed" — there is nothing
  // here to close, and a notice would advertise a feature it does not have.
  if (!thread.isOpen && thread.comments.length === 0 && !thread.closedReason) {
    return null;
  }

  const needsIdentity = !viewer;
  const canPost = thread.isOpen && (viewer || thread.allowGuests);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setProblem(null);
    setSaid(null);
    try {
      const res = await fetch(`/api/blog/${encodeURIComponent(slug)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeSlug, body, parentId: replyTo?.id,
          ...(needsIdentity && { authorName: name, authorEmail: email }),
          website,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setProblem(payload?.error ?? 'Could not post that comment.');
        return;
      }
      // Shown in place, whatever the shop decided. A held comment that
      // vanishes on submit is a comment somebody writes twice.
      const posted = payload.comment as BlogComment;
      setComments((was) => {
        const mine = { ...posted, pending: payload.status !== 'approved' };
        if (!replyTo) return [...was, mine];
        const at = was.findIndex((c) => c.id === replyTo.id);
        const after = was.findIndex((c, i) => i > at && c.depth === 0);
        const cut = after === -1 ? was.length : after;
        return [...was.slice(0, cut), { ...mine, depth: 1 }, ...was.slice(cut)];
      });
      setSaid(payload.message ?? null);
      setBody('');
      setReplyTo(null);
    } catch {
      setProblem('Could not reach the shop. Try again in a moment.');
    } finally {
      setSending(false);
    }
  }

  const field =
    'w-full rounded-brand border border-line bg-surface px-3 py-2 text-sm text-fg ' +
    'placeholder:text-fg-subtle focus:border-primary focus:outline-none';

  return (
    <section className="mt-12 border-t border-line pt-8 xl:col-span-2">
      <h2 className="mb-5 inline-flex items-center gap-2 text-lg font-semibold text-fg">
        <MessageCircle size={18} aria-hidden="true" />
        {comments.length === 0
          ? 'Comments'
          : `${comments.length} comment${comments.length === 1 ? '' : 's'}`}
      </h2>

      {comments.length > 0 && (
        <ul className="mb-8 space-y-3">
          {comments.map((comment) => (
            <Comment
              key={comment.id}
              comment={comment}
              replyingTo={replyTo?.id ?? null}
              onReply={canPost
                ? (id, who) => setReplyTo(replyTo?.id === id ? null : { id, name: who })
                : undefined}
            />
          ))}
        </ul>
      )}

      {!thread.isOpen && thread.closedReason && (
        <p className="text-sm text-fg-subtle">{thread.closedReason}</p>
      )}

      {thread.isOpen && !canPost && (
        <p className="text-sm text-fg-subtle">
          This shop asks readers to sign in before commenting.
        </p>
      )}

      {canPost && (
        <form onSubmit={send} className="max-w-[48rem] space-y-3">
          {replyTo && (
            <p className="text-sm text-fg-subtle">
              Replying to <span className="font-medium text-fg">{replyTo.name}</span>
              {' · '}
              <button type="button" onClick={() => setReplyTo(null)}
                      className="text-primary hover:opacity-80">
                cancel
              </button>
            </p>
          )}
          <label className="block">
            <span className="sr-only">Your comment</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={4}
              maxLength={4000}
              placeholder={replyTo ? 'Write a reply…' : 'Share what you thought…'}
              className={field}
            />
          </label>

          {needsIdentity && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="sr-only">Your name</span>
                <input value={name} onChange={(e) => setName(e.target.value)}
                       required maxLength={120} placeholder="Your name"
                       autoComplete="name" className={field} />
              </label>
              <label className="block">
                <span className="sr-only">Your email</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)}
                       required type="email" maxLength={200}
                       placeholder="Your email (not published)"
                       autoComplete="email" className={field} />
              </label>
            </div>
          )}

          {/* The honeypot. Off screen rather than `display:none`, which the
              better bots check for, and excluded from the tab order and
              from the accessibility tree so nobody meets it by accident. */}
          <div aria-hidden="true" className="absolute start-[-9999px] h-0 w-0 overflow-hidden">
            <label>
              Website
              <input value={website} onChange={(e) => setWebsite(e.target.value)}
                     tabIndex={-1} autoComplete="off" />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={sending || body.trim().length === 0}
              className="rounded-brand bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {sending ? 'Posting…' : replyTo ? 'Post reply' : 'Post comment'}
            </button>
            {/* Said before they type, not after they submit. Somebody who
                knows a comment waits is not surprised when it does. */}
            {thread.moderated && !said && (
              <span className="text-xs text-fg-subtle">
                Comments are read by the shop before they appear.
              </span>
            )}
            {said && <span className="text-xs text-primary">{said}</span>}
            {problem && <span className="text-xs text-danger-fg">{problem}</span>}
          </div>
          {needsIdentity && (
            <p className="text-xs text-fg-subtle">
              Your email is never published. The shop uses it to reply.
            </p>
          )}
        </form>
      )}
    </section>
  );
}
