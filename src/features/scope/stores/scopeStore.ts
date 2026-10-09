import { create } from 'zustand';
import { prefStorage } from '@/shared/lib/storage';
import { logger } from '@/shared/lib/logger';

const STORAGE_KEY = 'dyarna.fm.scope.v1';

interface ScopeSnapshot {
  projectId: string | null;
  buildingId: string | null;
}

interface ScopeState extends ScopeSnapshot {
  hydrated: boolean;
  hydrate(): Promise<void>;
  /** Picking a project always clears the building: buildings belong to one project. */
  setProject(projectId: string | null): void;
  setBuilding(buildingId: string | null): void;
}

function persist(snapshot: ScopeSnapshot): void {
  prefStorage.setJSON(STORAGE_KEY, snapshot).catch((error: unknown) => {
    logger.warn('Failed to persist FM scope', error);
  });
}

/**
 * The last project/building the rep picked, shared by Announcements,
 * Facilities, Bookings and Building info so switching screens keeps the scope.
 * Stored ids are re-validated against the rep's project list on every screen
 * (`ProjectBuildingScope`), so a stale id from another account is dropped.
 */
export const useScopeStore = create<ScopeState>((set, get) => ({
  projectId: null,
  buildingId: null,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const stored = await prefStorage.getJSON<Partial<ScopeSnapshot>>(STORAGE_KEY);
      // A pick made before hydration finished wins over the stored value.
      if (get().hydrated) return;
      set({
        projectId: get().projectId ?? stored?.projectId ?? null,
        buildingId: get().projectId ? get().buildingId : (stored?.buildingId ?? null),
        hydrated: true,
      });
    } catch (error) {
      logger.warn('Failed to hydrate FM scope', error);
      set({ hydrated: true });
    }
  },

  setProject: (projectId) => {
    if (get().projectId === projectId) return;
    set({ projectId, buildingId: null, hydrated: true });
    persist({ projectId, buildingId: null });
  },

  setBuilding: (buildingId) => {
    set({ buildingId, hydrated: true });
    persist({ projectId: get().projectId, buildingId });
  },
}));
