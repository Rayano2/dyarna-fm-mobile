import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Badge, Icons, type BadgeSize } from '@/shared/ui';
import { bookingStatusColorKey, bookingStatusIcon, bookingStatusLabel } from '../lib/booking-meta';

export interface BookingStatusBadgeProps {
  status: string | undefined;
  size?: BadgeSize;
}

/** Copied from dyarna-rn `BookingStatusBadge`: colour + icon + label, never colour alone. */
export function BookingStatusBadge({ status, size = 'sm' }: BookingStatusBadgeProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const StatusIcon = Icons[bookingStatusIcon(status)];
  return (
    <Badge
      label={bookingStatusLabel(status, t)}
      size={size}
      backgroundColor={theme.colors[bookingStatusColorKey(status)]}
      textStyle={styles.label}
      icon={<StatusIcon size={12} color={theme.colors.textOnPrimary} weight="fill" />}
    />
  );
}

const styles = StyleSheet.create((theme) => ({
  label: { color: theme.colors.textOnPrimary },
}));
