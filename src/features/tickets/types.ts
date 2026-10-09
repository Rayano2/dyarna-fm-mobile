/**
 * FM ticket shapes, mapped from bms-tms `TicketResponse`
 * (`tms/ticket/dto/TicketResponse.java`). Field names follow the backend so
 * the mapper stays a thin, auditable translation.
 */

/** Status codes the FM app knows how to label. The backend may send others; they fall back to the code. */
export type TicketStatusCode =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED'
  | 'NOT_ACTIONABLE'
  | 'ESCALATED';

export type TicketPriorityCode = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

/** `SlaPhaseInfo.java`: one SLA phase (response or resolve). */
export interface SlaPhase {
  dueAt: string | null;
  /** Seconds left when the server built the response. Null when the phase has no deadline. */
  remainingSeconds: number | null;
  /** Real-time: the phase is incomplete and past its deadline. */
  overdueNow: boolean;
  /** Historical: the phase was ever breached. */
  breachedEver: boolean;
}

/** `TicketSlaResponse.java`. `activePhase` is RESPONSE, RESOLVE or DONE. */
export interface TicketSla {
  activePhase: string;
  response: SlaPhase | null;
  resolve: SlaPhase | null;
}

export interface TicketAttachment {
  id: string;
  fileName: string;
  mediaType: string;
  sizeBytes: number;
  createdAt: string;
  downloadUrl: string;
}

/** `TicketCommentResponse.java`: id and author name are @JsonIgnore'd server-side. */
export interface TicketComment {
  /** Stable key built client-side (the server does not send an id). */
  key: string;
  authorRole: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
}

export interface FmTicket {
  /** Numeric id: used by the `{ticketId}` routes (comments, attachments). */
  ticketId: number;
  /** Ticket number (e.g. EL-000001): used by the `{ticketNumber}` routes (detail, status, assign). */
  tktNumber: string;
  statusCode: string;
  statusNameAr: string;
  statusNameEn: string;
  categoryCode: string;
  categoryNameAr: string;
  categoryNameEn: string;
  serviceDomain: string;
  priorityCode: string;
  /** Assignee as sent by the server (a name or id string), null when unassigned. */
  assignedTo: string | null;
  /** Assignee user id when the server sends one (`assignedToId`), else null. */
  assignedToId: string | null;
  residentFullName: string;
  residentMobile: string;
  buildingName: string;
  unitNumber: string;
  createdAt: string;
  sla: TicketSla | null;
}

export interface FmTicketDetail extends FmTicket {
  title: string;
  description: string;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  repairCost: number | null;
  attachments: TicketAttachment[];
  comments: TicketComment[];
}

export interface TicketsPage {
  content: FmTicket[];
  totalElements: number;
  totalPages: number;
  /** Zero-based page index this response is for. */
  page: number;
}

// The projects/buildings filter data is shared with the residents screens.
export type { FilterBuilding, FilterProject } from '@/shared/api/project-buildings-filter';

export type TicketSortField =
  | 'createdAt'
  | 'categoryCode'
  | 'priorityCode'
  | 'statusCode'
  | 'responseDueAt';
export type SortDirection = 'asc' | 'desc';

export type TicketStatusFilter = 'ALL' | TicketStatusCode;

export interface TicketListFilters {
  status: TicketStatusFilter;
  projectId: number | null;
  buildingCode: string | null;
  ticketNo: string;
  sortField: TicketSortField;
  sortDir: SortDirection;
}
