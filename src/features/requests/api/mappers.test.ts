import { describe, expect, it } from 'vitest';
import { mapPage } from '@/shared/api/page';
import { mapFilterProject } from '@/shared/api/project-buildings-filter';
import { mapBuildingUnit, mapResidentRequest } from './mappers';

describe('mapResidentRequest (BMS ResidentLinkResponse)', () => {
  it('maps every field and joins the name', () => {
    expect(
      mapResidentRequest({
        requestId: 42,
        firstName: ' Sara ',
        lastName: 'Ali',
        email: 'sara@x.com',
        mobile: '+966500000000',
        buildingCode: 'B-1',
        buildingName: 'Tower A',
        unitNumber: null,
        projectName: 'Palm',
        createdAt: '2026-10-01T09:00:00',
        status: 'PENDING',
      }),
    ).toEqual({
      requestId: 42,
      fullName: 'Sara Ali',
      email: 'sara@x.com',
      mobile: '+966500000000',
      projectName: 'Palm',
      buildingCode: 'B-1',
      buildingName: 'Tower A',
      unitNumber: undefined,
      status: 'PENDING',
      createdAt: '2026-10-01T09:00:00',
    });
  });

  it('normalises the status and maps unknown ones to OTHER', () => {
    expect(mapResidentRequest({ requestId: 1, status: 'approved' }).status).toBe('APPROVED');
    expect(mapResidentRequest({ requestId: 1, status: 'CANCELLED' }).status).toBe('OTHER');
  });

  it('throws without a numeric requestId, so safeMapList drops the row', () => {
    expect(() => mapResidentRequest({ requestId: '7' })).toThrow();
  });
});

describe('mapBuildingUnit (BMS PropertyUnitResponse)', () => {
  it('maps the occupancy fields', () => {
    expect(
      mapBuildingUnit({
        propertyUnitId: 9,
        unitNumber: '101',
        occupantCount: 2,
        residentFullName: 'Omar',
        floorNumber: 1,
      }),
    ).toEqual({ propertyUnitId: 9, unitNumber: '101', occupantCount: 2, residentFullName: 'Omar' });
  });

  it('defaults a missing occupantCount (older BMS) to 0', () => {
    expect(mapBuildingUnit({ propertyUnitId: 1, unitNumber: '1' }).occupantCount).toBe(0);
  });

  it('throws on a unit without a number', () => {
    expect(() => mapBuildingUnit({ propertyUnitId: 1, unitNumber: '  ' })).toThrow();
  });
});

describe('mapPage (BMS PageResponse)', () => {
  it('maps the page, dropping rows that fail', () => {
    const page = mapPage(
      {
        content: [{ requestId: 1 }, { requestId: 'bad' }],
        page: 0,
        size: 10,
        totalElements: 11,
        totalPages: 2,
        last: false,
      },
      (raw) => mapResidentRequest(raw),
      'resident-request',
      'requests',
    );
    expect(page.content.map((r) => r.requestId)).toEqual([1]);
    expect(page).toMatchObject({ page: 0, totalElements: 11, totalPages: 2, last: false });
  });

  it('derives `last` from the page count when the flag is absent', () => {
    const page = mapPage({ content: [], page: 1, totalPages: 2 }, (r) => r, 'x', 'y');
    expect(page.last).toBe(true);
  });

  it('treats a non-object body as an empty last page', () => {
    expect(mapPage(null, (r) => r, 'x', 'y')).toEqual({
      content: [],
      page: 0,
      totalElements: 0,
      totalPages: 0,
      last: true,
    });
  });
});

describe('mapFilterProject (BMS ProjectBuildingsFilterResponse)', () => {
  it('maps the project and its buildings, dropping buildings without a code', () => {
    expect(
      mapFilterProject({
        projectId: 3,
        projectName: 'Palm',
        buildings: [
          { buildingId: 1, buildingCode: 'B-1', buildingName: 'Tower A' },
          { buildingId: 2, buildingName: 'No code' },
        ],
      }),
    ).toEqual({
      projectId: 3,
      projectName: 'Palm',
      buildings: [{ buildingId: 1, buildingCode: 'B-1', buildingName: 'Tower A' }],
    });
  });
});
