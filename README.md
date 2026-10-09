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

Release build (Android):

```sh
npx expo prebuild --platform android
cd android && NODE_ENV=production ./gradlew assembleRelease   # or bundleRelease for Play
```

Before a production release, make sure no `.env.local` / `.env.production.local`
exists: those files outrank `.env.production` and would point a release at Railway.

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
3. **Firebase** (T6, push): register Android `com.dyarna.fm` + `com.dyarna.fm.dev`
   and iOS `com.dyarna.fm`, add `google-services.json` / `GoogleService-Info.plist`,
   then wire `googleServicesFile` and the `@react-native-firebase` plugins in `app.config.ts`.
4. **Store listings**: Play Console app for `com.dyarna.fm`, App Store Connect app
   for `com.dyarna.fm`, release keystore / signing.
5. **Branding**: FM-specific icon, adaptive icon and splash (currently the resident app's).
