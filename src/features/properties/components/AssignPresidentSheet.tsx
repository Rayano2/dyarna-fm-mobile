import { forwardRef, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';
import { useToastStore } from '@/shared/stores/toastStore';
import {
  BottomSheet,
  Button,
  EmptyState,
  OptionRow,
  SearchBar,
  showApiErrorToast,
  Skeleton,
  useRtlTextStyle,
  type BottomSheetRef,
} from '@/shared/ui';
import type { PropertyProject } from '../api/mappers';
import { useAssignPresident, useProjectUsers } from '../hooks/useProperties';
import { searchUsers } from '../lib/occupancy';

export interface AssignPresidentSheetProps {
  /** The project being edited; null while the sheet is closed. */
  project: PropertyProject | null;
  onDismiss: () => void;
}

type Step = 'pick' | 'confirm';

export const AssignPresidentSheet = forwardRef<BottomSheetRef, AssignPresidentSheetProps>(
  function AssignPresidentSheet({ project, onDismiss }, ref) {
    const { t } = useTranslation();
    const rtlText = useRtlTextStyle();
    const push = useToastStore((s) => s.push);
    const [step, setStep] = useState<Step>('pick');
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const users = useProjectUsers(project?.projectId, project !== null);
    const assign = useAssignPresident();

    const list = useMemo(() => users.data ?? [], [users.data]);
    const visible = useMemo(() => searchUsers(list, search), [list, search]);
    // A refetch can drop the chosen user; the selection must not outlive it.
    const selected = list.find((u) => u.userId === selectedId) ?? null;

    const dismiss = (): void => {
      if (ref && typeof ref !== 'function') ref.current?.dismiss();
    };

    const onConfirm = (): void => {
      if (!project || !selected) return;
      assign.mutate(
        { projectId: project.projectId, residentUserId: selected.userId },
        {
          onSuccess: () => {
            push({ variant: 'success', title: t('fm.properties.presidentAssigned') });
            dismiss();
          },
          onError: (error) =>
            showApiErrorToast(push, error, t, {
              fallbackTitle: t('fm.properties.presidentAssignFailed'),
            }),
        },
      );
    };

    const footer =
      step === 'pick' ? (
        <View style={styles.footer}>
          <View style={styles.footerButton}>
            <Button label={t('common.cancel')} variant="ghost" fullWidth onPress={dismiss} />
          </View>
          <View style={styles.footerButton}>
            <Button
              label={t('fm.properties.continue')}
              fullWidth
              disabled={!selected}
              onPress={() => setStep('confirm')}
              testID="assign-president-continue"
            />
          </View>
        </View>
      ) : (
        <View style={styles.footer}>
          <View style={styles.footerButton}>
            <Button
              label={t('common.back')}
              variant="ghost"
              fullWidth
              disabled={assign.isPending}
              onPress={() => setStep('pick')}
            />
          </View>
          <View style={styles.footerButton}>
            <Button
              label={t('fm.properties.assignPresident')}
              fullWidth
              loading={assign.isPending}
              disabled={assign.isPending || !selected}
              onPress={onConfirm}
              testID="assign-president-confirm"
            />
          </View>
        </View>
      );

    const renderUsers = (): React.ReactNode => {
      if (users.isLoading) {
        return (
          <View style={styles.list}>
            <Skeleton height={44} radius={12} />
            <Skeleton height={44} radius={12} />
            <Skeleton height={44} radius={12} />
          </View>
        );
      }
      if (users.isError) {
        return (
          <View style={styles.error} accessibilityLiveRegion="polite">
            <Text style={[styles.hint, rtlText]}>{t('fm.properties.loadUsersFailed')}</Text>
            <Button
              label={t('common.retry')}
              variant="secondary"
              size="sm"
              hitSlop={4}
              onPress={() => void users.refetch()}
            />
          </View>
        );
      }
      if (list.length === 0) return <EmptyState title={t('fm.properties.noProjectUsers')} />;
      if (visible.length === 0) {
        return <Text style={[styles.hint, rtlText]}>{t('fm.properties.noUsers')}</Text>;
      }
      return (
        <View
          style={styles.list}
          accessibilityRole="radiogroup"
          accessibilityLabel={t('fm.properties.assignPresidentTitle')}
        >
          {visible.map((user) => (
            <OptionRow
              key={user.userId}
              label={user.fullName}
              selected={selected?.userId === user.userId}
              onPress={() => setSelectedId(user.userId)}
            />
          ))}
        </View>
      );
    };

    return (
      <BottomSheet
        ref={ref}
        snapPoints={['80%']}
        scrollable
        footer={footer}
        onDismiss={() => {
          setStep('pick');
          setSearch('');
          setSelectedId(null);
          assign.reset();
          onDismiss();
        }}
      >
        <Text style={[styles.title, rtlText]} accessibilityRole="header">
          {t('fm.properties.assignPresidentTitle')}
        </Text>
        {project ? <Text style={[styles.description, rtlText]}>{project.projectName}</Text> : null}
        {step === 'pick' ? (
          <View style={styles.body}>
            <SearchBar
              value={search}
              onChangeText={setSearch}
              placeholder={t('fm.properties.searchUsers')}
              clearLabel={t('common.clear')}
            />
            {renderUsers()}
          </View>
        ) : (
          <View style={styles.body} accessibilityLiveRegion="polite">
            <Text style={[styles.confirm, rtlText]}>
              {t('fm.properties.assignPresidentConfirm', { name: selected?.fullName ?? '' })}
            </Text>
          </View>
        )}
      </BottomSheet>
    );
  },
);

const styles = StyleSheet.create((theme) => ({
  title: {
    fontSize: theme.type.heading.md.size,
    lineHeight: theme.type.heading.md.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  description: {
    fontSize: theme.type.body.sm.size,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing[4],
  },
  body: { marginTop: theme.spacing[16], gap: theme.spacing[12] },
  list: { gap: theme.spacing[6] },
  error: { gap: theme.spacing[8], alignItems: 'flex-start' },
  hint: { fontSize: theme.type.body.sm.size, color: theme.colors.textMuted },
  confirm: {
    fontSize: theme.type.body.md.size,
    lineHeight: theme.type.body.md.lineHeight,
    color: theme.colors.textPrimary,
  },
  footer: { flexDirection: 'row', gap: theme.spacing[12] },
  footerButton: { flex: 1 },
}));
