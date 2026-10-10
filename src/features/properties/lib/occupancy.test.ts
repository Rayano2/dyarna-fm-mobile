import { describe, expect, it } from 'vitest';
import type { PropertyBuilding, PropertyProject, PropertyUnit } from '../api/mappers';
import {
  buildingStats,
  filterProjects,
  filterUnits,
  isOccupied,
  projectStats,
  searchUsers,
} from './occupancy';

function unit(unitNumber: string, residentFullName?: string, occupantCount = 0): PropertyUnit {
  return {
    propertyUnitId: 1,
    unitNumber,
    floorNumber: 0,
    occupantCount,
    residentFullName,
    residentMobile: undefined,
  };
}

function building(buildingCode: string, units: PropertyUnit[]): PropertyBuilding {
  return { buildingCode, buildingName: buildingCode, units };
}

function project(projectId: number, buildings: PropertyBuilding[]): PropertyProject {
  return {
    projectId,
    projectName: `P${projectId}`,
    cityCode: undefined,
    president: null,
    buildings,
  };
}

const A = building('A', [unit('1', 'Omar'), unit('2'), unit('3', undefined, 2)]);
const B = building('B', [unit('1'), unit('2')]);
const EMPTY = building('E', []);

describe('isOccupied', () => {
  it('a named resident or a positive count means occupied', () => {
    expect(isOccupied(unit('1', 'Omar'))).toBe(true);
    expect(isOccupied(unit('1', undefined, 1))).toBe(true);
    expect(isOccupied(unit('1'))).toBe(false);
  });
});

describe('occupancy stats', () => {
  it('counts one building', () => {
    expect(buildingStats(A)).toEqual({ buildings: 1, units: 3, occupied: 2, ratio: 2 / 3 });
  });

  it('sums a project across buildings', () => {
    expect(projectStats(project(1, [A, B, EMPTY]))).toEqual({
      buildings: 3,
      units: 5,
      occupied: 2,
      ratio: 0.4,
    });
  });

  it('a project without units has ratio 0, not NaN', () => {
    expect(projectStats(project(1, [EMPTY]))).toEqual({
      buildings: 1,
      units: 0,
      occupied: 0,
      ratio: 0,
    });
    expect(projectStats(project(1, [])).ratio).toBe(0);
  });

  it('a fully occupied building has ratio 1', () => {
    expect(buildingStats(building('F', [unit('1', 'x'), unit('2', 'y')])).ratio).toBe(1);
  });
});

describe('filterUnits', () => {
  it('all keeps everything', () => {
    expect(filterUnits(A.units, 'all')).toHaveLength(3);
  });
  it('occupied / vacant split the units', () => {
    expect(filterUnits(A.units, 'occupied').map((u) => u.unitNumber)).toEqual(['1', '3']);
    expect(filterUnits(A.units, 'vacant').map((u) => u.unitNumber)).toEqual(['2']);
  });
});

describe('filterProjects', () => {
  const projects = [project(1, [A, B]), project(2, [EMPTY])];

  it('no filter keeps every project', () => {
    expect(filterProjects(projects, { projectId: null, buildingCode: null })).toEqual(projects);
  });

  it('a project filter keeps only that project', () => {
    expect(
      filterProjects(projects, { projectId: 2, buildingCode: null }).map((p) => p.projectId),
    ).toEqual([2]);
  });

  it('a building filter narrows the project to that building', () => {
    const out = filterProjects(projects, { projectId: 1, buildingCode: 'B' });
    expect(out).toHaveLength(1);
    expect(out[0]?.buildings.map((b) => b.buildingCode)).toEqual(['B']);
    expect(projectStats(out[0] as PropertyProject).units).toBe(2);
  });

  it('an unknown building yields nothing', () => {
    expect(filterProjects(projects, { projectId: 1, buildingCode: 'Z' })).toEqual([]);
  });
});

describe('searchUsers', () => {
  const users = [
    { userId: '1', fullName: 'Sara Ali' },
    { userId: '2', fullName: 'Omar Saleh' },
  ];
  it('blank search returns everyone', () => {
    expect(searchUsers(users, '  ')).toHaveLength(2);
  });
  it('matches case-insensitively on the name', () => {
    expect(searchUsers(users, 'sal').map((u) => u.userId)).toEqual(['2']);
    expect(searchUsers(users, 'ALI').map((u) => u.userId)).toEqual(['1']);
  });
});
