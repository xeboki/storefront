'use client';

/**
 * "Tell someone about this shop", on the order confirmation.
 *
 * A switch for this has sat on the Checkout tab since it shipped and nothing
 * anywhere read it — a merchant could turn social sharing on and get nothing.
 *
 * It shares **the shop, never the order.** An order page is reachable by its
 * id, so a share button that posted that link would publish a stranger's
 * address and basket to whatever the shopper pasted it into. The one thing a
 * share on a receipt must not do.
 *
 * No third-party SDKs: each network gets a plain intent URL, so nothing here
 * loads a tracker onto a page that has just taken someone's money.
 */
import { useState } from 'react';

interface Props {
  shopName: string;
  shopUrl: string;
}

export function ShareTheShop({ shopName, shopUrl }: Props) {
  const [copied, setCopied] = useState(false);
  if (!shopUrl) return null;

  const said = `I just ordered from ${shopName}`;
  const url = encodeURIComponent(shopUrl);
  const text = encodeURIComponent(said);

  const places: Array<{ name: string; href: string }> = [
    { name: 'WhatsApp', href: `https://wa.me/?text=${text}%20${url}` },
    { name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${url}` },
    { name: 'X', href: `https://twitter.com/intent/tweet?text=${text}&url=${url}` },
    { name: 'Email', href: `mailto:?subject=${text}&body=${url}` },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shopUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard refused — a blocked permission or an insecure origin. The
      // links beside this still work, so say nothing rather than raise an
      // error about a convenience.
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      <span className="text-fg-muted">Tell someone about us</span>
      {places.map((place) => (
        <a
          key={place.name}
          href={place.href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary hover:underline"
        >
          {place.name}
        </a>
      ))}
      <button
        type="button"
        onClick={copy}
        className="font-medium text-primary hover:underline"
      >
        {copied ? 'Link copied' : 'Copy link'}
      </button>
    </div>
  );
}
