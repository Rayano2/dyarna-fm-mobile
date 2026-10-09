import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

export interface DividerProps {
  vertical?: boolean;
}

export function Divider({ vertical }: DividerProps) {
  styles.useVariants({ vertical: !!vertical });
  return <View style={styles.line} accessible={false} importantForAccessibility="no" />;
}

const styles = StyleSheet.create((theme) => ({
  line: {
    backgroundColor: theme.colors.borderHairline,
    variants: {
      vertical: {
        true: { width: 1, alignSelf: 'stretch' },
        false: { height: 1, alignSelf: 'stretch' },
      },
    },
  },
}));
