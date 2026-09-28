import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ProductImage } from '@/components/product/ProductImage';
import type { ResolvedSlide } from '@/lib/hero-slides';
import { imageMotionClass } from '@/components/banners/motion';

interface Props {
  slide: ResolvedSlide;
  /** 'full' | 'split' | 'minimal' | 'carousel' */
  layout: string;
  /** 'over' | 'below' — where the copy sits on a phone. */
  mobileText: string;
  /** 'none' | 'ambient' — what the picture does while this slide is up. */
  imageMotion: string;
  /** The first slide's image is the page's largest paint; the rest are not. */
  priority?: boolean;
}

/**
 * How dark the scrim under the copy is, and WHICH SIDE it is dark on.
 *
 * A one-directional gradient is only a scrim for copy that sits where it is
 * darkest. Left-weighted under a centred headline puts the shade beside the
 * words and leaves the words themselves over whatever the photograph happens
 * to be — which is the case the scrim exists for. So it follows the
 * alignment: a centred slide gets a symmetric wash, a right-aligned one gets
 * the mirror.
 */
const OVERLAY: Record<string, Record<string, string>> = {
  none: { left: '', centre: '', right: '' },
  light: {
    left: 'bg-gradient-to-r from-black/45 via-black/15 to-transparent',
    centre: 'bg-gradient-to-b from-black/25 via-black/35 to-black/25',
    right: 'bg-gradient-to-l from-black/45 via-black/15 to-transparent',
  },
  medium: {
    left: 'bg-gradient-to-r from-black/70 via-black/40 to-transparent',
    centre: 'bg-gradient-to-b from-black/40 via-black/55 to-black/40',
    right: 'bg-gradient-to-l from-black/70 via-black/40 to-transparent',
  },
  heavy: {
    left: 'bg-gradient-to-r from-black/85 via-black/65 to-black/25',
    centre: 'bg-black/65',
    right: 'bg-gradient-to-l from-black/85 via-black/65 to-black/25',
  },
};

const TITLE_SIZE: Record<string, string> = {
  normal: 'display-md',
  large: 'display-xl',
  xlarge: 'display-xl sm:text-6xl lg:text-7xl',
};

/**
 * Every class here is written out in full, including the `sm:` variants.
 *
 * Tailwind generates CSS by scanning the source for literal class strings, so
 * a name composed at runtime — `sm:${align}` — is never in any file it reads
 * and never gets a rule. It fails silently: the element carries a class that
 * does not exist, and the slide keeps whatever it inherited. A right-aligned
 * banner rendered left, which looks like the setting was never read.
 */
const ALIGN_MOBILE: Record<string, string> = {
  left: 'items-start text-left',
  centre: 'items-center text-center',
  right: 'items-end text-right',
};

const ALIGN_DESKTOP: Record<string, string> = {
  left: 'sm:items-start sm:text-left',
  centre: 'sm:items-center sm:text-center',
  right: 'sm:items-end sm:text-right',
};

const VERTICAL: Record<string, string> = {
  top: 'justify-start',
  middle: 'justify-center',
  bottom: 'justify-end',
};

const PADDING: Record<string, string> = {
  minimal: 'py-12 sm:py-16 lg:py-20',
  split: 'py-14 sm:py-20 md:py-24 lg:py-28',
  carousel: 'py-14 sm:py-20 md:py-24',
  full: 'py-16 sm:py-20 md:py-28 lg:py-36',
};

/** The same, without the phone's share: the `below` layout sets its own. */
const PADDING_SM: Record<string, string> = {
  minimal: 'sm:py-16 lg:py-20',
  split: 'sm:py-20 md:py-24 lg:py-28',
  carousel: 'sm:py-20 md:py-24',
  full: 'sm:py-20 md:py-28 lg:py-36',
};

/**
 * One banner.
 *
 * The copy is WHITE over a scrim rather than `primary-foreground`. Deriving it
 * from the brand colour is right for a flat button, but a banner is a gradient
 * or a photograph: for a mid-tone brand like emerald, `readableOn` correctly
 * returns dark — and dark type then vanishes into the darker end of its own
 * gradient. A scrim plus white is what makes a headline legible over anything
 * a merchant uploads, which is the only guarantee worth having here.
 */
