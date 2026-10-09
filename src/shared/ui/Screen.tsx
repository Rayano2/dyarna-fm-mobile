import { type ReactNode } from 'react';
import {
  ScrollView,
  View,
  type ViewStyle,
  type StyleProp,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';

export interface ScreenProps {
  children: ReactNode;
  scrollable?: boolean;
  keyboardAvoiding?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom' | 'start' | 'end')[];
  /** Forwarded to the root view so a screen can be addressed end-to-end. */
  testID?: string;
}

export function Screen({
  children,
  scrollable,
  keyboardAvoiding = true,
  style,
  contentStyle,
  edges = ['top', 'bottom', 'start', 'end'],
  testID,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingStart: edges.includes('start') ? insets.left : 0,
    paddingEnd: edges.includes('end') ? insets.right : 0,
  };

  const inner = scrollable ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, contentStyle]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, contentStyle]}>{children}</View>
  );

  if (keyboardAvoiding) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.screen, padding, style]}
        testID={testID}
      >
        {inner}
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={[styles.screen, padding, style]} testID={testID}>
      {inner}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing[24],
  },
}));
