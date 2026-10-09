import { useCallback, useMemo, type ReactElement, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  View,
  type ListRenderItem,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { type useAnimatedScrollHandler } from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

export interface PagedListProps<T> {
  data: readonly T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T, index: number) => string;
  /** True while the initial load is in flight — renders `skeleton` in place
   *  of the list. */
  loading: boolean;
  /** Loading placeholder, including its own wrapper/layout view. */
  skeleton: ReactNode;
  /** Contents of the FlatList's empty slot. Memoize at the call site so the
   *  list doesn't receive a freshly allocated element every parent render. */
  empty: ReactElement;
  refreshing: boolean;
  onRefresh: () => void;
  /** Base content-container style. When the list is empty PagedList appends
   *  the flexGrow/center switch so the empty state sits mid-screen. */
  contentContainerStyle?: StyleProp<ViewStyle> | undefined;
  /** Animated scroll handler from the tab-bar-hide context. Omit for lists
   *  rendered outside the tab shell — the scroll props are left off entirely
   *  in that case, exactly like the hand-rolled lists did. */
  scrollHandler?: ReturnType<typeof useAnimatedScrollHandler> | undefined;
  /** Infinite scroll. When `fetchNextPage` is present the list wires up a
   *  guarded onEndReached (threshold 0.4) plus a footer spinner while the
   *  next page loads; omit all three for non-paginated lists. */
  fetchNextPage?: (() => void) | undefined;
  hasNextPage?: boolean | undefined;
  isFetchingNextPage?: boolean | undefined;
  /** @default 6 */
  initialNumToRender?: number | undefined;
  /** @default 6 */
  maxToRenderPerBatch?: number | undefined;
  numColumns?: number | undefined;
  columnWrapperStyle?: StyleProp<ViewStyle> | undefined;
}

/**
 * Shared FlatList plumbing for the app's paged/refreshable lists: animated
 * scroll (tab-bar hide), pull-to-refresh, guarded infinite scroll with a
 * footer spinner, skeleton + empty slots, and the common perf config
 * (windowSize 7, removeClippedSubviews). Hosts keep their filter rows,
 * sheets, and item components — only the list plumbing lives here.
 */
export function PagedList<T>({
  data,
  renderItem,
  keyExtractor,
  loading,
  skeleton,
  empty,
  refreshing,
  onRefresh,
  contentContainerStyle,
  scrollHandler,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  initialNumToRender = 6,
  maxToRenderPerBatch = 6,
  numColumns,
  columnWrapperStyle,
}: PagedListProps<T>): ReactElement {
  // One animated wrapper per mounted list, typed to the host's item type —
  // replaces the module-level `Animated.createAnimatedComponent(FlatList<X>)`
  // each host used to declare.
  const AnimatedFlatList = useMemo(() => Animated.createAnimatedComponent(FlatList<T>), []);

  const isEmpty = data.length === 0;
  const containerStyle = useMemo(
    () => [contentContainerStyle, isEmpty && styles.emptyContent],
    [contentContainerStyle, isEmpty],
  );

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage?.();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const footer = useMemo(
    () =>
      isFetchingNextPage ? (
        <View style={styles.footerLoader}>
          <ActivityIndicator />
        </View>
      ) : null,
    [isFetchingNextPage],
  );

  if (loading) return <>{skeleton}</>;

  return (
    <AnimatedFlatList
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={containerStyle}
      initialNumToRender={initialNumToRender}
      windowSize={7}
      maxToRenderPerBatch={maxToRenderPerBatch}
      removeClippedSubviews
      numColumns={numColumns}
      columnWrapperStyle={columnWrapperStyle}
      {...(scrollHandler ? { onScroll: scrollHandler, scrollEventThrottle: 16 } : {})}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      {...(fetchNextPage
        ? { onEndReached, onEndReachedThreshold: 0.4, ListFooterComponent: footer }
        : {})}
      ListEmptyComponent={empty}
    />
  );
}

const styles = StyleSheet.create((theme) => ({
  // flexGrow so the EmptyState centers vertically in the viewport even
  // though the list has no rows to size the content container.
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  footerLoader: {
    paddingVertical: theme.spacing[24],
  },
}));
