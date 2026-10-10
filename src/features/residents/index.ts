export { ResidentsScreen } from './components/ResidentsScreen';
export { ResidentDetailScreen } from './components/ResidentDetailScreen';
// Reused by payment reminders (T12): the same residents list, search and stat tile.
export { ResidentStat } from './components/ResidentStat';
export { useResidents } from './hooks/useResidents';
export { filterResidentsBySearch } from './lib/residents-logic';
export type { Resident } from './api/mappers';
