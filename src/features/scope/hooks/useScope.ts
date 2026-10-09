import { useEffect, useMemo } from 'react';
import type { ScopeBuilding, ScopeProject } from '../api/projects-buildings';
import { useScopeStore } from '../stores/scopeStore';
import { useScopeProjects } from './useScopeProjects';

export interface ScopeValue {
  projects: ScopeProject[];
  project: ScopeProject | undefined;
  building: ScopeBuilding | undefined;
  /** Only set once it is known to belong to the rep (validated against the list). */
  projectId: string | undefined;
  buildingId: string | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  setProject: (projectId: string | null) => void;
  setBuilding: (buildingId: string | null) => void;
}

/**
 * The shared, persisted project/building scope, validated against the rep's
 * projects. Auto-selects the project when the rep has exactly one.
 */
export function useScope(): ScopeValue {
  const query = useScopeProjects();
  const storedProjectId = useScopeStore((s) => s.projectId);
  const storedBuildingId = useScopeStore((s) => s.buildingId);
  const hydrated = useScopeStore((s) => s.hydrated);
  const hydrate = useScopeStore((s) => s.hydrate);
  const setProject = useScopeStore((s) => s.setProject);
  const setBuilding = useScopeStore((s) => s.setBuilding);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const projects = useMemo(() => query.data ?? [], [query.data]);
  const project = projects.find((p) => p.projectId === storedProjectId);
  const building = project?.buildings.find((b) => b.buildingId === storedBuildingId);

  useEffect(() => {
    if (!hydrated || !query.isSuccess) return;
    if (storedProjectId && !project) {
      // A stale pick (another account, or a project the rep lost access to).
      setProject(projects.length === 1 ? projects[0]!.projectId : null);
      return;
    }
    if (!storedProjectId && projects.length === 1) {
      setProject(projects[0]!.projectId);
      return;
    }
    if (project && storedBuildingId && !building) setBuilding(null);
  }, [
    hydrated,
    query.isSuccess,
    projects,
    project,
    building,
    storedProjectId,
    storedBuildingId,
    setProject,
    setBuilding,
  ]);

  return {
    projects,
    project,
    building,
    projectId: project?.projectId,
    buildingId: building?.buildingId,
    isLoading: query.isLoading || !hydrated,
    isError: query.isError,
    refetch: () => {
      void query.refetch();
    },
    setProject,
    setBuilding,
  };
}
