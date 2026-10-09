import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet as RNStyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import type { ImageErrorEventData, ImageLoadEventData } from 'expo-image';
import { CachedImage } from './CachedImage';
import { HapticPressable } from './HapticPressable';
import { Warning, X } from './icons';
import {
  MIN_SCALE,
  clampIndex,
  clampScale,
  clampTranslation,
  counterValues,
  isZoomed,
  nextDoubleTapScale,
  pageIndexFromOffset,
  scrimOpacity,
  shouldDismiss,
} from './image-viewer-math';

/**
 * Full-screen photo lightbox.
 *
 * Follows `DatePickerModal`'s "RN `Modal` as a shared primitive" shape: the
 * host owns the open/closed state, `visible === false` renders nothing at all,
 * and closing is always an explicit `onClose` the host controls.
 *
 * It diverges from `DatePickerModal` on ONE point: labels are resolved with
 * `useTranslation()` inside instead of being passed in. The picker takes a
 * single "Done"; this takes eight strings, two of them interpolated
 * ("Image 3 of 7"), and every call site would pass the identical set.
 */
export interface ImageViewerProps {
  /** Host-controlled. While false the component renders nothing — no Modal, no
   *  state, no gesture handlers. */
  visible: boolean;
  /** Absolute image URLs, in display order. An empty array renders nothing. */
  images: string[];
  /** Page to open on. Clamped, so a stale index cannot open a blank page. */
  initialIndex: number;
  onClose: () => void;
  /**
   * Refetch the PARENT query, not the image.
   *
   * Every surface that opens this viewer shows presigned S3 URLs (community
   * posts, marketplace listings, TMS ticket attachments), so the realistic
   * failure is an expired link. Re-rendering or re-requesting the same URL
   * just 404s again — only a round trip to the owning endpoint mints a fresh
   * signature. Omit this prop for public/CDN URLs; the viewer then shows the
   * error message without a dead button.
   */
  onRetry?: () => void;
}

export function ImageViewer({ visible, images, initialIndex, onClose, onRetry }: ImageViewerProps) {
  // Guard BEFORE any hook, so the whole viewer (state, shared values, gesture
  // handlers, one mounted Image per page) exists only while it is on screen —
  // and so re-opening always starts from `initialIndex` rather than wherever
  // the user left the previous session.
  if (!visible) return null;
  if (images.length === 0) return null;
  return (
    <ImageViewerContent
      images={images}
      initialIndex={initialIndex}
      onClose={onClose}
      {...(onRetry ? { onRetry } : {})}
    />
  );
}

