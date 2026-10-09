import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';
import { StyleSheet } from 'react-native-unistyles';
import { useToastStore } from '../stores/toastStore';
import { Toast } from './Toast';

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    if (toasts.length === 0) return;
    const [first] = toasts;
    if (!first) return;
    const timer = setTimeout(() => dismiss(first.id), first.durationMs);
    return () => clearTimeout(timer);
  }, [toasts, dismiss]);

  if (toasts.length === 0) return null;

  const content = (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + 12 }]}>
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </View>
  );

  // On iOS, `presentation: 'modal'` screens and gorhom bottom sheets render
  // in a separate UIWindow above the root view — a root-mounted toast ends
  // up hidden behind them. FullWindowOverlay creates a UIWindow at the
  // topmost level (above all modals) while letting taps outside the toast
  // fall through to the layer beneath. Android handles z-ordering via the
  // _layout.tsx mount position (placed after BottomSheetModalProvider).
  if (Platform.OS === 'ios') {
    return <FullWindowOverlay>{content}</FullWindowOverlay>;
  }
  return content;
}

const styles = StyleSheet.create(() => ({
  host: {
    position: 'absolute',
    start: 0,
    end: 0,
    zIndex: 1000,
    gap: 8,
  },
}));
