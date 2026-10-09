import { afterEach, describe, expect, it } from 'vitest';
import { setMapperReporter } from '@/shared/api/safe-map';
import {
  isImageAttachment,
  mapComments,
  mapProjectsFilter,
  mapTicket,
  mapTicketDetail,
  mapTicketsPage,
} from './mappers';

// Shapes copied from bms-tms TicketResponse / TicketSlaResponse / SlaPhaseInfo /
// TicketAttachmentResponse / TicketCommentResponse.
const RAW_TICKET = {
  ticketId: 42,
  tktNumber: 'EL-000042',
  statusCode: 'open',
  statusNameAr: 'مفتوحة',
  statusNameEn: 'Open',
  categoryCode: 'ELECTRICITY',
  categoryNameAr: 'كهرباء',
  categoryNameEn: 'Electricity',
  serviceDomain: 'MAINTENANCE',
  priorityCode: 'high',
  assignedTo: null,
  residentFullName: ' Sara Ali ',
  residentMobile: '0501234567',
  buildingName: 'Tower A',
  unitNumber: '12',
  createdAt: '2026-10-01T08:00:00Z',
  sla: {
    policyId: 1,
    priorityCode: 'HIGH',
    activePhase: 'response',
    response: {
      dueAt: '2026-10-01T12:00:00Z',
      remainingSeconds: 3600,
      overdueNow: false,
      breachedEver: false,
    },
    resolve: null,
  },
};

afterEach(() => setMapperReporter(null));

describe('mapTicket', () => {
  it('maps the backend fields and normalises codes', () => {
    const t = mapTicket(RAW_TICKET);
    expect(t).toMatchObject({
      ticketId: 42,
      tktNumber: 'EL-000042',
      statusCode: 'OPEN',
      priorityCode: 'HIGH',
      residentFullName: 'Sara Ali',
      assignedTo: null,
      assignedToId: null,
    });
    expect(t.sla).toEqual({
      activePhase: 'RESPONSE',
      response: {
        dueAt: '2026-10-01T12:00:00Z',
        remainingSeconds: 3600,
        overdueNow: false,
        breachedEver: false,
      },
      resolve: null,
    });
  });

  it('rejects rows without an id or a number', () => {
    expect(() => mapTicket({ ...RAW_TICKET, ticketId: undefined })).toThrow();
    expect(() => mapTicket({ ...RAW_TICKET, tktNumber: '' })).toThrow();
    expect(() => mapTicket(null)).toThrow();
  });
});

describe('mapTicketsPage', () => {
  it('drops bad rows instead of failing the page', () => {
    const failures: number[] = [];
    setMapperReporter({ onItemFailure: (f) => failures.push(f.index), onAggregate: () => {} });
    const page = mapTicketsPage(
      { content: [RAW_TICKET, { nope: true }], totalElements: 2, totalPages: 1 },
      0,
    );
    expect(page.content.map((t) => t.tktNumber)).toEqual(['EL-000042']);
    expect(page).toMatchObject({ totalElements: 2, totalPages: 1, page: 0 });
    expect(failures).toEqual([1]);
  });
});

describe('mapTicketDetail', () => {
  it('adds description, repair cost, attachments and embedded comments', () => {
    const d = mapTicketDetail({
      ...RAW_TICKET,
      description: ' Light is out ',
      resolvedAt: null,
      repairCost: 150.5,
      attachments: [
        {
          id: 7,
          fileName: 'a.jpg',
          mediaType: 'image/jpeg',
          sizeBytes: 10,
          createdAt: 'x',
          downloadUrl: 'https://f/a.jpg',
        },
        { id: 8, fileName: 'broken', mediaType: 'image/png' },
      ],
      comments: [{ authorRole: 'resident', body: 'hi', isInternal: false, createdAt: 'c1' }],
    });
    expect(d.description).toBe('Light is out');
    expect(d.repairCost).toBe(150.5);
    expect(d.attachments).toHaveLength(1);
    expect(d.attachments[0]?.id).toBe('7');
    expect(d.comments[0]).toMatchObject({ authorRole: 'RESIDENT', body: 'hi', isInternal: false });
  });

  it('treats a missing repair cost as null, never 0', () => {
    expect(mapTicketDetail(RAW_TICKET).repairCost).toBeNull();
  });
});

describe('mapComments', () => {
  it('accepts a bare list or a paged envelope', () => {
    const c = { authorRole: 'FACILITY_MANAGER', body: 'done', isInternal: true, createdAt: 'c' };
    expect(mapComments([c])).toHaveLength(1);
    expect(mapComments({ content: [c] })[0]?.isInternal).toBe(true);
  });
});

describe('isImageAttachment', () => {
  it('uses the media type, then the extension (as the web)', () => {
    expect(isImageAttachment({ mediaType: 'image/png', fileName: 'x' })).toBe(true);
    expect(isImageAttachment({ mediaType: 'application/octet-stream', fileName: 'P.JPG' })).toBe(
      true,
    );
    expect(isImageAttachment({ mediaType: 'application/pdf', fileName: 'r.pdf' })).toBe(false);
  });
});

describe('mapProjectsFilter', () => {
  it('maps projects with their buildings', () => {
    expect(
      mapProjectsFilter([
        {
          projectId: 3,
          projectName: 'Rawda',
          buildings: [{ buildingId: 9, buildingCode: 'B9', buildingName: 'Block 9' }],
        },
      ]),
    ).toEqual([
      {
        projectId: 3,
        projectName: 'Rawda',
        buildings: [{ buildingId: 9, buildingCode: 'B9', buildingName: 'Block 9' }],
      },
    ]);
  });
});
