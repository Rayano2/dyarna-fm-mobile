import { StyleSheet } from 'react-native-unistyles';
import { lightTheme, darkTheme, type AppTheme } from './themes';

declare module 'react-native-unistyles' {
  export interface UnistylesBreakpoints {
    xs: 0;
    sm: 360;
    md: 768;
    lg: 1024;
  }
  export interface UnistylesThemes {
    light: AppTheme;
    dark: AppTheme;
  }
}

StyleSheet.configure({
  breakpoints: {
    xs: 0,
    sm: 360,
    md: 768,
    lg: 1024,
  },
  themes: {
    light: lightTheme,
    dark: darkTheme,
  },
  settings: {
    adaptiveThemes: true,
  },
});
