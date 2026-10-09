# Dyarna FM (mobile)

Expo app for **facility managers**: a separate app from the resident app
(`faizulx/dyarna-rn`). It shares that app's toolchain and a forked copy of its
shared layer (API clients, token storage, theme, i18n/RTL, UI kit); see
`src/shared/SOURCE.md` for the source commit.

Stack: Expo 54, React Native 0.81.5, expo-router 6, ky 2, TanStack Query,
Zustand, Unistyles, i18next (EN/AR with RTL).

## Install

**Use pnpm only.** `npm install --legacy-peer-deps` has broken the Android build
before; `.npmrc` / `pnpm-workspace.yaml` set the hoisted linker that RN needs.

```sh
pnpm install
```

## Run

```sh
pnpm start              # Metro (dev client)
pnpm android            # dev build on device/emulator  (variant: development)
pnpm ios
```

### Android builds (variant-safe)

`expo prebuild` writes the applicationId into `android/`, and the gradle bundle
step embeds the backend URLs. **Both pick their env file from NODE_ENV on their
own.** Plain `npx expo prebuild` loads `.env.development` and writes
`com.dyarna.fm.dev`; a later `NODE_ENV=production ./gradlew ...` then embeds
the prod backend in the **dev package**, and the first Play upload permanently
claims the wrong package. Always use the scripts:

```sh
pnpm android:release                 # com.dyarna.fm,     .env.production, assembleRelease (APK)
pnpm android:release bundleRelease   # same, AAB for Play
pnpm android:dev                     # com.dyarna.fm.dev, .env.development, assembleRelease
pnpm check:android-variant production   # re-check an existing android/ + bundle
```

`scripts/android-build.js` sets `NODE_ENV` and `EXPO_PUBLIC_APP_VARIANT` to the
same variant for every step (no shell env syntax, so it works from cmd,
PowerShell and bash), then:

1. refuses a production build while `.env.local` / `.env.production.local`
   exist (they outrank `.env.production` and would point it at Railway);
2. runs `npx expo prebuild --clean --platform android`;
3. rewrites `android/local.properties` (`sdk.dir` from `ANDROID_HOME` /
   `ANDROID_SDK_ROOT` / `%LOCALAPPDATA%AndroidSdk`), which `--clean` wipes;
4. runs `scripts/check-android-variant.js`, which fails unless the
   `applicationId` in `android/app/build.gradle` matches the variant;
5. runs gradle (`assembleRelease` by default);
6. runs the check again with `--require-bundle`: the built
   `index.android.bundle` must embed the variant's UMS host, and a production
   bundle must not contain any `up.railway.app` URL.

If you must do it by hand, keep the variant identical on both steps:

```sh
NODE_ENV=production npx expo prebuild --clean --platform android
cd android && NODE_ENV=production ./gradlew bundleRelease && cd ..
pnpm check:android-variant production --require-bundle
```

## Env variants

Expo loads the env file by mode; `EXPO_PUBLIC_APP_VARIANT` inside it drives `app.config.ts`.

| File | Variant | App id | Name | Backend |
|---|---|---|---|---|
| `.env.development` | development | `com.dyarna.fm.dev` | Dyarna FM Dev | Railway (per-service URLs) |
| `.env.production` | production | `com.dyarna.fm` | Dyarna FM | `https://api.dyarna.sa` |

Only public `EXPO_PUBLIC_*` URLs live in these files. Never commit secrets;
`.env*.local` is gitignored.

## Checks

```sh
pnpm typecheck
pnpm test
pnpm lint
npx expo config --type public                       # development
EXPO_PUBLIC_APP_VARIANT=production npx expo config --type public
```

## Manual TODOs (owner)

1. **GitHub repo**: create `Rayano2/dyarna-fm-mobile`, add it as `origin`, push `main`.
2. **EAS project**: `eas init` for slug `dyarna-fm`, then set `EAS_PROJECT_ID`
   (or hard-code it in `app.config.ts`). Do not reuse the resident app's project id.
3. **Firebase / push** (T6): register Android `com.dyarna.fm` + `com.dyarna.fm.dev`
   and iOS `com.dyarna.fm`, add `google-services.json` / `GoogleService-Info.plist`
   (never the resident app's), then in `app.config.ts`, as dyarna-rn does:
   - set `googleServicesFile` on android and ios;
   - add the `POST_NOTIFICATIONS` Android permission and the `expo-notifications` plugin;
   - add the `@react-native-firebase/app` and `/messaging` plugins;
   - re-add `expo-build-properties` with `ios.useFrameworks: 'static'` and
     `android.extraProguardRules` keeping `com.google.firebase.**`,
     `com.google.android.gms.**`, `io.invertase.firebase.**`, `okhttp3.**`, `okio.**`;
   - port `plugins/with-firebase-modular-headers.js` from dyarna-rn and register it.
4. **Store listings**: Play Console app for `com.dyarna.fm`, App Store Connect app
   for `com.dyarna.fm`, release keystore / signing.
5. **Branding**: FM-specific icon, adaptive icon and splash (currently the resident app's).
6. **Camera (before any screen uses `ImagePickerRow`)**: it can launch the camera.
   Add `ios.infoPlist.NSCameraUsageDescription` and the `expo-image-picker` plugin
   to `app.config.ts`. The Android large-heap plugin (camera-capture OOM
   mitigation, dyarna-rn #35) is already registered.
