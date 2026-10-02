import { storeName } from '@/lib/store-name';
import type { StoreConfig } from '@xeboki/sdk';

/**
 * The shop is switched off.
 *
 * "Enable Online Store — make your store visible to customers" sets
 * `is_published`, and that only ever reached `robots.ts`, the sitemap and a
 * `noindex` meta. A merchant who switched their shop off was hidden from
 * search engines and **still selling**: home, catalog and cart all answered
 * 200 to anyone with the link. The switch now does what its own label says.
 *
 * A page rather than a 404, because the shop exists and the person may have
 * been given the address by the merchant. A 404 tells them they are wrong;
 * this tells them they are early.
 *
 * Absent means published — nothing gated a page on this before, so a shop
 * that has never opened the switch keeps serving exactly as it does today.
 * Only an explicit "off" closes the doors, which is the whole point of
 * having switched it.
 */
export function NotOpenYet({ storeConfig }: { storeConfig: StoreConfig }) {
  const name = storeName(storeConfig);
  const email = storeConfig.supportEmail || '';
  const phone = storeConfig.supportPhone || '';

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6">
      <div className="mx-auto max-w-md text-center">
        <p className="eyebrow eyebrow-rule text-primary">{name}</p>
        <h1 className="display-lg mt-4 text-fg">Not open yet</h1>
        <p className="mt-4 text-fg-muted">
          This shop is not taking visitors at the moment. Do come back.
        </p>
        {(email || phone) && (
          <p className="mt-8 text-sm text-fg-muted">
            In the meantime you can reach us
            {phone && (
              <>
                {' '}on{' '}
                <a href={`tel:${phone}`} className="font-medium text-fg hover:text-primary">
                  {phone}
                </a>
              </>
            )}
            {email && (
              <>
                {phone ? ' or' : ''}{' '}at{' '}
                <a href={`mailto:${email}`} className="font-medium text-fg hover:text-primary">
                  {email}
                </a>
              </>
            )}
            .
          </p>
        )}
      </div>
    </main>
  );
}
