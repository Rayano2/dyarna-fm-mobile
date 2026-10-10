import { describe, expect, it } from 'vitest';
import {
  activeFilterCount,
  buildingsForProject,
  EMPTY_PROJECT_BUILDING_FILTER,
  selectBuilding,
  selectProject,
} from './project-building-filter';

const PROJECTS = [
  {
    projectId: 1,
    projectName: 'Palm',
    buildings: [{ buildingId: 1, buildingCode: 'P-1', buildingName: 'A' }],
  },
  {
    projectId: 2,
    projectName: 'Oasis',
    buildings: [{ buildingId: 2, buildingCode: 'O-1', buildingName: 'B' }],
  },
];

describe('project/building filter', () => {
  it('changing the project clears the building', () => {
    const chosen = { projectId: 1, buildingCode: 'P-1' };
    expect(selectProject(chosen, 2)).toEqual({ projectId: 2, buildingCode: null });
    expect(selectProject(chosen, null)).toEqual({ projectId: null, buildingCode: null });
  });

  it('re-selecting the same project keeps the building', () => {
    const chosen = { projectId: 1, buildingCode: 'P-1' };
    expect(selectProject(chosen, 1)).toBe(chosen);
  });

  it('a building cannot be chosen before a project', () => {
    expect(selectBuilding(EMPTY_PROJECT_BUILDING_FILTER, 'P-1')).toBe(
      EMPTY_PROJECT_BUILDING_FILTER,
    );
    expect(selectBuilding({ projectId: 1, buildingCode: null }, 'P-1')).toEqual({
      projectId: 1,
      buildingCode: 'P-1',
    });
  });

  it('lists only the chosen project buildings', () => {
    expect(buildingsForProject(PROJECTS, null)).toEqual([]);
    expect(buildingsForProject(PROJECTS, 2).map((b) => b.buildingCode)).toEqual(['O-1']);
  });

  it('counts active filters for the badge', () => {
    expect(activeFilterCount(EMPTY_PROJECT_BUILDING_FILTER)).toBe(0);
    expect(activeFilterCount({ projectId: 1, buildingCode: null })).toBe(1);
    expect(activeFilterCount({ projectId: 1, buildingCode: 'P-1' })).toBe(2);
  });
});
