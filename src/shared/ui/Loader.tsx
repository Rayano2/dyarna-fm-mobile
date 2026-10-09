import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';
import { Logo } from './Logo';

export interface LoaderProps {
  size?: number;
}

export function Loader({ size = 72 }: LoaderProps) {
  const rotation = useSharedValue(0);
  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 1600, easing: Easing.linear }), -1);
  }, [rotation]);

  const ringStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  const markSize = size * 0.45;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }, ringStyle]}
      />
      <View style={styles.mark}>
        <Logo size={markSize} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: theme.colors.borderSubtle,
    borderTopColor: theme.colors.primary,
  },
  mark: { alignItems: 'center', justifyContent: 'center' },
}));
