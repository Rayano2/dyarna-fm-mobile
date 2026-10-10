import { describe, expect, it } from 'vitest';
import type { FilterProject } from '@/shared/api/project-buildings-filter';
import { resolveQrSelection } from './building-qr';

const PROJECTS: FilterProject[] = [
  { projectId: 1, projectName: 'Empty', buildings: [] },
  {
    projectId: 2,
    projectName: 'Rawabi',
    buildings: [
      { buildingId: 10, buildingCode: 'RW-A', buildingName: 'Tower A' },
      { buildingId: 11, buildingCode: 'RW-B', buildingName: 'Tower B' },
    ],
  },
];

describe('resolveQrSelection', () => {
  it('defaults to the first project that has a building', () => {
    const { project, building } = resolveQrSelection(PROJECTS, null, null);
    expect(project?.projectId).toBe(2);
    expect(building?.buildingCode).toBe('RW-A');
  });

  it('honours an explicit pick', () => {
    expect(resolveQrSelection(PROJECTS, 2, 'RW-B').building?.buildingCode).toBe('RW-B');
  });

  it('falls back to the first building when the code is stale', () => {
    expect(resolveQrSelection(PROJECTS, 2, 'GONE').building?.buildingCode).toBe('RW-A');
  });

  it('shows no building for a picked project without any', () => {
    const { project, building } = resolveQrSelection(PROJECTS, 1, null);
    expect(project?.projectId).toBe(1);
    expect(building).toBeUndefined();
  });

  it('is empty for no projects', () => {
    expect(resolveQrSelection([], null, null)).toEqual({ project: undefined, building: undefined });
  });
});
