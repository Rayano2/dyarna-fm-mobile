import { describe, expect, it } from 'vitest';
import { toScopeProjects } from './api/projects-buildings';

describe('projects-buildings-filter normalizer', () => {
  it('stringifies Long ids and drops rows without one', () => {
    expect(
      toScopeProjects([
        {
          projectId: 7,
          projectName: 'Palm',
          buildings: [
            { buildingId: 3, buildingCode: 'B3', buildingName: 'Tower 3' },
            { buildingCode: 'NOID' },
          ],
        },
        { projectName: 'no id' },
      ]),
    ).toEqual([
      {
        projectId: '7',
        projectName: 'Palm',
        buildings: [{ buildingId: '3', buildingCode: 'B3', buildingName: 'Tower 3' }],
      },
    ]);
  });

  it('tolerates a non-array response', () => {
    expect(toScopeProjects({ error: 'x' })).toEqual([]);
  });
});
