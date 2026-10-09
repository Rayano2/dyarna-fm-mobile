import { forwardRef, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';
import {
  BottomSheet,
  Button,
  Chip,
  ChipRow,
  SegmentedPill,
  type BottomSheetRef,
} from '@/shared/ui';
import type { SortDirection, TicketSortField } from '../types';

const SORT_FIELDS: readonly { field: TicketSortField; key: string }[] = [
  { field: 'createdAt', key: 'createdAt' },
  { field: 'categoryCode', key: 'category' },
  { field: 'priorityCode', key: 'priority' },
  { field: 'statusCode', key: 'status' },
  { field: 'responseDueAt', key: 'sla' },
];

const SNAP_POINTS = ['50%'];

export interface TicketSortSheetProps {
  field: TicketSortField;
  dir: SortDirection;
  onApply: (field: TicketSortField, dir: SortDirection) => void;
}

/** Sort column + direction (the web's options). Default createdAt desc. */
export const TicketSortSheet = forwardRef<BottomSheetRef, TicketSortSheetProps>(
  function TicketSortSheet({ field, dir, onApply }, ref) {
    const { t } = useTranslation();
    const [draftField, setDraftField] = useState(field);
    const [draftDir, setDraftDir] = useState(dir);

    useEffect(() => {
      setDraftField(field);
      setDraftDir(dir);
    }, [field, dir]);

    return (
      <BottomSheet
        ref={ref}
        snapPoints={SNAP_POINTS}
        onDismiss={() => {
          setDraftField(field);
          setDraftDir(dir);
        }}
        footer={
          <Button
            label={t('fm.tickets.apply')}
            fullWidth
            onPress={() => {
              onApply(draftField, draftDir);
              if (ref && typeof ref !== 'function') ref.current?.dismiss();
            }}
          />
        }
      >
        <Text style={styles.title} accessibilityRole="header">
          {t('fm.tickets.sort.title')}
        </Text>
        <ChipRow wrap>
          {SORT_FIELDS.map((s) => (
            <Chip
              key={s.field}
              label={t(`fm.tickets.sort.${s.key}`)}
              selected={draftField === s.field}
              onPress={() => setDraftField(s.field)}
            />
          ))}
        </ChipRow>
        <View style={styles.dir} accessibilityLabel={t('fm.tickets.a11y.sortDirection')}>
          <SegmentedPill<SortDirection>
            fullWidth
            value={draftDir}
            onChange={setDraftDir}
            options={[
              { value: 'desc', label: t('fm.tickets.sort.desc') },
              { value: 'asc', label: t('fm.tickets.sort.asc') },
            ]}
          />
        </View>
      </BottomSheet>
    );
  },
);

const styles = StyleSheet.create((theme) => ({
  title: {
    fontSize: theme.type.heading.md.size,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[12],
  },
  dir: { marginTop: theme.spacing[16] },
}));
