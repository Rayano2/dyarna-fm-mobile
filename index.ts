// Configure Unistyles BEFORE any module that uses StyleSheet.create loads.
// Expo Router imports route files for its routing tree before running
// `app/_layout.tsx`, so importing unistyles config from _layout.tsx alone
// isn't early enough — route files may evaluate first.
import '@/shared/theme/unistyles';

// Expo Router's default entry point.
import 'expo-router/entry';
