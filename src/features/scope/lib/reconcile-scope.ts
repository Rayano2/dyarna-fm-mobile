import type { ScopeProject } from '../api/projects-buildings';

export interface ScopeSnapshotInput {
  hydrated: boolean;
  /** The projects query has succeeded. */
  loaded: boolean;
  projects: readonly ScopeProject[];
  storedProjectId: string | null;
  storedBuildingId: string | null;
}

export type ScopeFix =
  | { kind: 'setProject'; projectId: string | null }
  | { kind: 'clearBuilding' }
  | null;

/**
 * What the persisted scope must change to, given the rep's real project list:
 * - nothing until both the store has hydrated and the list has loaded;
 * - a stale project (another account, or lost access) is dropped — replaced by
 *   the only project if there is exactly one;
 * - no project + exactly one available → auto-select it;
 * - a building that isn't in the selected project is cleared.
 */
export function reconcileScope(input: ScopeSnapshotInput): ScopeFix {
  const { hydrated, loaded, projects, storedProjectId, storedBuildingId } = input;
  if (!hydrated || !loaded) return null;
  const only = projects.length === 1 ? projects[0]!.projectId : null;
  const project = projects.find((p) => p.projectId === storedProjectId);
  if (storedProjectId && !project) return { kind: 'setProject', projectId: only };
  if (!storedProjectId) return only ? { kind: 'setProject', projectId: only } : null;
  if (
    project &&
    storedBuildingId &&
    !project.buildings.some((b) => b.buildingId === storedBuildingId)
  ) {
    return { kind: 'clearBuilding' };
  }
  return null;
}
