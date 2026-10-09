import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

export interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
}

export function Skeleton({ width = '100%', height = 16, radius = 8 }: SkeletonProps) {
  const opacity = useSharedValue(0.4);
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.9, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[styles.base, { width, height, borderRadius: radius }, animatedStyle]}
      accessible={false}
    />
  );
}

const styles = StyleSheet.create((theme) => ({
  base: { backgroundColor: theme.colors.borderSubtle },
}));
