// Ported from dyarna-rn `features/tickets/components/TicketDetail/LoadingSkeleton.tsx`.
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Skeleton } from '@/shared/ui';

export function LoadingSkeleton(): React.JSX.Element {
  return (
    <View style={styles.skeletonColumn}>
      <View style={styles.skeletonPills}>
        <Skeleton height={22} width={70} radius={999} />
        <Skeleton height={22} width={90} radius={999} />
      </View>
      <Skeleton height={28} width="80%" />
      <Skeleton height={14} width="60%" />
      <Skeleton height={16} width="100%" />
      <Skeleton height={16} width="90%" />
      <View style={styles.skeletonCardGap} />
      <Skeleton height={220} radius={16} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonColumn: { gap: 12 },
  skeletonPills: {
    flexDirection: 'row',
    gap: 6,
  },
  skeletonCardGap: { height: 8 },
});
