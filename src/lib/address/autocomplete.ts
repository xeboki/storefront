'use client';

/**
 * Address autocomplete via Google Places, env-gated and degrading cleanly.
 *
 * When NEXT_PUBLIC_GOOGLE_PLACES_KEY is set, attach the returned ref to the
 * "address line 1" input and picking a suggestion fills the structured fields.
 * When it's unset (or the script fails), the ref is inert and the field stays a
 * normal manual input — no error, no blocked checkout.
 */
import { useEffect, useRef } from 'react';

export interface ResolvedAddress {
  line1: string;
  city: string;
  state: string;
  postcode: string;
  country: string; // ISO-2
}

/* eslint-disable @typescript-eslint/no-explicit-any */
let scriptPromise: Promise<void> | null = null;

function loadPlaces(key: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject();
  if ((window as any).google?.maps?.places) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject();
    document.head.appendChild(s);
  });
  return scriptPromise;
}

function parse(place: any): ResolvedAddress | null {
  const comps: any[] = place?.address_components ?? [];
  if (comps.length === 0) return null;
  const get = (type: string, short = false) => {
    const c = comps.find((x) => x.types?.includes(type));
    return c ? (short ? c.short_name : c.long_name) : '';
  };
  const streetNo = get('street_number');
  const route = get('route');
  return {
    line1: [streetNo, route].filter(Boolean).join(' ').trim() || (place.name ?? ''),
    city: get('postal_town') || get('locality') || get('sublocality') || '',
    state: get('administrative_area_level_1', true),
    postcode: get('postal_code'),
    country: get('country', true),
  };
}

export function useAddressAutocomplete(onResolved: (a: ResolvedAddress) => void) {
  const ref = useRef<HTMLInputElement | null>(null);
  const cb = useRef(onResolved);
  cb.current = onResolved;

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY;
    if (!key || !ref.current) return;
    let ac: any;
    let cancelled = false;
    loadPlaces(key)
      .then(() => {
        if (cancelled || !ref.current) return;
        const g = (window as any).google;
        ac = new g.maps.places.Autocomplete(ref.current, {
          types: ['address'],
          fields: ['address_components', 'name'],
        });
        ac.addListener('place_changed', () => {
          const parsed = parse(ac.getPlace());
          if (parsed) cb.current(parsed);
        });
      })
      .catch(() => {
        /* no key / offline / blocked — manual entry still works */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return ref;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
