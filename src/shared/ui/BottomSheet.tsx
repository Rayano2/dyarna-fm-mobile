import { forwardRef, useCallback, useMemo } from 'react';
import { View } from 'react-native';
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';

export interface BottomSheetProps {
  children: React.ReactNode;
  snapPoints?: (number | string)[];
  onDismiss?: () => void;
  /**
   * When true, wraps children in BottomSheetScrollView (gesture-coordinated
   * with the sheet). Use for content taller than the sheet's snap height —
   * a plain ScrollView inside BottomSheetView will fight the sheet's pan
   * gesture and feel broken.
   */
  scrollable?: boolean;
  /**
   * Optional node pinned above the sheet's bottom edge. Rendered via
   * gorhom's BottomSheetFooter wrapper, which keeps it flush with the
   * sheet regardless of the current snap point.
   */
  footer?: React.ReactNode;
  /**
   * Forwarded from gorhom's BottomSheetModal. Fires with the active snap
   * index on every settle: `-1` when fully dismissed, `>= 0` when open at a
   * snap point. Hosts use this to arm/tear down per-open resources (e.g. a
   * live camera) without depending on gorhom's content-unmount timing.
   */
  onChange?: (index: number) => void;
  /**
   * Optional node pinned to the TOP of the sheet, above the scroll area, so
   * it stays put while the body scrolls (the mirror of `footer`). For a head
   * that is part of the interaction — an ask box the resident must still see
   * while the body below it changes state.
   *
   * Purely additive: omit it and the sheet renders exactly the tree it
   * rendered before, so no existing host changes shape.
   */
  header?: React.ReactNode;
}

/**
 * The ref's public API: `.present()` to open, `.dismiss()` to close.
 * Backed by gorhom's BottomSheetModal, which portals above the rest of
 * the navigation tree — so it overlays the bottom tab bar correctly.
 */
export type BottomSheetRef = BottomSheetModal;

export const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(function BottomSheet(
  { children, snapPoints, onDismiss, scrollable = false, footer, header, onChange },
  ref,
) {
  const points = useMemo(() => snapPoints ?? ['40%', '80%'], [snapPoints]);
  const insets = useSafeAreaInsets();
  const footerBottomPad = Math.max(insets.bottom, 12);
  // Reserve room in the scroll area so the last item isn't hidden behind the
  // pinned footer. ~72 for button height + its top padding + safe-area pad.
  const scrollPad = footer ? 72 + footerBottomPad + 12 : 0;

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) =>
      footer ? (
        <BottomSheetFooter {...props} bottomInset={0}>
          <View style={[styles.footerSlot, { paddingBottom: footerBottomPad }]}>{footer}</View>
        </BottomSheetFooter>
      ) : null,
    [footer, footerBottomPad],
  );

  const body = scrollable ? (
    <BottomSheetScrollView
      {...(header ? { style: styles.fill } : {})}
      contentContainerStyle={[styles.content, scrollPad ? { paddingBottom: scrollPad } : null]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </BottomSheetScrollView>
  ) : (
    // Reserve the same footer-clearance padding as the scrollable variant
    // so a pinned footer (e.g. the Submit button) can't crop the bottom
    // of the body. Without this the textarea / form fields end up
    // behind the footer when the keyboard rises.
    <BottomSheetView style={[styles.content, scrollPad ? { paddingBottom: scrollPad } : null]}>
      {children}
    </BottomSheetView>
  );

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={points}
      {...(onDismiss ? { onDismiss } : {})}
      {...(onChange ? { onChange } : {})}
      enablePanDownToClose
      // Track the keyboard so a focused input always stays above it. Without
      // these the sheet sits at its snap point while the keyboard slides up
      // over the content, hiding whatever the user is typing into.
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
      backdropComponent={renderBackdrop}
      // A header lives OUTSIDE the scrollable, so gorhom's content-derived
      // detent (enableDynamicSizing, ON by default in v5) measures the body
      // alone and silently replaces index 0 — the sheet would open short and
      // resize every time the body changes state. Explicit snapPoints only.
      {...(header ? { enableDynamicSizing: false } : {})}
      {...(footer ? { footerComponent: renderFooter } : {})}
    >
      {/* A header must sit OUTSIDE the scrollable, so the two share a flex
          column that fills the sheet. With no header the body is returned
          bare — the exact tree every existing host already renders. */}
      {header ? (
        <View style={styles.headerHost}>
          {header}
          {body}
        </View>
      ) : (
        body
      )}
    </BottomSheetModal>
  );
});

// Module-level so every host of a BottomSheet shares one stable
// reference — without this the inline arrow rebuilds each parent render
// and Gorhom remounts the backdrop component, which adds work to every
// nearby state change even when the sheet is closed.
function renderBackdrop(props: BottomSheetBackdropProps) {
  return <BottomSheetBackdrop {...props} opacity={0.4} appearsOnIndex={0} disappearsOnIndex={-1} />;
}

const styles = StyleSheet.create((theme) => ({
  background: {
    backgroundColor: theme.colors.surfaceElevated,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
  },
  handle: {
    backgroundColor: theme.colors.borderStrong,
    width: 40,
  },
  content: {
    paddingHorizontal: theme.spacing[24],
    paddingVertical: theme.spacing[24],
  },
  // Only used when a `header` is supplied: a column that fills the sheet so
  // the head keeps its intrinsic height and the body takes the rest.
  headerHost: { flex: 1 },
  fill: { flex: 1 },
  footerSlot: {
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: theme.spacing[24],
    paddingTop: theme.spacing[12],
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderHairline,
  },
}));
