import { View, Text, ActivityIndicator } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Pencil } from 'phosphor-react-native';
import { CachedImage } from './CachedImage';
import { HapticPressable } from './HapticPressable';

export interface AvatarProps {
  source?: { uri: string } | undefined;
  name?: string;
  size?: number;
  editable?: boolean;
  isUploading?: boolean;
  onEditPress?: () => void;
}

function initialsFromName(name?: string): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
}

export function Avatar({
  source,
  name,
  size = 96,
  editable,
  isUploading,
  onEditPress,
}: AvatarProps) {
  const { theme } = useUnistyles();
  const radius = size / 2;
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {source ? (
        <CachedImage source={source} style={{ width: size, height: size, borderRadius: radius }} />
      ) : (
        <View style={[styles.placeholder, { width: size, height: size, borderRadius: radius }]}>
          <Text style={[styles.initials, { fontSize: size * 0.3 }]}>{initialsFromName(name)}</Text>
        </View>
      )}
      {isUploading ? (
        <View
          style={[styles.uploadOverlay, { width: size, height: size, borderRadius: radius }]}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <ActivityIndicator color={theme.colors.textOnPrimary} />
        </View>
      ) : null}
      {editable ? (
        <HapticPressable
          onPress={onEditPress}
          disabled={isUploading}
          style={[
            styles.editBadge,
            { width: size * 0.28, height: size * 0.28, borderRadius: size * 0.14 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Edit profile image"
          accessibilityState={isUploading ? { disabled: true } : undefined}
        >
          <Pencil size={size * 0.14} color={theme.colors.textOnPrimary} weight="fill" />
        </HapticPressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  placeholder: {
    backgroundColor: theme.colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '600',
    color: theme.colors.primary,
  },
  editBadge: {
    position: 'absolute',
    end: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.bg,
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
