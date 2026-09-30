/**
 * Every band this storefront can draw, by the name the API serves.
 *
 * One entry per section in `services/storefront_sections.py`. A name the API
 * offers and this file does not have is a merchant arranging their page and
 * watching a band never appear — which is what
 * `test_home_sections_are_implemented.py` fails on.
 *
 * Not dynamically imported, unlike the header's menus. A home page draws
 * whichever bands the merchant arranged and they are all above the fold for
 * somebody: splitting thirty chunks out would trade one download for thirty
 * round trips on the page that has to be fastest.
 */
import type { ComponentType } from 'react';
import type { SectionProps } from './types';

import {
  HeroBand, TrustBand, CategoriesBand, FeaturedBand, CollectionSection,
  EditorialSection,
} from './bands/Shop';
import {
  BookingBand, WorkOrderBand, RepairEstimateBand, ReservationBand,
  PrescriptionBand, AgeGateBand,
} from './bands/Actions';
import {
  RichTextBand, ImageTextBand, GalleryBand, TestimonialsBand, FaqBand,
  StatsBand, TeamBand,
} from './bands/Content';
import {
  AnnouncementBand, PromoBand, CountdownBand, NewsletterBand, LogosBand,
  VideoBand,
} from './bands/Promo';
import {
  MenuBand, ServicesBand, TimetableBand, LocationsBand, ContactBand,
} from './bands/Trade';
import { RowBand } from './bands/Row';
import {
  TextCardBlock, TileBlock, MosaicBlock, ProductListBlock, MapBlock,
} from './bands/Blocks';

export const BANDS: Record<string, ComponentType<SectionProps>> = {
  // Structure
  row: RowBand,
  // The page's own furniture
  hero: HeroBand,
  announcement: AnnouncementBand,
  trust: TrustBand,
  // What the shop sells
  categories: CategoriesBand,
  featured: FeaturedBand,
  collection: CollectionSection,
  logos: LogosBand,
  productList: ProductListBlock,
  textCard: TextCardBlock,
  tile: TileBlock,
  mosaic: MosaicBlock,
  map: MapBlock,
  // Words and pictures
  richText: RichTextBand,
  imageText: ImageTextBand,
  editorial: EditorialSection,
  gallery: GalleryBand,
  video: VideoBand,
  promo: PromoBand,
  countdown: CountdownBand,
  // Trust and contact
  testimonials: TestimonialsBand,
  faq: FaqBand,
  stats: StatsBand,
  team: TeamBand,
  newsletter: NewsletterBand,
  locations: LocationsBand,
  contact: ContactBand,
  // What a particular trade needs
  menu: MenuBand,
  reservation: ReservationBand,
  services: ServicesBand,
  bookingCta: BookingBand,
  timetable: TimetableBand,
  workOrderCta: WorkOrderBand,
  repairEstimate: RepairEstimateBand,
  prescription: PrescriptionBand,
  ageGate: AgeGateBand,
};

export function bandFor(type: string): ComponentType<SectionProps> | null {
  return BANDS[type] ?? null;
}
