import { useEffect } from 'react';
import { router, Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { I18nextProvider } from 'react-i18next';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native-unistyles';

import '@/shared/theme/unistyles';
import { useAppFonts } from '@/shared/theme/fonts';
import { i18n } from '@/shared/i18n';
import { queryClient } from '@/shared/query';
import { ErrorBoundary, ToastHost } from '@/shared/ui';
import { useLocaleStore } from '@/shared/stores/localeStore';
import { useThemeStore } from '@/shared/stores/themeStore';
import { useToastStore } from '@/shared/stores/toastStore';
import { registerApiDependencies } from '@/shared/api/registry';

void SplashScreen.preventAutoHideAsync();

// Auth wiring (getActiveToken / logout / isAuthenticated) lands with the FM
// login in T5; until then the registry defaults (no token, signed out) apply.
registerApiDependencies({
  pushToast: (msg) => useToastStore.getState().push(msg),
  navigate: (href) => router.replace(href as never),
});

export default function RootLayout(): React.JSX.Element | null {
  const [fontsLoaded] = useAppFonts();
  const hydrateLocale = useLocaleStore((s) => s.hydrate);
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const localeHydrated = useLocaleStore((s) => s.hydrated);
  const themeHydrated = useThemeStore((s) => s.hydrated);

  useEffect(() => {
    void hydrateLocale();
    void hydrateTheme();
  }, [hydrateLocale, hydrateTheme]);

  const ready = fontsLoaded && localeHydrated && themeHydrated;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <I18nextProvider i18n={i18n}>
              {/* ToastHost stays outside BottomSheetModalProvider so Android
                  draws it above sheets (same ordering as dyarna-rn). */}
              <BottomSheetModalProvider>
                <StatusBar style="dark" />
                <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
                  <Stack.Screen name="(fm)" />
                  <Stack.Screen name="(auth)" />
                </Stack>
              </BottomSheetModalProvider>
              <ToastHost />
            </I18nextProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create(() => ({
  root: { flex: 1 },
}));
