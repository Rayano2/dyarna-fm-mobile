import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Skeleton } from '@/shared/ui';

/** Loading placeholder row. Ported from dyarna-rn `features/tickets/components/TicketRowSkeleton.tsx`. */
export function TicketRowSkeleton(): React.JSX.Element {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonTopRow}>
        <Skeleton height={20} width={64} />
        <Skeleton height={20} width={80} radius={999} />
      </View>
      <Skeleton height={18} width="80%" />
      <Skeleton height={14} width="60%" />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  skeletonCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderHairline,
    padding: theme.spacing[16],
    gap: theme.spacing[8],
  },
  skeletonTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
}));
