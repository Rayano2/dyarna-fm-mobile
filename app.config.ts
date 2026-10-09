import type { ExpoConfig } from 'expo/config';

import ar from './src/shared/i18n/translations/ar.json';

// Same variant pattern as dyarna-rn: EXPO_PUBLIC_APP_VARIANT comes from the
// env file Expo loads (.env.development -> development, .env.production ->
// production). Unlike dyarna-rn, the dev variant gets its own application id
// so a dev build installs side by side with the release build.
const variant = process.env.EXPO_PUBLIC_APP_VARIANT ?? 'development';
const isDev = variant === 'development';

const appId = isDev ? 'com.dyarna.fm.dev' : 'com.dyarna.fm';

// Home-screen label per device language (see plugins/with-localized-app-name).
const appName = isDev ? 'Dyarna FM Dev' : 'Dyarna FM';
const appNameAr = isDev ? `${ar.fm.appName} Dev` : ar.fm.appName;

// TODO(T6 / owner): create a dedicated EAS project for this app
// (`eas init` -> slug "dyarna-fm") and set EAS_PROJECT_ID, or hard-code the id
// here. Do NOT reuse the resident app's projectId.
const easProjectId = process.env.EAS_PROJECT_ID;

// TODO(T6 / owner): push notifications. Register com.dyarna.fm (and
// com.dyarna.fm.dev) in Firebase and drop google-services.json /
// GoogleService-Info.plist in the repo root (the resident app's files must NOT
// be copied here). Then, as dyarna-rn does:
//  - set `googleServicesFile` on android/ios below;
//  - add 'POST_NOTIFICATIONS' to android.permissions;
//  - add plugins: ['expo-notifications', { color: ... }],
//    '@react-native-firebase/app', '@react-native-firebase/messaging';
//  - re-add expo-build-properties with ios.useFrameworks 'static' and
//    android.extraProguardRules keeping com.google.firebase.**,
//    com.google.android.gms.**, io.invertase.firebase.**, okhttp3.**, okio.**;
//  - port plugins/with-firebase-modular-headers from dyarna-rn.
//
// TODO(before any screen uses ImagePickerRow): it can launch the camera. Add
// infoPlist.NSCameraUsageDescription and the 'expo-image-picker' plugin. The
// android large-heap plugin (camera-capture OOM mitigation) is already below.

const config: ExpoConfig = {
  name: appName,
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
    // Localised home-screen label: English devices show "Dyarna FM", Arabic
    // devices show fm.appName from ar.json. Ported from dyarna-rn.
    ['./plugins/with-localized-app-name', { en: appName, ar: appNameAr }],
    // Android only: android:largeHeap="true" so a full-size camera capture via
    // ImagePickerRow cannot kill the process (dyarna-rn #35). Mitigation only.
    './plugins/with-android-large-heap',
  ],
  runtimeVersion: { policy: 'appVersion' },
  ...(easProjectId ? { extra: { eas: { projectId: easProjectId } } } : {}),
  experiments: {
    typedRoutes: true,
  },
};

export default config;
