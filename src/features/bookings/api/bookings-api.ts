import { communityClient } from '@/shared/api/clients';
import { asString } from '@/shared/api/coerce';

export const BOOKING_STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'COMPLETED',
  'NO_SHOW',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Agenda page size (the controller's default). */
export const AGENDA_PAGE_SIZE = 20;
/**
 * The server clamps `size` to 100 (`FacilityController.MAX_PAGE_SIZE`), so the
 * web's `WEEK_FETCH_SIZE = 200` silently returns 100. The week fetch pages
 * instead, bounded by `WEEK_MAX_PAGES`.
 */
export const SERVER_MAX_PAGE_SIZE = 100;
export const WEEK_MAX_PAGES = 5;

export interface Booking {
  id: string;
  facilityId: string;
  facilityName: string;
  facilityType: string;
  userId: string;
  residentName: string | undefined;
  title: string;
  startTime: Date | undefined;
  endTime: Date | undefined;
  status: string;
  guestCount: number | undefined;
  notes: string;
  approvedBy: string | undefined;
  approvedAt: Date | undefined;
  rejectionReason: string | undefined;
}

export interface BookingPage {
  items: Booking[];
  page: number;
  last: boolean;
}

function toDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** `FacilityBookingAdminResponse` (Community `dto/FacilityBookingAdminResponse.java`). */
export function toBooking(raw: unknown): Booking | null {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const id = asString(obj.id);
  if (id.length === 0) return null;
  const guests = obj.guestCount;
  return {
    id,
    facilityId: asString(obj.facilityId),
    facilityName: asString(obj.facilityName),
    facilityType: asString(obj.facilityType),
    userId: asString(obj.userId),
    residentName: asString(obj.residentName) || undefined,
    title: asString(obj.title),
    startTime: toDate(obj.startTime),
    endTime: toDate(obj.endTime),
    status: asString(obj.status).toUpperCase(),
    guestCount: typeof guests === 'number' && Number.isFinite(guests) ? guests : undefined,
    notes: asString(obj.notes),
    approvedBy: asString(obj.approvedBy) || undefined,
    approvedAt: toDate(obj.approvedAt),
    rejectionReason: asString(obj.rejectionReason) || undefined,
  };
}

/** A Spring `Page` (classic shape, or the `PagedModel` `{content, page:{…}}` shape). */
export function toBookingPage(res: unknown): BookingPage {
  const obj = (res ?? {}) as Record<string, unknown>;
  const content = Array.isArray(obj.content) ? obj.content : [];
  const meta = (obj.page && typeof obj.page === 'object' ? obj.page : obj) as Record<
    string,
    unknown
  >;
  const number = typeof meta.number === 'number' ? meta.number : 0;
  const totalPages = typeof meta.totalPages === 'number' ? meta.totalPages : undefined;
  const last =
    typeof obj.last === 'boolean' ? obj.last : totalPages === undefined || number + 1 >= totalPages;
  return {
    items: content.map((raw) => toBooking(raw)).filter((b): b is Booking => b !== null),
    page: number,
    last,
  };
}

export interface BookingQuery {
  projectId: string;
  buildingId?: string | undefined;
  status?: BookingStatus | undefined;
  /** ISO instant, inclusive. Build with `toInstantParam` — a bare date 500s. */
  from?: string | undefined;
  /** ISO instant, exclusive. */
  to?: string | undefined;
}

export async function listBookings(
  query: BookingQuery,
  page: number,
  size: number = AGENDA_PAGE_SIZE,
): Promise<BookingPage> {
  const searchParams: Record<string, string> = {
    projectId: query.projectId,
    page: String(page),
    size: String(Math.min(size, SERVER_MAX_PAGE_SIZE)),
  };
  if (query.buildingId) searchParams.buildingId = query.buildingId;
  if (query.status) searchParams.status = query.status;
  if (query.from) searchParams.from = query.from;
  if (query.to) searchParams.to = query.to;
  const res = await communityClient
    .get('api/v1/facilities/bookings', { searchParams })
    .json<unknown>();
  return toBookingPage(res);
}

/** Every booking in a window, paging at the server cap. Bounded so a runaway range can't loop. */
export async function listAllBookings(query: BookingQuery): Promise<Booking[]> {
  const all: Booking[] = [];
  for (let page = 0; page < WEEK_MAX_PAGES; page++) {
    const res = await listBookings(query, page, SERVER_MAX_PAGE_SIZE);
    all.push(...res.items);
    if (res.last || res.items.length === 0) break;
  }
  return all;
}

/**
 * `PATCH /api/v1/facilities/bookings/{id}/status?status=…[&reason=…]` — query
 * params only, NO body.
 */
export async function updateBookingStatus(
  id: string,
  status: 'APPROVED' | 'REJECTED',
  reason?: string,
): Promise<void> {
  const searchParams: Record<string, string> = { status };
  if (reason) searchParams.reason = reason;
  await communityClient.patch(`api/v1/facilities/bookings/${encodeURIComponent(id)}/status`, {
    searchParams,
  });
}
