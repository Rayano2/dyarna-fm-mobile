import { useEffect, useMemo } from 'react';
import type { FilterBuilding, FilterProject } from '@/shared/api/project-buildings-filter';
import { useProjectsBuildingsFilter } from '@/shared/hooks/useProjectsBuildingsFilter';
import { useScopeStore } from '@/shared/stores/fmScopeStore';
import { reconcileScope } from '../lib/reconcile-scope';

export interface ScopeValue {
  projects: FilterProject[];
  project: FilterProject | undefined;
  building: FilterBuilding | undefined;
  /**
   * Only set once it is known to belong to the rep (validated against the
   * list). BMS `Long`s as strings, so they go straight into a query param.
   */
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
  const query = useProjectsBuildingsFilter();
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
  const project = projects.find((p) => String(p.projectId) === storedProjectId);
  const building = project?.buildings.find((b) => String(b.buildingId) === storedBuildingId);

  useEffect(() => {
    const fix = reconcileScope({
      hydrated,
      loaded: query.isSuccess,
      projects,
      storedProjectId,
      storedBuildingId,
    });
    if (fix?.kind === 'setProject') setProject(fix.projectId);
    else if (fix?.kind === 'clearBuilding') setBuilding(null);
  }, [
    hydrated,
    query.isSuccess,
    projects,
    storedProjectId,
    storedBuildingId,
    setProject,
    setBuilding,
  ]);

  return {
    projects,
    project,
    building,
    projectId: project ? String(project.projectId) : undefined,
    buildingId: building ? String(building.buildingId) : undefined,
    isLoading: query.isLoading || !hydrated,
    isError: query.isError,
    refetch: () => {
      void query.refetch();
    },
    setProject,
    setBuilding,
  };
}
