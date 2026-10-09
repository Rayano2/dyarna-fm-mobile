# Shared layer: source snapshot

`src/shared/` is a **deliberate one-time fork** of the resident app's shared layer.

- Source repo: `faizulx/dyarna-rn` (local clone `C:\Users\rayan\IdeaProjects\dyarna-rn`)
- Source commit: `b2d155a6729c49ed7569428eca483aa44c24ef24`
- Copied: `src/shared/{api,config,hooks,i18n,lib,stores,theme,ui}` and `src/shared/query.ts`
- Not copied: `src/shared/services/` (auth, biometric, deep-link, device-info, network, push).
  Those are resident-flow services; FM equivalents arrive with their tickets (login T5, push T6).

## Local changes on top of the snapshot

- `i18n/translations/{en,ar}.json`: added the `fm.*` block (shell strings).

- `config/env.test.ts`: deep-link scheme fixture renamed `dyarnap-dev` -> `dyarnafm-dev`.

- T5 (FM login + shell):
  - `i18n/translations/{en,ar}.json`: `fm.*` block replaced (login, session, nav, placeholder).
  - `api/client.ts`: `credentials: 'omit'` on every client (Bearer only, no cookies).
  - `api/interceptors/error.ts`: the 401 toast uses `fm.session.expired` (one line, no body).
  - `lib/jwt.ts`: added `jwtClaims()` (reads the role/name claims at login).
  - `ui/icons.ts`: added `Eye` (password toggle).

Nothing else was modified.

## Known caveats carried over

- `ui/ImagePickerRow.tsx` can launch the **camera**. Before any FM screen uses
  it, add `ios.infoPlist.NSCameraUsageDescription` and the `expo-image-picker`
  plugin in `app.config.ts`. `plugins/with-android-large-heap` (ported from
  dyarna-rn, camera OOM mitigation) is already registered.
- `lib/jwt.ts` fails `unicorn/number-literal-case` lint, same as upstream.

## Re-syncing

This copy does **not** track dyarna-rn automatically. Re-sync on purpose: diff
dyarna-rn's `src/shared` from the commit above to its current HEAD, port the
changes you want, and update the commit SHA here.
