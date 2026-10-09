import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { HapticPressable } from './HapticPressable';
import { CaretLeft, X } from './icons';

export type ScreenHeaderTitleVariant = 'heading' | 'centered' | 'compact' | 'strong';

export interface ScreenHeaderProps {
  /** Optional header title. When omitted, a flex spacer pushes `trailing`
   *  to the end edge (detail screens whose title lives in the body). */
  title?: string;
  /** Title typography:
   *  - 'heading'  — compose screens (heading.lg, leading)
   *  - 'centered' — modal-style forms (heading.md, centered, InterTight)
   *  - 'compact'  — dense detail headers (body.md, secondary color)
   *  - 'strong'   — list screens (body.lg, bold) */
  titleVariant?: ScreenHeaderTitleVariant;
  /** 'back' renders a CaretLeft; 'close' renders an X (modal-style forms). */
  icon?: 'back' | 'close';
  onBack: () => void;
  /** Localized label for the back/close control (e.g. t('common.back')). */
  backAccessibilityLabel?: string;
  /** Trailing action slot. When a title is present and this is empty, a
   *  32px spacer keeps the title horizontally balanced. */
  trailing?: React.ReactNode;
  testID?: string;
}

export function ScreenHeader({
  title,
  titleVariant = 'heading',
  icon = 'back',
  onBack,
  backAccessibilityLabel,
  trailing,
  testID,
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  styles.useVariants({ titleVariant });

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]} testID={testID}>
      <HapticPressable
        onPress={onBack}
        hitSlop={12}
        accessibilityRole="button"
        {...(backAccessibilityLabel ? { accessibilityLabel: backAccessibilityLabel } : {})}
        style={styles.iconButton}
      >
        {icon === 'close' ? (
          <X size={22} color={theme.colors.textPrimary} />
        ) : (
          <CaretLeft size={24} color={theme.colors.textPrimary} />
        )}
      </HapticPressable>
      {title === undefined ? (
        <View style={styles.spacer} />
      ) : (
        <Text style={styles.title} {...(titleVariant === 'heading' ? {} : { numberOfLines: 1 })}>
          {title}
        </Text>
      )}
      {trailing ?? (title === undefined ? null : <View style={styles.trailingSlot} />)}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[16],
    paddingBottom: theme.spacing[12],
    gap: theme.spacing[8],
  },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: { flex: 1 },
  trailingSlot: { width: 32 },
  title: {
    flex: 1,
    variants: {
      titleVariant: {
        heading: {
          fontSize: theme.type.heading.lg.size,
          fontWeight: '600',
          color: theme.colors.textPrimary,
        },
        centered: {
          fontSize: theme.type.heading.md.size,
          lineHeight: theme.type.heading.md.lineHeight,
          fontWeight: '700',
          color: theme.colors.textPrimary,
          textAlign: 'center',
          fontFamily: 'InterTight-SemiBold',
        },
        // Tight body-weight header — the actual title carries the visual
        // weight further down the screen, so the header stays unobtrusive.
        compact: {
          fontSize: theme.type.body.md.size,
          fontWeight: '600',
          color: theme.colors.textSecondary,
        },
        strong: {
          fontSize: theme.type.body.lg.size,
          fontWeight: '700',
          color: theme.colors.textPrimary,
        },
      },
    },
  },
}));
