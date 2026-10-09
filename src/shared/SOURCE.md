# Shared layer: source snapshot

`src/shared/` is a **deliberate one-time fork** of the resident app's shared layer.

- Source repo: `faizulx/dyarna-rn` (local clone `C:\Users\rayan\IdeaProjects\dyarna-rn`)
- Source commit: `b2d155a6729c49ed7569428eca483aa44c24ef24`
- Copied: `src/shared/{api,config,hooks,i18n,lib,stores,theme,ui}` and `src/shared/query.ts`
- Not copied: `src/shared/services/` (auth, biometric, deep-link, device-info, network, push).
  Those are resident-flow services; FM equivalents arrive with their tickets (login T5, push T6).

## Local changes on top of the snapshot

- `i18n/translations/{en,ar}.json`: added the `fm.*` block (shell strings).

Nothing else was modified; the snapshot compiled as-is.

## Re-syncing

This copy does **not** track dyarna-rn automatically. Re-sync on purpose: diff
dyarna-rn's `src/shared` from the commit above to its current HEAD, port the
changes you want, and update the commit SHA here.