function ImageViewerContent({
  images,
  initialIndex,
  onClose,
  onRetry,
}: Omit<ImageViewerProps, 'visible'>) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const startIndex = clampIndex(initialIndex, images.length);
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  // Mirrored out of the UI thread by the active page (see ZoomableImage's
  // useAnimatedReaction). This single flag decides who owns horizontal
  // movement: at rest the FlatList pages, zoomed the image pans.
  const [zoomed, setZoomed] = useState(false);
  const [chromeRequested, setChromeRequested] = useState(true);

  // Vertical drag-to-dismiss offset. Lives here rather than in the page so the
  // scrim (a sibling of the list) can fade with it.
  const dragY = useSharedValue(0);
  const chrome = useSharedValue(1);

  const chromeShown = chromeRequested && !zoomed;

  useEffect(() => {
    chrome.value = withTiming(chromeShown ? 1 : 0, { duration: 180 });
  }, [chromeShown, chrome]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrimOpacity(dragY.value) }));
  const pagerStyle = useAnimatedStyle(() => ({ transform: [{ translateY: dragY.value }] }));
  const chromeStyle = useAnimatedStyle(() => ({ opacity: chrome.value }));

  const toggleChrome = useCallback(() => setChromeRequested((v) => !v), []);

  const handleMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      setCurrentIndex(pageIndexFromOffset(e.nativeEvent.contentOffset.x, width, images.length));
    },
    [width, images.length],
  );

  const counter = counterValues(currentIndex, images.length);

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      // Android hardware back. Without it the viewer traps the user on a photo
      // with only the close button as a way out.
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape']}
    >
      {/* A Modal is a separate native window on Android, outside the app-root
          GestureHandlerRootView (app/_layout.tsx) — context crosses that boundary,
          native touch interception does not. Without this every gesture below is inert. */}
      <GestureHandlerRootView style={styles.gestureRoot}>
        <View
          style={styles.root}
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
          testID="image-viewer"
        >
          <Animated.View style={[styles.scrim, scrimStyle]} pointerEvents="none" />

          <Animated.View style={[styles.pager, pagerStyle]}>
            <FlatList
              data={images}
              keyExtractor={(uri, i) => `${uri}-${i}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={startIndex}
              // Constant page width — every cell is exactly the screen. Lets the
              // list jump straight to `initialScrollIndex` without measuring.
              getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
              windowSize={3}
              scrollEnabled={!zoomed}
              onMomentumScrollEnd={handleMomentumScrollEnd}
              // Cells are memoized; without this neither the active page nor the
              // zoom lock would reach them.
              extraData={`${currentIndex}:${zoomed}`}
              renderItem={({ item, index }) => (
                <ZoomableImage
                  uri={item}
                  index={index}
                  total={images.length}
                  isActive={index === currentIndex}
                  isZoomLocked={zoomed}
                  width={width}
                  height={height}
                  dragY={dragY}
                  onZoomChange={setZoomed}
                  onSingleTap={toggleChrome}
                  onClose={onClose}
                  {...(onRetry ? { onRetry } : {})}
                />
              )}
            />
          </Animated.View>

          <Animated.View
            style={[styles.chrome, { paddingTop: insets.top + 8 }, chromeStyle]}
            // Faded-out chrome must never swallow a pan meant for the photo.
            pointerEvents={chromeShown ? 'box-none' : 'none'}
          >
            <HapticPressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('imageViewer.close')}
              accessibilityHint={t('imageViewer.closeHint')}
              style={styles.chromeButton}
              testID="image-viewer-close"
            >
              <X size={24} color={theme.colors.textOnScrim} />
            </HapticPressable>

            <View style={styles.counterSlot}>
              {images.length > 1 ? (
                <View style={styles.counterChip}>
                  <Text style={styles.counterText} accessibilityLiveRegion="polite">
                    {t('imageViewer.counter', counter)}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Empty twin of the close button so the counter stays optically
                centred — the same trick ScreenHeader uses for its title. */}
            <View style={styles.chromeButton} />
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

interface ZoomableImageProps {
  uri: string;
  index: number;
  total: number;
  /** The page the list has settled on. An inactive page resets its zoom. */
  isActive: boolean;
  /** True while the active page is zoomed — the viewer's mirrored zoom state. */
  isZoomLocked: boolean;
  width: number;
  height: number;
  dragY: SharedValue<number>;
  onZoomChange: (zoomed: boolean) => void;
  onSingleTap: () => void;
  onClose: () => void;
  onRetry?: () => void;
}

type LoadStatus = 'loading' | 'loaded' | 'error';

function ZoomableImage({
  uri,
  index,
  total,
  isActive,
  isZoomLocked,
  width,
  height,
  dragY,
  onZoomChange,
  onSingleTap,
  onClose,
  onRetry,
}: ZoomableImageProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const [status, setStatus] = useState<LoadStatus>('loading');

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);
  // The *rendered* size of the contain-fitted photo. Seeded with the screen and
  // narrowed on load, so the pan clamp follows the actual picture rather than
  // the letterboxed bars around it.
  const contentW = useSharedValue(width);
  const contentH = useSharedValue(height);

  const reset = useCallback(() => {
    'worklet';
    scale.value = withTiming(MIN_SCALE);
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedScale.value = MIN_SCALE;
    savedX.value = 0;
    savedY.value = 0;
  }, [scale, translateX, translateY, savedScale, savedX, savedY]);

  // Swiping away from a zoomed page must not leave it zoomed for when the user
  // swipes back to it.
  useEffect(() => {
    if (!isActive) {
      scale.value = MIN_SCALE;
      savedScale.value = MIN_SCALE;
      translateX.value = 0;
      translateY.value = 0;
      savedX.value = 0;
      savedY.value = 0;
    }
  }, [isActive, scale, savedScale, translateX, translateY, savedX, savedY]);

  // A fresh presigned URL after a retry starts a new load.
  useEffect(() => setStatus('loading'), [uri]);

  // THE BRIDGE between the UI thread and paging: `scale` only ever exists as a
  // shared value, but `scrollEnabled` and `.enabled()` are React props. Mirror
  // the zoom predicate across once per transition, not once per frame.
  useAnimatedReaction(
    () => isZoomed(scale.value),
    (next, prev) => {
      if (next !== prev && isActive) runOnJS(onZoomChange)(next);
    },
    [isActive, onZoomChange],
  );

  const gesture = useMemo(() => {
    const pinch = Gesture.Pinch()
      .onStart(() => {
        savedScale.value = scale.value;
        savedX.value = translateX.value;
        savedY.value = translateY.value;
      })
      .onUpdate((e) => {
        const next = clampScale(savedScale.value * e.scale);
        const ratio = next / savedScale.value;
        // Keep the content point under the fingers pinned: with the focal
        // measured from the centre of the page, t' = f - ratio * (f - t).
        const fx = e.focalX - width / 2;
        const fy = e.focalY - height / 2;
        scale.value = next;
        translateX.value = clampTranslation(fx - ratio * (fx - savedX.value), contentW.value, next);
        translateY.value = clampTranslation(fy - ratio * (fy - savedY.value), contentH.value, next);
      })
      .onEnd(() => {
        // Anything under 1.05 reads as "meant to go back to fit" — snap rather
        // than leave a 2% zoom that silently locks paging.
        if (scale.value < 1.05) {
          reset();
          return;
        }
        savedScale.value = scale.value;
        savedX.value = translateX.value;
        savedY.value = translateY.value;
      });

    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .maxDuration(300)
      .onEnd((e) => {
        const next = nextDoubleTapScale(scale.value);
        if (next === MIN_SCALE) {
          reset();
          return;
        }
        const ratio = next / scale.value;
        const fx = e.x - width / 2;
        const fy = e.y - height / 2;
        const nx = clampTranslation(fx - ratio * (fx - translateX.value), contentW.value, next);
        const ny = clampTranslation(fy - ratio * (fy - translateY.value), contentH.value, next);
        scale.value = withTiming(next);
        translateX.value = withTiming(nx);
        translateY.value = withTiming(ny);
        savedScale.value = next;
        savedX.value = nx;
        savedY.value = ny;
      });

    const singleTap = Gesture.Tap()
      .numberOfTaps(1)
      .onEnd(() => runOnJS(onSingleTap)());

    // Exclusive, so the chrome does not flash on the first half of a
    // double-tap zoom.
    const taps = Gesture.Exclusive(doubleTap, singleTap);

    const panZoomed = Gesture.Pan()
      .enabled(isZoomLocked)
      .onStart(() => {
        savedX.value = translateX.value;
        savedY.value = translateY.value;
      })
      .onUpdate((e) => {
        translateX.value = clampTranslation(
          savedX.value + e.translationX,
          contentW.value,
          scale.value,
        );
        translateY.value = clampTranslation(
          savedY.value + e.translationY,
          contentH.value,
          scale.value,
        );
      });

    const dragToDismiss = Gesture.Pan()
      // Only at rest: zoomed, the pan above owns dragging. Vertical intent
      // only — horizontal drift belongs to the FlatList's paging.
      .enabled(!isZoomLocked)
      .activeOffsetY([-15, 15])
      .failOffsetX([-15, 15])
      .onUpdate((e) => {
        dragY.value = e.translationY;
      })
      .onEnd((e) => {
        if (shouldDismiss(e.translationY, e.velocityY)) {
          runOnJS(onClose)();
          return;
        }
        dragY.value = withSpring(0, { damping: 20, stiffness: 200 });
      });

    return Gesture.Simultaneous(pinch, Gesture.Race(panZoomed, dragToDismiss), taps);
  }, [
    width,
    height,
    isZoomLocked,
    dragY,
    onClose,
    onSingleTap,
    reset,
    scale,
    savedScale,
    translateX,
    translateY,
    savedX,
    savedY,
    contentW,
    contentH,
  ]);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleLoad = useCallback(
    (e: ImageLoadEventData) => {
      const { width: iw, height: ih } = e.source;
      if (iw > 0 && ih > 0) {
        const fit = Math.min(width / iw, height / ih);
        contentW.value = iw * fit;
        contentH.value = ih * fit;
      }
      setStatus('loaded');
    },
    [width, height, contentW, contentH],
  );

  const handleError = useCallback((_e: ImageErrorEventData) => setStatus('error'), []);

  const pageSize = { width, height };

  return (
    <View style={[styles.page, pageSize]}>
      {/* Behind the image: a cached thumb is covered by CachedImage's own fade,
          but a full-res ticket photo leaves the page black for seconds with
          nothing to say it is working. */}
      {status === 'loading' ? (
        <View style={[styles.centerLayer, pageSize]} pointerEvents="none">
          <ActivityIndicator color={theme.colors.textOnScrim} />
        </View>
      ) : null}

      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.imageWrap, pageSize, imageStyle]}>
          <CachedImage
            source={{ uri }}
            style={pageSize}
            resizeMode="contain"
            onLoad={handleLoad}
            onError={handleError}
            accessible
            accessibilityRole="image"
            accessibilityLabel={t('imageViewer.imageA11y', { current: index + 1, total })}
            accessibilityHint={t('imageViewer.zoomHint')}
          />
        </Animated.View>
      </GestureDetector>

      {status === 'error' ? (
        // box-none: the message must not steal the drag-to-dismiss pan from the
        // detector underneath — only the retry control is interactive.
        <View style={[styles.centerLayer, pageSize]} pointerEvents="box-none">
          <View style={styles.errorBox} pointerEvents="box-none">
            {/* Icon AND text — the failure is never signalled by colour alone. */}
            <Warning size={48} color={theme.colors.textOnScrim} weight="duotone" />
            <Text style={styles.errorTitle}>{t('imageViewer.error.title')}</Text>
            <Text style={styles.errorBody}>{t('imageViewer.error.body')}</Text>
            {onRetry ? (
              <HapticPressable
                onPress={onRetry}
                accessibilityRole="button"
                style={styles.retryButton}
                testID="image-viewer-retry"
              >
                <Text style={styles.retryLabel}>{t('common.retry')}</Text>
              </HapticPressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { flex: 1 },
  gestureRoot: { flex: 1 },
  scrim: {
    ...RNStyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.scrim,
  },
  pager: { flex: 1 },
  page: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLayer: {
    position: 'absolute',
    top: 0,
    start: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Row + gap + logical padding only: in Arabic the whole bar mirrors with the
  // layout, so the close control stays on the start edge without any explicit
  // left/right anywhere.
  chrome: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[16],
    paddingBottom: theme.spacing[8],
    gap: theme.spacing[8],
  },
  chromeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterChip: {
    paddingHorizontal: theme.spacing[12],
    paddingVertical: theme.spacing[4],
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  counterText: {
    fontSize: theme.type.label.md.size,
    lineHeight: theme.type.label.md.lineHeight,
    fontWeight: '600',
    color: theme.colors.textOnScrim,
    // "3 / 7" is a numeric pair, not prose: forced LTR so Arabic does not
    // reorder the operands around the slash.
    writingDirection: 'ltr',
    textAlign: 'center',
  },
  errorBox: {
    alignItems: 'center',
    gap: theme.spacing[8],
    paddingHorizontal: theme.spacing[32],
  },
  errorTitle: {
    fontSize: theme.type.heading.md.size,
    lineHeight: theme.type.heading.md.lineHeight,
    fontWeight: '700',
    color: theme.colors.textOnScrim,
    textAlign: 'center',
  },
  errorBody: {
    fontSize: theme.type.body.md.size,
    lineHeight: theme.type.body.md.lineHeight,
    color: theme.colors.textOnScrim,
    opacity: 0.8,
    textAlign: 'center',
  },
  // Ghost-button geometry lifted from `Button` (pill, uppercase label.lg,
  // 24/12 padding). Deliberately NOT the shared Button: its ghost label is
  // `textPrimary`, which in the light theme is near-black ink and therefore
  // invisible on a 92%-black scrim. Same reason `textOnScrim` exists at all.
  retryButton: {
    marginTop: theme.spacing[8],
    alignSelf: 'center',
    minHeight: 44,
    paddingHorizontal: theme.spacing[24],
    paddingVertical: theme.spacing[12],
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.textOnScrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryLabel: {
    fontSize: theme.type.label.lg.size,
    lineHeight: theme.type.label.lg.lineHeight,
    fontWeight: '600',
    letterSpacing: theme.type.label.lg.size * theme.type.label.lg.tracking,
    textTransform: 'uppercase',
    color: theme.colors.textOnScrim,
  },
}));
