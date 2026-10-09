import type { ExpoConfig } from 'expo/config';

// Same variant pattern as dyarna-rn: EXPO_PUBLIC_APP_VARIANT comes from the
// env file Expo loads (.env.development -> development, .env.production ->
// production). Unlike dyarna-rn, the dev variant gets its own application id
// so a dev build installs side by side with the release build.
const variant = process.env.EXPO_PUBLIC_APP_VARIANT ?? 'development';
const isDev = variant === 'development';

const appId = isDev ? 'com.dyarna.fm.dev' : 'com.dyarna.fm';

// TODO(T6 / owner): create a dedicated EAS project for this app
// (`eas init` -> slug "dyarna-fm") and set EAS_PROJECT_ID, or hard-code the id
// here. Do NOT reuse the resident app's projectId.
const easProjectId = process.env.EAS_PROJECT_ID;

// TODO(T6 / owner): register com.dyarna.fm (and com.dyarna.fm.dev) in Firebase,
// drop google-services.json / GoogleService-Info.plist in the repo root, then
// set `googleServicesFile` on android/ios below and add the
// @react-native-firebase plugins. Intentionally absent until push lands (T6);
// the resident app's Firebase files must NOT be copied here.

const config: ExpoConfig = {
  name: isDev ? 'Dyarna FM Dev' : 'Dyarna FM',
  slug: 'dyarna-fm',
  version: '0.1.0',
  orientation: 'portrait',
  // TODO(owner): FM-specific icon/splash. These are the resident app's assets.
  icon: './assets/icon.png',
  scheme: isDev ? 'dyarnafm-dev' : 'dyarnafm',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#F5F2EA',
  },
  ios: {
    bundleIdentifier: appId,
    supportsTablet: false,
    infoPlist: {
      NSPhotoLibraryUsageDescription: 'Dyarna FM uses your photos for ticket images.',
    },
  },
  android: {
    package: appId,
    // Source of truth for the APK versionCode (/android is gitignored).
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#F5F2EA',
    },
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-localization',
    'expo-secure-store',
    '@react-native-community/datetimepicker',
    // Android only: shorten OkHttp's pooled-connection keep-alive so a socket
    // the edge already closed is never reused (false "operation failed" on
    // release builds). Copied from dyarna-rn.
    './plugins/with-okhttp-connection-pool',
  ],
  runtimeVersion: { policy: 'appVersion' },
  ...(easProjectId ? { extra: { eas: { projectId: easProjectId } } } : {}),
  experiments: {
    typedRoutes: true,
  },
};

export default config;
