import { create } from 'zustand';
import type { TicketListFilters, TicketSortField, SortDirection } from '../types';

export const DEFAULT_TICKET_FILTERS: TicketListFilters = {
  status: 'ALL',
  projectId: null,
  buildingCode: null,
  ticketNo: '',
  sortField: 'createdAt',
  sortDir: 'desc',
};

interface TicketFiltersState {
  filters: TicketListFilters;
  /** Applies the filter sheet. A project change always resets the building. */
  applyFilters(next: Pick<TicketListFilters, 'status' | 'projectId' | 'buildingCode'>): void;
  setSort(field: TicketSortField, dir: SortDirection): void;
  setTicketNo(ticketNo: string): void;
  clearStatus(): void;
  clearProject(): void;
  clearBuilding(): void;
  /** Clears status, project, building and search. Sort is kept. */
  clearAll(): void;
}

export const useTicketFiltersStore = create<TicketFiltersState>((set) => ({
  filters: DEFAULT_TICKET_FILTERS,
  applyFilters: (next) =>
    set((s) => ({
      filters: {
        ...s.filters,
        status: next.status,
        projectId: next.projectId,
        buildingCode: next.projectId === null ? null : next.buildingCode,
      },
    })),
  setSort: (sortField, sortDir) => set((s) => ({ filters: { ...s.filters, sortField, sortDir } })),
  setTicketNo: (ticketNo) => set((s) => ({ filters: { ...s.filters, ticketNo: ticketNo.trim() } })),
  clearStatus: () => set((s) => ({ filters: { ...s.filters, status: 'ALL' } })),
  clearProject: () =>
    set((s) => ({ filters: { ...s.filters, projectId: null, buildingCode: null } })),
  clearBuilding: () => set((s) => ({ filters: { ...s.filters, buildingCode: null } })),
  clearAll: () =>
    set((s) => ({
      filters: {
        ...DEFAULT_TICKET_FILTERS,
        sortField: s.filters.sortField,
        sortDir: s.filters.sortDir,
      },
    })),
}));

/** Count of active filters for the Filter button badge (search is shown separately). */
export function activeFilterCount(f: TicketListFilters): number {
  let n = 0;
  if (f.status !== 'ALL') n++;
  if (f.projectId !== null) n++;
  if (f.buildingCode) n++;
  return n;
}

export function hasAnyFilter(f: TicketListFilters): boolean {
  return activeFilterCount(f) > 0 || f.ticketNo.length > 0;
}
