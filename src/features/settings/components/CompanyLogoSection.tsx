import { useRef } from 'react';
import { Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useToastStore } from '@/shared/stores/toastStore';
import {
  BottomSheet,
  Button,
  CachedImage,
  Icons,
  Skeleton,
  showApiErrorToast,
  RTL_INLINE,
  useIsRtl,
  useRtlTextStyle,
  type BottomSheetRef,
} from '@/shared/ui';
import {
  useCompanyLogo,
  useDeleteCompanyLogo,
  useUploadCompanyLogo,
} from '../hooks/useCompanyLogo';
import { LOGO_MIME, logoFileName, validateLogo } from '../lib/logo-validation';
import { SettingsSection } from './SettingsSection';

const PREVIEW_SIZE = 96;

export function CompanyLogoSection() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const rtlText = useRtlTextStyle();
  const isRtl = useIsRtl();
  const push = useToastStore((s) => s.push);
  const logo = useCompanyLogo();
  const upload = useUploadCompanyLogo();
  const remove = useDeleteCompanyLogo();
  const confirmRef = useRef<BottomSheetRef>(null);
  const busy = upload.isPending || remove.isPending;
  const logoUrl = logo.data ?? null;

  const pick = async (): Promise<void> => {
    let asset: ImagePicker.ImagePickerAsset | undefined;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        push({ variant: 'error', title: t('errors.photoAccessDenied') });
        return;
      }
      // No `quality` and no editing: either would re-encode the PNG as a JPEG.
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
      asset = res.canceled ? undefined : res.assets[0];
    } catch {
      push({ variant: 'error', title: t('fm.settings.logoUploadError') });
      return;
    }
    if (!asset) return;
    const name = asset.fileName ?? asset.uri.split('/').pop() ?? null;
    const problem = validateLogo({ name, mimeType: asset.mimeType, size: asset.fileSize });
    if (problem) {
      push({
        variant: 'error',
        title: t(problem === 'notPng' ? 'fm.settings.pngOnlyError' : 'fm.settings.fileTooLarge'),
      });
      return;
    }
    upload.mutate(
      { uri: asset.uri, name: logoFileName(name), type: LOGO_MIME },
      {
        onSuccess: () => push({ variant: 'success', title: t('fm.settings.logoUploadSuccess') }),
        onError: (error) =>
          showApiErrorToast(push, error, t, { fallbackTitle: t('fm.settings.logoUploadError') }),
      },
    );
  };

  const confirmDelete = (): void => {
    remove.mutate(undefined, {
      onSuccess: () => {
        confirmRef.current?.dismiss();
        push({ variant: 'success', title: t('fm.settings.logoDeleteSuccess') });
      },
      onError: (error) =>
        showApiErrorToast(push, error, t, { fallbackTitle: t('fm.settings.logoDeleteError') }),
    });
  };

  let body: React.ReactNode;
  if (logo.isPending) {
    body = (
      <View style={styles.row} testID="settings-logo-loading">
        <Skeleton width={PREVIEW_SIZE} height={PREVIEW_SIZE} radius={theme.radius.md} />
        <View style={styles.actions}>
          <Skeleton height={40} />
        </View>
      </View>
    );
  } else if (logo.isError && logo.data === undefined) {
    body = (
      <View style={styles.errorRow} testID="settings-logo-error">
        <Icons.Warning size={18} color={theme.colors.error} />
        <Text style={[styles.message, isRtl ? RTL_INLINE : null]}>
          {t('fm.settings.logoError')}
        </Text>
        <Button
          label={t('common.retry')}
          variant="secondary"
          size="sm"
          hitSlop={4}
          onPress={() => {
            void logo.refetch();
          }}
        />
      </View>
    );
  } else {
    body = (
      <View style={styles.row}>
        {logoUrl ? (
          <CachedImage
            source={{ uri: logoUrl }}
            style={styles.preview}
            resizeMode="contain"
            accessibilityLabel={t('fm.settings.logoTitle')}
            testID="settings-logo-image"
          />
        ) : (
          <View style={[styles.preview, styles.placeholder]} testID="settings-logo-placeholder">
            <Icons.Image size={32} color={theme.colors.textMuted} />
          </View>
        )}
        <View style={styles.actions}>
          <Button
            label={t(logoUrl ? 'fm.settings.replaceLogo' : 'fm.settings.uploadLogo')}
            variant="secondary"
            size="sm"
            hitSlop={4}
            loading={upload.isPending}
            disabled={busy}
            onPress={() => {
              void pick();
            }}
            testID="settings-logo-upload"
          />
          {logoUrl ? (
            <Button
              label={t('fm.settings.deleteLogo')}
              variant="destructive"
              size="sm"
              hitSlop={4}
              leadingIcon={<Icons.Trash size={16} color={theme.colors.error} />}
              disabled={busy}
              onPress={() => confirmRef.current?.present()}
              testID="settings-logo-delete"
            />
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <SettingsSection title={t('fm.settings.logoTitle')} testID="settings-logo-section">
      {body}
      <BottomSheet ref={confirmRef} snapPoints={['32%']}>
        <View style={styles.sheet}>
          <Text style={[styles.sheetTitle, rtlText]}>{t('fm.settings.deleteLogoTitle')}</Text>
          <Text style={[styles.sheetBody, rtlText]}>{t('fm.settings.deleteLogoBody')}</Text>
          <View style={styles.sheetActions}>
            <Button
              label={t('fm.settings.remove')}
              variant="destructive"
              fullWidth
              loading={remove.isPending}
              disabled={remove.isPending}
              onPress={confirmDelete}
              testID="settings-logo-delete-confirm"
            />
            <Button
              label={t('common.cancel')}
              variant="ghost"
              fullWidth
              disabled={remove.isPending}
              onPress={() => confirmRef.current?.dismiss()}
            />
          </View>
        </View>
      </BottomSheet>
    </SettingsSection>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[16] },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8] },
  message: {
    flex: 1,
    fontSize: theme.type.body.md.size,
    lineHeight: theme.type.body.md.lineHeight,
    color: theme.colors.textSecondary,
  },
  preview: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bg,
  },
  actions: { flex: 1, gap: theme.spacing[8] },
  sheet: {
    paddingHorizontal: theme.spacing[20],
    paddingTop: theme.spacing[8],
    gap: theme.spacing[8],
  },
  sheetTitle: {
    fontSize: theme.type.heading.md.size,
    lineHeight: theme.type.heading.md.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  sheetBody: {
    fontSize: theme.type.body.md.size,
    lineHeight: theme.type.body.md.lineHeight,
    color: theme.colors.textSecondary,
  },
  sheetActions: {
    marginTop: theme.spacing[16],
    gap: theme.spacing[8],
  },
}));
