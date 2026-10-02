import { Asterisk } from 'lucide-react';
import type { Announcement } from '@xeboki/sdk';

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
export function Marquee({ announcement }: { announcement?: Announcement | null }) {
  const message = (announcement?.text ?? '').trim();
  // A merchant can switch the band off. It used to appear whenever there was
  // text, so the switch on the Promotions screen did nothing at all — as did
  // the colour beside it.
  if (!announcement?.enabled || !message) return null;

  const painted = announcement.background.trim();

  const run = Array.from({ length: 4 }, (_, i) => (
    <span key={i} className="flex items-center gap-6 pe-6">
      <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">{message}</span>
      <Asterisk size={13} className="flex-shrink-0 opacity-60" aria-hidden />
    </span>
  ));

  return (
    <div
      className={`marquee relative overflow-hidden border-b border-line ${
        // No colour chosen means the shop's own, which is what the band has
        // always been painted in.
        painted ? '' : 'bg-primary-solid text-primary-foreground'
      }`}
      style={
        painted
          ? {
              backgroundColor: painted,
              // Dark words are only ever right against a pale background the
              // merchant picked, so it is their call rather than a guess.
              color: announcement.darkText ? '#0F172A' : '#FFFFFF',
            }
          : undefined
      }
    >
      {/* Read once by assistive tech; the repeats are decoration. */}
      <span className="sr-only">{message}</span>
      <div className="marquee-track py-2.5" aria-hidden>
        {run}
        {run}
      </div>
    </div>
  );
}