export function HeroSlideView({
  slide, layout, mobileText, imageMotion, priority = false,
}: Props) {
  const textBelow = mobileText === 'below' && Boolean(slide.imageUrl);
  const overlay = (OVERLAY[slide.overlay] ?? OVERLAY.medium)[slide.align] ??
    (OVERLAY[slide.overlay] ?? OVERLAY.medium).left;

  const copy = (
    // `flex-1`, not a height: this grows into whatever the slide turns out to
    // be, so `justify-end` actually has somewhere to push to.
    <div
      className={`relative flex w-full flex-1 flex-col ${
        VERTICAL[slide.vertical] ?? VERTICAL.middle
      } ${ALIGN_MOBILE[slide.alignMobile] ?? ALIGN_MOBILE.left} ${
        ALIGN_DESKTOP[slide.align] ?? ALIGN_DESKTOP.left
      }`}
    >
      <div className={layout === 'split' ? 'max-w-2xl' : 'max-w-xl'}>
        {slide.eyebrow && (
          <p className="eyebrow eyebrow-rule text-white/70">{slide.eyebrow}</p>
        )}

        <h2 className={`${TITLE_SIZE[slide.titleSize] ?? TITLE_SIZE.large} mt-5 text-white drop-shadow-sm`}>
          {slide.title}
        </h2>

        {slide.subtitle && (
          <p className="mt-5 max-w-md text-lg leading-relaxed text-white/85">
            {slide.subtitle}
          </p>
        )}

        {(slide.ctaText || slide.showSecondary) && (
          <div className="mt-7 flex flex-wrap items-center gap-3 sm:mt-9">
            {slide.ctaText && (
              <Link
                href={slide.ctaHref}
                className="lift group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold uppercase tracking-wider text-slate-900 shadow-lg"
              >
                {slide.ctaText}
                <ArrowRight
                  size={16}
                  className="motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
                />
              </Link>
            )}
            {slide.showSecondary && (
              <Link
                href={slide.secondaryCtaHref}
                className="inline-flex items-center gap-2 rounded-full border border-white/35 px-7 py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:border-white/80 hover:bg-white/10"
              >
                {slide.secondaryCtaText}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    // A flex COLUMN, and every layer below it grows. The height comes from a
    // min-height further up, so `h-full` resolves against `auto` and
    // collapses — which is why a slide set to sit at the bottom sat in the
    // middle instead. Flex growth does not need a definite height.
    <div className="relative isolate flex min-h-full w-full flex-col overflow-hidden bg-primary-solid">
      {/* The picture.
          Normally it is the backdrop: absolute, with the copy over it. In the
          `below` layout it becomes a real band on a phone and goes back to
          being the backdrop from `sm` up — one element, two positions, rather
          than two copies of the image that both download. */}
      <div
        className={
          textBelow
            ? 'relative aspect-[4/3] w-full shrink-0 sm:absolute sm:inset-0 sm:aspect-auto'
            : 'absolute inset-0'
        }
      >
        {slide.imageUrl ? (
          <>
            <ProductImage
              src={slide.imageUrl}
              alt=""
              fill
              priority={priority}
              sizes="100vw"
              // What the picture does while this banner is up — its own
              // module, and its own question from how the shop reaches the
              // next banner, so the two combine freely.
              className={`object-cover ${imageMotionClass(imageMotion)}`}
              fallback={null}
            />
            {overlay && <div aria-hidden className={`absolute inset-0 ${overlay}`} />}
          </>
        ) : (
          // No image: build depth out of the brand colour instead of a flat
          // fill. The dark wash is what guarantees the copy is legible.
          <div aria-hidden className="absolute inset-0">
            <div className="absolute -left-1/4 top-[-30%] h-[130%] w-[70%] rounded-full bg-white/10 blur-3xl" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />
          </div>
        )}
      </div>

      {/* The copy. In the `below` layout it is an ordinary block under the
          picture on a phone, so the slide's height is the picture plus the
          words — a fixed height there clipped the headline and swallowed the
          buttons entirely. */}
      <div
        className={`relative mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 sm:px-6 lg:px-8 ${
          // Room under the copy for the indicator, which is anchored to
          // the bottom of the band and otherwise lands on the button.
          textBelow ? 'pb-20 pt-10 ' : ''
        }${textBelow ? PADDING_SM[layout] ?? PADDING_SM.full : PADDING[layout] ?? PADDING.full}`}
      >
        {copy}
      </div>
    </div>
  );
}
