// Public API of the scope feature (project/building picker for the FM community screens).
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
export { useScopeProjects } from './hooks/useScopeProjects';
export { useScopeStore } from './stores/scopeStore';
export {
  getScopeProjects,
  toScopeProjects,
  type ScopeBuilding,
  type ScopeProject,
} from './api/projects-buildings';
