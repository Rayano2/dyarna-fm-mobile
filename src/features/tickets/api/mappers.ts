import { asNumberLoose, asString, asStringOrUndef, extractArray } from '@/shared/api/coerce';
import { safeMapList } from '@/shared/api/safe-map';
import type {
  FilterProject,
  FmTicket,
  FmTicketDetail,
  SlaPhase,
  TicketAttachment,
  TicketComment,
  TicketSla,
  TicketsPage,
} from '../types';

type Obj = Record<string, unknown>;

function asObj(raw: unknown): Obj {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('expected an object');
  }
  return raw as Obj;
}

function stringOrNull(v: unknown): string | null {
  return asStringOrUndef(v) ?? null;
}

function numberOrNull(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function mapPhase(raw: unknown): SlaPhase | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Obj;
  return {
    dueAt: stringOrNull(o.dueAt),
    remainingSeconds: numberOrNull(o.remainingSeconds),
    overdueNow: o.overdueNow === true,
    breachedEver: o.breachedEver === true,
  };
}

export function mapSla(raw: unknown): TicketSla | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Obj;
  return {
    activePhase: asString(o.activePhase).toUpperCase(),
    response: mapPhase(o.response),
    resolve: mapPhase(o.resolve),
  };
}

/** Throws (and is dropped by `safeMapList`) when the row has no id or number. */
export function mapTicket(raw: unknown): FmTicket {
  const o = asObj(raw);
  const ticketId = numberOrNull(o.ticketId);
  const tktNumber = asString(o.tktNumber).trim();
  if (ticketId === null) throw new Error('ticket without ticketId');
  if (!tktNumber) throw new Error('ticket without tktNumber');
  return {
    ticketId,
    tktNumber,
    statusCode: asString(o.statusCode).toUpperCase(),
    statusNameAr: asString(o.statusNameAr),
    statusNameEn: asString(o.statusNameEn),
    categoryCode: asString(o.categoryCode),
    categoryNameAr: asString(o.categoryNameAr),
    categoryNameEn: asString(o.categoryNameEn),
    serviceDomain: asString(o.serviceDomain),
    priorityCode: asString(o.priorityCode).toUpperCase(),
    assignedTo: stringOrNull(o.assignedTo),
    assignedToId: stringOrNull(o.assignedToId),
    residentFullName: asString(o.residentFullName).trim(),
    residentMobile: asString(o.residentMobile),
    buildingName: asString(o.buildingName),
    unitNumber: asString(o.unitNumber),
    createdAt: asString(o.createdAt),
    sla: mapSla(o.sla),
  };
}

export function mapAttachment(raw: unknown): TicketAttachment {
  const o = asObj(raw);
  const downloadUrl = asString(o.downloadUrl);
  if (!downloadUrl) throw new Error('attachment without downloadUrl');
  return {
    id: String(o.id ?? downloadUrl),
    fileName: asString(o.fileName),
    mediaType: asString(o.mediaType),
    sizeBytes: asNumberLoose(o.sizeBytes),
    createdAt: asString(o.createdAt),
    downloadUrl,
  };
}

export function mapComment(raw: unknown, index: number): TicketComment {
  const o = asObj(raw);
  const body = asString(o.body ?? o.comment);
  const createdAt = asString(o.createdAt);
  return {
    key: `${createdAt}-${index}`,
    authorRole: asString(o.authorRole).toUpperCase(),
    body,
    isInternal: o.isInternal === true,
    createdAt,
  };
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.bmp'];

export function isImageAttachment(a: Pick<TicketAttachment, 'mediaType' | 'fileName'>): boolean {
  if (a.mediaType.toLowerCase().startsWith('image/')) return true;
  const name = a.fileName.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function mapComments(raw: unknown): TicketComment[] {
  const list = extractArray(raw, ['content', 'data']);
  let index = 0;
  return safeMapList(list, (item) => mapComment(item, index++), {
    feature: 'tickets',
    entity: 'comment',
  });
}

export function mapTicketDetail(raw: unknown): FmTicketDetail {
  const base = mapTicket(raw);
  const o = raw as Obj;
  const attachments = Array.isArray(o.attachments)
    ? safeMapList(o.attachments, mapAttachment, { feature: 'tickets', entity: 'attachment' })
    : [];
  return {
    ...base,
    title: asString(o.title),
    description: asString(o.description).trim(),
    firstResponseAt: stringOrNull(o.firstResponseAt),
    resolvedAt: stringOrNull(o.resolvedAt),
    closedAt: stringOrNull(o.closedAt),
    repairCost: numberOrNull(o.repairCost),
    attachments,
    comments: Array.isArray(o.comments) ? mapComments(o.comments) : [],
  };
}

export function mapTicketsPage(raw: unknown, page: number): TicketsPage {
  const o = raw && typeof raw === 'object' ? (raw as Obj) : {};
  const content = safeMapList(extractArray(raw, ['content']), mapTicket, {
    feature: 'tickets',
    entity: 'ticket',
  });
  return {
    content,
    totalElements: asNumberLoose(o.totalElements, content.length),
    totalPages: asNumberLoose(o.totalPages, 1),
    page,
  };
}

export function mapProjectsFilter(raw: unknown): FilterProject[] {
  const list = Array.isArray(raw) ? raw : [];
  return safeMapList(
    list,
    (item) => {
      const o = asObj(item);
      const projectId = numberOrNull(o.projectId);
      if (projectId === null) throw new Error('project without projectId');
      const buildings = Array.isArray(o.buildings) ? o.buildings : [];
      return {
        projectId,
        projectName: asString(o.projectName),
        buildings: safeMapList(
          buildings,
          (b) => {
            const bo = asObj(b);
            const buildingCode = asString(bo.buildingCode);
            if (!buildingCode) throw new Error('building without buildingCode');
            return {
              buildingId: asNumberLoose(bo.buildingId),
              buildingCode,
              buildingName: asString(bo.buildingName) || buildingCode,
            };
          },
          { feature: 'tickets', entity: 'filter-building' },
        ),
      };
    },
    { feature: 'tickets', entity: 'filter-project' },
  );
}
