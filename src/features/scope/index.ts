// Public API of the scope feature: the persisted, required project (+ optional
// building) the FM community screens query by. Options, filter sheet and copy
// are the shared T8 ones (`useProjectsBuildingsFilter`, `FilterSheet`, `fm.filters.*`).
export {
  ProjectBuildingScope,
  type ProjectBuildingScopeProps,
} from './components/ProjectBuildingScope';
export {
  ActionSheet,
  type ActionSheetAction,
  type ActionSheetProps,
} from './components/ActionSheet';
export { ScopeGate, type ScopeGateProps } from './components/ScopeGate';
export { FieldLabel, type FieldLabelProps } from './components/FormField';
export { zodFormResolver, firstIssues } from './lib/zod-resolver';
export { confirmAction, type ConfirmOptions } from './lib/confirm';
export { useScope, type ScopeValue } from './hooks/useScope';
export { useScopeStore } from '@/shared/stores/fmScopeStore';
