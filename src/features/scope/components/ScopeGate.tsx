import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';
import { EmptyState, Loader } from '@/shared/ui';
import type { ScopeValue } from '../hooks/useScope';

export interface ScopeGateProps {
  scope: ScopeValue;
  /** Rendered only once a project is selected. */
  children: React.ReactNode;
}

/**
 * The states a community screen shows before it has a project to query:
 * projects loading, projects failed (retry), and "Select a project".
 */
export function ScopeGate({ scope, children }: ScopeGateProps) {
  const { t } = useTranslation();
  if (scope.projectId) return <>{children}</>;

  let body: React.ReactNode;
  if (scope.isLoading) {
    body = <Loader />;
  } else if (scope.isError) {
    body = (
      <EmptyState
        title={t('common.error')}
        cta={{ label: t('common.retry'), onPress: scope.refetch }}
      />
    );
  } else {
    body = (
      <EmptyState
        title={t('fm.facilities.selectProject')}
        body={t('fm.facilities.picker.selectProjectBody')}
      />
    );
  }
  return <View style={styles.center}>{body}</View>;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
});
