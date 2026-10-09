import { View, Text } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { CheckCircle, XCircle, Info, Warning, X } from 'phosphor-react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { HapticPressable } from './HapticPressable';
import type { Toast as ToastModel } from '../stores/toastStore';

export interface ToastProps {
  toast: ToastModel;
  onDismiss: () => void;
}

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: Warning,
} as const;

export function Toast({ toast, onDismiss }: ToastProps) {
  const { theme } = useUnistyles();
  const Icon = ICONS[toast.variant];
  // Toast variants share names with the feedback color tokens.
  const iconColor = theme.colors[toast.variant];
  return (
    <Animated.View
      entering={FadeInUp.springify().damping(14).stiffness(180)}
      exiting={FadeOutUp.duration(200)}
      style={styles.container}
    >
      <Icon size={24} color={iconColor} weight="fill" />
      <View style={styles.textColumn}>
        {/* Allow titles to wrap to two lines so a long server-provided
            message (e.g. "President cannot raise a complaint against
            themselves") isn't truncated to gibberish. Body has more room
            still — useful when a caller splits action context (title)
            from server reason (body). */}
        <Text style={styles.title} numberOfLines={2}>
          {toast.title}
        </Text>
        {toast.body ? (
          <Text style={styles.body} numberOfLines={5}>
            {toast.body}
          </Text>
        ) : null}
      </View>
      <HapticPressable
        onPress={onDismiss}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
      >
        <X size={20} color={theme.colors.textMuted} />
      </HapticPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing[16],
    paddingVertical: theme.spacing[12],
    marginHorizontal: theme.spacing[16],
    gap: theme.spacing[12],
    shadowColor: 'rgba(38, 34, 28, 0.10)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 8,
  },
  textColumn: { flex: 1, gap: theme.spacing[2] },
  title: {
    fontSize: theme.type.body.md.size,
    lineHeight: theme.type.body.md.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  body: {
    fontSize: theme.type.body.sm.size,
    lineHeight: theme.type.body.sm.lineHeight,
    color: theme.colors.textSecondary,
  },
}));
