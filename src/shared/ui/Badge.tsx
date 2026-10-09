import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

/** Named bg/fg pairs used by the app's tone-based pills. */
export type BadgeTone =
  | 'neutral' // hairline bg, secondary text (category pills)
  | 'primary' // solid primary bg, white text
  | 'primarySubtle' // faint primary bg, primary text (president role chip)
  | 'primaryMuted' // faint primary bg, secondary text (manager role badge)
  | 'gold' // gold-subtle bg, gold text (FM role chip)
  | 'goldMuted' // gold-subtle bg, secondary text (maintenance role badge)
  | 'info' // slate blue bg, white text (rent hero badge)
  | 'danger' // terracotta bg, white text (emergency pill)
  | 'elevated'; // elevated surface bg, primary text (listing status pill)

export type BadgeSize = 'xs' | 'sm' | 'md';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  size?: BadgeSize;
  /** Overrides the tone background — used for dynamic status colors. */
  backgroundColor?: string;
  /** Optional leading icon (rendered with a 4px gap before the label). */
  icon?: React.ReactNode;
  numberOfLines?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

// Plain switch lookups (not useVariants) because many badges with
// different tones/sizes render side by side in the same row.
function toneContainerStyle(tone: BadgeTone) {
  switch (tone) {
    case 'neutral': {
      return styles.toneNeutral;
    }
    case 'primary': {
      return styles.tonePrimary;
    }
    case 'primarySubtle': {
      return styles.tonePrimarySubtle;
    }
    case 'primaryMuted': {
      return styles.tonePrimaryMuted;
    }
    case 'gold': {
      return styles.toneGold;
    }
    case 'goldMuted': {
      return styles.toneGoldMuted;
    }
    case 'info': {
      return styles.toneInfo;
    }
    case 'danger': {
      return styles.toneDanger;
    }
    case 'elevated': {
      return styles.toneElevated;
    }
  }
}

function toneTextStyle(tone: BadgeTone) {
  switch (tone) {
    case 'neutral': {
      return styles.toneNeutralText;
    }
    case 'primary': {
      return styles.tonePrimaryText;
    }
    case 'primarySubtle': {
      return styles.tonePrimarySubtleText;
    }
    case 'primaryMuted': {
      return styles.tonePrimaryMutedText;
    }
    case 'gold': {
      return styles.toneGoldText;
    }
    case 'goldMuted': {
      return styles.toneGoldMutedText;
    }
    case 'info': {
      return styles.toneInfoText;
    }
    case 'danger': {
      return styles.toneDangerText;
    }
    case 'elevated': {
      return styles.toneElevatedText;
    }
  }
}

function sizeContainerStyle(size: BadgeSize) {
  switch (size) {
    case 'xs': {
      return styles.sizeXs;
    }
    case 'sm': {
      return styles.sizeSm;
    }
    case 'md': {
      return styles.sizeMd;
    }
  }
}

function sizeTextStyle(size: BadgeSize) {
  switch (size) {
    case 'xs': {
      return styles.sizeXsText;
    }
    case 'sm': {
      return styles.sizeSmText;
    }
    case 'md': {
      return styles.sizeMdText;
    }
  }
}

export function Badge({
  label,
  tone = 'neutral',
  size = 'md',
  backgroundColor,
  icon,
  numberOfLines,
  style,
  textStyle,
}: BadgeProps) {
  return (
    <View
      style={[
        styles.container,
        sizeContainerStyle(size),
        toneContainerStyle(tone),
        backgroundColor ? { backgroundColor } : null,
        style,
      ]}
    >
      {icon ?? null}
      <Text
        style={[sizeTextStyle(size), toneTextStyle(tone), textStyle]}
        {...(numberOfLines === undefined ? {} : { numberOfLines })}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: theme.radius.pill,
    flexShrink: 0,
  },
  sizeXs: { paddingHorizontal: 6, paddingVertical: 1 },
  sizeSm: { paddingHorizontal: 8, paddingVertical: 3 },
  sizeMd: { paddingHorizontal: 10, paddingVertical: 3 },
  sizeXsText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
  sizeSmText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  sizeMdText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  toneNeutral: { backgroundColor: theme.colors.borderHairline },
  toneNeutralText: { color: theme.colors.textSecondary },
  tonePrimary: { backgroundColor: theme.colors.primary },
  tonePrimaryText: { color: theme.colors.textOnPrimary },
  tonePrimarySubtle: { backgroundColor: theme.colors.primaryFaint },
  tonePrimarySubtleText: { color: theme.colors.primary },
  tonePrimaryMuted: { backgroundColor: theme.colors.primaryFaint },
  tonePrimaryMutedText: { color: theme.colors.textSecondary },
  toneGold: { backgroundColor: theme.colors.goldSubtle },
  toneGoldText: { color: theme.colors.gold },
  toneGoldMuted: { backgroundColor: theme.colors.goldSubtle },
  toneGoldMutedText: { color: theme.colors.textSecondary },
  toneInfo: { backgroundColor: theme.colors.info },
  toneInfoText: { color: theme.colors.textOnPrimary },
  toneDanger: { backgroundColor: theme.colors.terracotta },
  toneDangerText: { color: theme.colors.textOnPrimary },
  toneElevated: { backgroundColor: theme.colors.surfaceElevated },
  toneElevatedText: { color: theme.colors.textPrimary },
}));
