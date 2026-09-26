import { Asterisk } from 'lucide-react';

/**
 * The announcement, as a moving band.
 *
 * A merchant's announcement used to be a static strip that everyone's eye
 * learned to skip in a second. Motion is the only thing that reliably buys a
 * second look for one line of text — and it stops on hover, because a message
 * you cannot read is worse than one nobody notices.
 *
 * The line is repeated because the band has to be wider than the viewport for
 * the loop to have no seam, not because saying it four times is better.
 */
export function Marquee({ text }: { text?: string | null }) {
  const message = (text ?? '').trim();
  if (!message) return null;

  const run = Array.from({ length: 4 }, (_, i) => (
    <span key={i} className="flex items-center gap-6 pr-6">
      <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">{message}</span>
      <Asterisk size={13} className="flex-shrink-0 opacity-60" aria-hidden />
    </span>
  ));

  return (
    <div className="marquee relative overflow-hidden border-b border-line bg-primary-solid text-primary-foreground">
      {/* Read once by assistive tech; the repeats are decoration. */}
      <span className="sr-only">{message}</span>
      <div className="marquee-track py-2.5" aria-hidden>
        {run}
        {run}
      </div>
    </div>
  );
}
