import { forwardRef } from 'react';
import { Pressable, type PressableProps, type View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type HapticType = 'selection' | 'success' | 'error' | 'warning' | 'none';

export interface HapticPressableProps extends PressableProps {
  haptic?: HapticType;
  scaleOnPress?: number;
}

async function fireHaptic(type: Exclude<HapticType, 'none'>) {
  switch (type) {
    case 'selection': {
      await Haptics.selectionAsync();
      return;
    }
    case 'success': {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    case 'error': {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    case 'warning': {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
  }
}

export const HapticPressable = forwardRef<View, HapticPressableProps>(function HapticPressable(
  {
    haptic = 'selection',
    scaleOnPress = 0.98,
    disabled,
    onPressIn,
    onPressOut,
    onPress,
    style,
    children,
    ...rest
  },
  ref,
) {
  // When the caller opts out of the press-scale (`scaleOnPress={1}`), skip
  // Reanimated entirely and fall back to a plain Pressable. The haptic
  // still fires; we just don't allocate a SharedValue + animated worklet
  // per instance. Big win for long-lived list-cell scenarios where
  // FlatList virtualizes hundreds of cells through the lifetime of a
  // session — those allocations don't always get aggressively reclaimed
  // and the cumulative GC pressure shows up as scroll jitter.
  if (scaleOnPress === 1) {
    return (
      <PlainHapticPressable
        ref={ref}
        haptic={haptic}
        disabled={disabled}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
        style={style}
        {...rest}
      >
        {children}
      </PlainHapticPressable>
    );
  }
  return (
    <AnimatedHapticPressable
      ref={ref}
      haptic={haptic}
      scaleOnPress={scaleOnPress}
      disabled={disabled}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={onPress}
      style={style}
      {...rest}
    >
      {children}
    </AnimatedHapticPressable>
  );
});

const AnimatedHapticPressable = forwardRef<View, HapticPressableProps>(
  function AnimatedHapticPressable(
    {
      haptic = 'selection',
      scaleOnPress = 0.98,
      disabled,
      onPressIn,
      onPressOut,
      onPress,
      style,
      children,
      ...rest
    },
    ref,
  ) {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    return (
      <AnimatedPressable
        ref={ref}
        disabled={disabled}
        onPressIn={(e) => {
          scale.value = withSpring(scaleOnPress, { damping: 14, stiffness: 260 });
          if (!disabled && haptic !== 'none') void fireHaptic(haptic);
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          scale.value = withSpring(1, { damping: 14, stiffness: 260 });
          onPressOut?.(e);
        }}
        onPress={onPress}
        style={[
          animatedStyle,
          typeof style === 'function' ? style({ pressed: false, hovered: false }) : style,
        ]}
        {...rest}
      >
        {children as React.ReactNode}
      </AnimatedPressable>
    );
  },
);

const PlainHapticPressable = forwardRef<View, Omit<HapticPressableProps, 'scaleOnPress'>>(
  function PlainHapticPressable(
    { haptic = 'selection', disabled, onPressIn, onPressOut, onPress, style, children, ...rest },
    ref,
  ) {
    return (
      <Pressable
        ref={ref}
        disabled={disabled}
        onPressIn={(e) => {
          if (!disabled && haptic !== 'none') void fireHaptic(haptic);
          onPressIn?.(e);
        }}
        onPressOut={onPressOut}
        onPress={onPress}
        style={style}
        {...rest}
      >
        {children as React.ReactNode}
      </Pressable>
    );
  },
);
