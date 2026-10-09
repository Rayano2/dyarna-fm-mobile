import { memo } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Avatar, Badge, Card, HapticPressable, Icons, RTL_INLINE, useIsRtl } from '@/shared/ui';
import type { Resident } from '../api/mappers';

export interface ResidentRowProps {
  resident: Resident;
  onPress: (resident: Resident) => void;
}

export const ResidentRow = memo(function ResidentRow({
  resident,
  onPress,
}: ResidentRowProps): React.JSX.Element {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const isRtl = useIsRtl();
  const Chevron = isRtl ? Icons.CaretLeft : Icons.CaretRight;
  const unit = resident.unitNumber ?? '-';

  return (
    <HapticPressable
      onPress={() => onPress(resident)}
      accessibilityRole="button"
      accessibilityLabel={[
        resident.fullName,
        resident.buildingName,
        `${t('fm.residents.unit')} ${unit}`,
      ]
        .filter(Boolean)
        .join(', ')}
    >
      <Card style={styles.card}>
        <Avatar name={resident.fullName} size={40} />
        <View style={styles.body}>
          <Text style={[styles.name, isRtl ? RTL_INLINE : null]} numberOfLines={1}>
            {resident.fullName || '-'}
          </Text>
          {resident.mobile ? (
            <Text style={styles.mobile} numberOfLines={1}>
              {resident.mobile}
            </Text>
          ) : null}
          {resident.buildingName ? (
            <Text style={[styles.meta, isRtl ? RTL_INLINE : null]} numberOfLines={1}>
              {resident.buildingName}
            </Text>
          ) : null}
        </View>
        <Badge
          size="sm"
          tone="neutral"
          label={unit}
          icon={<Icons.Door size={12} color={theme.colors.textSecondary} weight="bold" />}
          textStyle={styles.ltr}
        />
        <Chevron size={16} color={theme.colors.textMuted} weight="regular" />
      </Card>
    </HapticPressable>
  );
});

const styles = StyleSheet.create((theme) => ({
  card: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[12], minHeight: 64 },
  body: { flex: 1, gap: theme.spacing[2] },
  name: { fontSize: theme.type.body.md.size, fontWeight: '600', color: theme.colors.textPrimary },
  mobile: {
    fontSize: theme.type.body.sm.size,
    color: theme.colors.textSecondary,
    writingDirection: 'ltr',
    alignSelf: 'flex-start',
  },
  meta: { fontSize: theme.type.body.sm.size, color: theme.colors.textMuted },
  ltr: { writingDirection: 'ltr' },
}));
