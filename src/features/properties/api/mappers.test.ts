import { describe, expect, it } from 'vitest';
import { mapProjectUsers, mapPropertiesList, mapPropertyProject, mapPropertyUnit } from './mappers';

const RAW_PROJECT = {
  projectId: 7,
  projectName: ' Al Noor ',
  cityCode: 'RUH',
  districtCode: 'D1',
  buildingCount: 2,
  president: { fullName: 'Sara Ali' },
  buildings: [
    {
      buildingId: 1,
      buildingName: 'Tower A',
      buildingCode: 'B-001',
      properties: [
        {
          propertyUnitId: 11,
          unitNumber: '101',
          floorNumber: 1,
          residentFullName: 'Omar',
          residentMobile: '+966500000000',
        },
        { propertyUnitId: 12, unitNumber: '102', floorNumber: 1 },
      ],
    },
    { buildingId: 2, buildingName: '', buildingCode: 'B-002', properties: null },
  ],
};

describe('mapPropertyProject', () => {
  it('maps the hierarchy', () => {
    const project = mapPropertyProject(RAW_PROJECT);
    expect(project).toMatchObject({
      projectId: 7,
      projectName: 'Al Noor',
      cityCode: 'RUH',
      president: { fullName: 'Sara Ali' },
    });
    expect(project.buildings).toHaveLength(2);
    expect(project.buildings[0]?.units[0]).toEqual({
      propertyUnitId: 11,
      unitNumber: '101',
      floorNumber: 1,
      occupantCount: 0,
      residentFullName: 'Omar',
      residentMobile: '+966500000000',
    });
  });

  it('falls back to the code for a nameless building and tolerates null units', () => {
    const building = mapPropertyProject(RAW_PROJECT).buildings[1];
    expect(building).toEqual({ buildingCode: 'B-002', buildingName: 'B-002', units: [] });
  });

  it('treats a missing or nameless president as none', () => {
    expect(mapPropertyProject({ ...RAW_PROJECT, president: null }).president).toBeNull();
    expect(
      mapPropertyProject({ ...RAW_PROJECT, president: { fullName: ' ' } }).president,
    ).toBeNull();
  });

  it('accepts a string project id', () => {
    expect(mapPropertyProject({ ...RAW_PROJECT, projectId: '9' }).projectId).toBe(9);
  });

  it('throws without a project id', () => {
    expect(() => mapPropertyProject({ ...RAW_PROJECT, projectId: undefined })).toThrow();
  });
});

describe('mapPropertyUnit', () => {
  it('defaults the floor to 0 and blanks to undefined', () => {
    expect(
      mapPropertyUnit({ unitNumber: ' 5 ', residentFullName: '', residentMobile: '  ' }),
    ).toEqual({
      propertyUnitId: 0,
      unitNumber: '5',
      floorNumber: 0,
      occupantCount: 0,
      residentFullName: undefined,
      residentMobile: undefined,
    });
  });

  it('throws without a unit number', () => {
    expect(() => mapPropertyUnit({ unitNumber: '  ' })).toThrow();
  });
});

describe('mapPropertiesList', () => {
  it('drops malformed projects, buildings and units instead of failing the list', () => {
    const list = mapPropertiesList([
      RAW_PROJECT,
      { projectName: 'no id' },
      {
        projectId: 8,
        projectName: 'P8',
        buildings: [
          { buildingName: 'no code' },
          { buildingCode: 'C', properties: [{}, { unitNumber: '1' }] },
        ],
      },
    ]);
    expect(list.map((p) => p.projectId)).toEqual([7, 8]);
    expect(list[1]?.buildings).toHaveLength(1);
    expect(list[1]?.buildings[0]?.units.map((u) => u.unitNumber)).toEqual(['1']);
  });

  it('returns [] for a non-array body', () => {
    expect(mapPropertiesList({ content: [] })).toEqual([]);
    expect(mapPropertiesList(null)).toEqual([]);
  });
});

describe('mapProjectUsers', () => {
  it('maps a plain list and drops users without an id', () => {
    expect(mapProjectUsers([{ userId: 'u1', fullName: ' Ali ' }, { fullName: 'ghost' }])).toEqual([
      { userId: 'u1', fullName: 'Ali' },
    ]);
  });

  it('accepts a page body', () => {
    expect(mapProjectUsers({ content: [{ userId: 'u2', fullName: 'Mona' }] })).toEqual([
      { userId: 'u2', fullName: 'Mona' },
    ]);
  });

  it('returns [] for anything else', () => {
    expect(mapProjectUsers(null)).toEqual([]);
  });
});
