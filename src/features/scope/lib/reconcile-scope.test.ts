import { describe, expect, it } from 'vitest';
import type { ScopeProject } from '../api/projects-buildings';
import { reconcileScope, type ScopeSnapshotInput } from './reconcile-scope';

const P7: ScopeProject = {
  projectId: '7',
  projectName: 'Palm',
  buildings: [{ buildingId: '3', buildingCode: 'B3', buildingName: 'Tower 3' }],
};
const P8: ScopeProject = { projectId: '8', projectName: 'Oasis', buildings: [] };

const base: ScopeSnapshotInput = {
  hydrated: true,
  loaded: true,
  projects: [P7, P8],
  storedProjectId: null,
  storedBuildingId: null,
};

describe('reconcileScope', () => {
  it('waits for hydration and for the project list', () => {
    expect(reconcileScope({ ...base, projects: [P7], hydrated: false })).toBeNull();
    expect(reconcileScope({ ...base, projects: [P7], loaded: false })).toBeNull();
    // A stale id is not dropped before the store has hydrated either.
    expect(reconcileScope({ ...base, storedProjectId: 'gone', hydrated: false })).toBeNull();
  });

  it('auto-selects the only project', () => {
    expect(reconcileScope({ ...base, projects: [P7] })).toEqual({
      kind: 'setProject',
      projectId: '7',
    });
  });

  it('leaves the choice to the rep when there are several projects', () => {
    expect(reconcileScope(base)).toBeNull();
  });

  it('drops a stale project (another account / lost access)', () => {
    expect(reconcileScope({ ...base, storedProjectId: 'gone' })).toEqual({
      kind: 'setProject',
      projectId: null,
    });
  });

  it('replaces a stale project with the only one available', () => {
    expect(reconcileScope({ ...base, projects: [P8], storedProjectId: '7' })).toEqual({
      kind: 'setProject',
      projectId: '8',
    });
  });

  it('clears a building that is not in the selected project', () => {
    expect(reconcileScope({ ...base, storedProjectId: '7', storedBuildingId: '99' })).toEqual({
      kind: 'clearBuilding',
    });
    expect(reconcileScope({ ...base, storedProjectId: '7', storedBuildingId: '3' })).toBeNull();
  });
});
