import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  TextInput,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';
import { Button } from './Button';
import { ScreenHeader, type ScreenHeaderTitleVariant } from './ScreenHeader';

/** Breathing room between the focused field and whatever sits below it. */
const FOCUS_SCROLL_MARGIN = 12;

export interface ComposeScaffoldProps {
  title: string;
  /** Localized label for the back/close control (e.g. t('common.back')). */
  backAccessibilityLabel: string;
  /** Defaults to `router.back()`. */
  onBack?: () => void;
  headerIcon?: 'back' | 'close';
  headerTitleVariant?: ScreenHeaderTitleVariant;
  headerTrailing?: ReactNode;
  /** Merged after the scaffold's base content style (16pt gap +
   *  `insets.bottom + 96` bottom padding), so callers can override
   *  padding without losing the shared defaults. */
  contentContainerStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
  submitLabel: string;
  onSubmit: () => void;
  submitting: boolean;
  submitDisabled: boolean;
}

/** Shared shell for the full-screen compose forms (post / ticket / listing /
 *  announcement): keyboard-aware screen, header, scrollable content and a
 *  pinned submit footer. Field sections are rendered by the caller.
 *
 *  Keyboard handling (#36) is driven by ONE measured keyboard height rather
 *  than KeyboardAvoidingView, which used to wrap this tree:
 *   - Android got `behavior={undefined}`, i.e. a plain View that offsets
 *     nothing, and could not fall back on the native resize either, because
 *     under `edgeToEdgeEnabled` (Expo SDK 54 default) the IME arrives as a
 *     WindowInsets overlay and adjustResize no longer resizes the RN root.
 *   - On iOS its `padding` behavior shrinks this container, which would
 *     double-count against `automaticallyAdjustKeyboardInsets` below.
 *  The footer is lifted with a transform (not margin/height) on purpose: it
 *  must not shrink the ScrollView's frame, or iOS would see no keyboard
 *  overlap and `automaticallyAdjustKeyboardInsets` would inset nothing. */
export function ComposeScaffold({
  title,
  backAccessibilityLabel,
  onBack,
  headerIcon = 'back',
  headerTitleVariant = 'heading',
  headerTrailing,
  contentContainerStyle,
  children,
  submitLabel,
  onSubmit,
  submitting,
  submitDisabled,
}: ComposeScaffoldProps) {
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const footerHeight = useRef(0);

  useEffect(() => {
    // iOS fires the "will" pair in step with the keyboard animation; Android
    // only emits the "did" pair.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const onHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    // Nothing in the tree scrolls the focused field into view on its own:
    // on Android there is no keyboard-aware scrolling at all, and on iOS
    // `automaticallyAdjustKeyboardInsets` clears the keyboard but not the
    // pinned footer that now rides on top of it. Measure once the keyboard
    // is actually up (didShow on both platforms) and close the gap; when the
    // field is already visible the computed overlap is <= 0 and this no-ops,
    // so it never fights the iOS inset adjustment.
    const onDidShow = Keyboard.addListener('keyboardDidShow', (e) => {
      const input = TextInput.State.currentlyFocusedInput();
      if (!input) return;
      const visibleBottom = e.endCoordinates.screenY - footerHeight.current - FOCUS_SCROLL_MARGIN;
      input.measureInWindow((_x, y, _width, height) => {
        const overlap = y + height - visibleBottom;
        if (overlap > 0) {
          scrollRef.current?.scrollTo({ y: scrollY.current + overlap, animated: true });
        }
      });
    });

    return () => {
      onShow.remove();
      onHide.remove();
      onDidShow.remove();
    };
  }, []);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = e.nativeEvent.contentOffset.y;
  }, []);

  const handleFooterLayout = useCallback((e: LayoutChangeEvent) => {
    footerHeight.current = e.nativeEvent.layout.height;
  }, []);

  const keyboardVisible = keyboardHeight > 0;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        icon={headerIcon}
        onBack={onBack ?? (() => router.back())}
        backAccessibilityLabel={backAccessibilityLabel}
        title={title}
        titleVariant={headerTitleVariant}
        trailing={headerTrailing}
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 96 },
          contentContainerStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        // iOS only: insets the scroll view by the keyboard overlap and keeps
        // the first responder visible. A no-op on Android, which is why the
        // spacer below exists.
        automaticallyAdjustKeyboardInsets
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {children}
        {/* Android's clearance for the keyboard. A spacer rather than extra
            contentContainer paddingBottom because two callers (poll and
            announcement compose) pass a contentContainerStyle that overrides
            paddingBottom outright — padding added here would be dropped on
            exactly those screens. */}
        {Platform.OS === 'android' && keyboardVisible ? (
          <View style={{ height: keyboardHeight }} />
        ) : null}
      </ScrollView>

      {/* Rides above the keyboard on both platforms. Its safe-area padding
          collapses while the keyboard is up: the home indicator / nav bar is
          covered by the keyboard, so keeping it would leave a visible gap. */}
      <View
        onLayout={handleFooterLayout}
        style={[
          styles.footer,
          {
            paddingBottom: keyboardVisible ? 12 : Math.max(insets.bottom, 12),
            transform: [{ translateY: -keyboardHeight }],
          },
        ]}
      >
        <Button
          label={submitLabel}
          onPress={onSubmit}
          loading={submitting}
          disabled={submitDisabled}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { gap: theme.spacing[16] },
  footer: {
    paddingHorizontal: theme.spacing[24],
    paddingTop: theme.spacing[12],
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderHairline,
    backgroundColor: theme.colors.bg,
  },
}));
