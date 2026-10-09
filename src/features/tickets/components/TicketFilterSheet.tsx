import { forwardRef, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';
import { BottomSheet, Button, Chip, ChipRow, Skeleton, type BottomSheetRef } from '@/shared/ui';
import { STATUS_FILTERS } from '../lib/ticket-status';
import type { FilterProject, TicketListFilters } from '../types';

type Draft = Pick<TicketListFilters, 'status' | 'projectId' | 'buildingCode'>;

export interface TicketFilterSheetProps {
  filters: TicketListFilters;
  projects: readonly FilterProject[];
  projectsLoading: boolean;
  onApply: (next: Draft) => void;
}

const SNAP_POINTS = ['70%'];

/**
 * Status, then project, then building (shown once a project is picked; reset
 * when the project changes). Edits stay in a draft until Apply.
 * Feature-local on purpose: the shared FilterSheet belongs to T8.
 */
export const TicketFilterSheet = forwardRef<BottomSheetRef, TicketFilterSheetProps>(
  function TicketFilterSheet({ filters, projects, projectsLoading, onApply }, ref) {
    const { t } = useTranslation();
    const [draft, setDraft] = useState<Draft>(() => pick(filters));

    useEffect(() => setDraft(pick(filters)), [filters]);

    const project = projects.find((p) => p.projectId === draft.projectId);
    const dismiss = (): void => {
      if (ref && typeof ref !== 'function') ref.current?.dismiss();
    };

    return (
      <BottomSheet
        ref={ref}
        snapPoints={SNAP_POINTS}
        scrollable
        onDismiss={() => setDraft(pick(filters))}
        footer={
          <View style={styles.footer}>
            <View style={styles.footerButton}>
              <Button
                label={t('fm.tickets.reset')}
                variant="secondary"
                fullWidth
                onPress={() => setDraft({ status: 'ALL', projectId: null, buildingCode: null })}
              />
            </View>
            <View style={styles.footerButton}>
              <Button
                label={t('fm.tickets.apply')}
                fullWidth
                onPress={() => {
                  onApply(draft);
                  dismiss();
                }}
                testID="fm-tickets-filter-apply"
              />
            </View>
          </View>
        }
      >
        <Text style={styles.title} accessibilityRole="header">
          {t('fm.tickets.filter')}
        </Text>

        <Text style={styles.section}>{t('fm.tickets.statusLabel')}</Text>
        <ChipRow wrap>
          {STATUS_FILTERS.map((status) => (
            <Chip
              key={status}
              label={t(`fm.tickets.status.${status}`)}
              selected={draft.status === status}
              onPress={() => setDraft((d) => ({ ...d, status }))}
            />
          ))}
        </ChipRow>

        <Text style={styles.section}>{t('fm.tickets.project')}</Text>
        {projectsLoading ? (
          <View style={styles.loadingRow}>
            <Skeleton height={32} width={110} radius={999} />
            <Skeleton height={32} width={140} radius={999} />
          </View>
        ) : (
          <ChipRow wrap>
            <Chip
              label={t('fm.tickets.allProjects')}
              selected={draft.projectId === null}
              onPress={() => setDraft((d) => ({ ...d, projectId: null, buildingCode: null }))}
            />
            {projects.map((p) => (
              <Chip
                key={p.projectId}
                label={p.projectName}
                selected={draft.projectId === p.projectId}
                onPress={() =>
                  setDraft((d) =>
                    d.projectId === p.projectId
                      ? d
                      : { ...d, projectId: p.projectId, buildingCode: null },
                  )
                }
              />
            ))}
          </ChipRow>
        )}

        {project ? (
          <>
            <Text style={styles.section}>{t('fm.tickets.building')}</Text>
            <ChipRow wrap>
              <Chip
                label={t('fm.tickets.allBuildings')}
                selected={draft.buildingCode === null}
                onPress={() => setDraft((d) => ({ ...d, buildingCode: null }))}
              />
              {project.buildings.map((b) => (
                <Chip
                  key={b.buildingCode}
                  label={b.buildingName}
                  selected={draft.buildingCode === b.buildingCode}
                  onPress={() => setDraft((d) => ({ ...d, buildingCode: b.buildingCode }))}
                />
              ))}
            </ChipRow>
          </>
        ) : null}
      </BottomSheet>
    );
  },
);

function pick(f: TicketListFilters): Draft {
  return { status: f.status, projectId: f.projectId, buildingCode: f.buildingCode };
}

const styles = StyleSheet.create((theme) => ({
  title: {
    fontSize: theme.type.heading.md.size,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[8],
  },
  section: {
    fontSize: theme.type.label.lg.size,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: theme.spacing[16],
    marginBottom: theme.spacing[8],
  },
  loadingRow: { flexDirection: 'row', gap: theme.spacing[8] },
  footer: { flexDirection: 'row', gap: theme.spacing[12] },
  footerButton: { flex: 1 },
}));
