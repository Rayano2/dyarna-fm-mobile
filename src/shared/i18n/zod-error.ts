import { useTranslation } from 'react-i18next';

/** Collapses the repeated compose-form zod-error ternary:
 *  `errors.x ? t(`${ns}.errors.${errors.x.message ?? 'generic'}`) : undefined`.
 *  `ns` is the feature namespace (e.g. 'posts.compose'); zod schemas emit the
 *  i18n key suffix as the error message. */
export function useZodErrorText(ns: string) {
  const { t } = useTranslation();
  return (error: { message?: string | undefined } | undefined): string | undefined =>
    error ? t(`${ns}.errors.${error.message ?? 'generic'}`) : undefined;
}
