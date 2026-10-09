import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { FieldLabel, confirmAction } from '@/features/scope';
import { useToastStore } from '@/shared/stores/toastStore';
import { Button, Icons, showApiErrorToast, useRtlTextStyle } from '@/shared/ui';
import type { BuildingInfoAttachment } from '../api/building-info-api';
import {
  useAttachmentLink,
  useBuildingInfoAttachments,
  useDeleteAttachment,
  useUploadAttachment,
} from '../hooks/useBuildingInfoManage';
import {
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_MB,
  PICKER_MIME_TYPES,
  mimeForFile,
  validateAttachment,
} from '../lib/attachment-validation';
import { AttachmentRow } from './AttachmentRow';

export interface AttachmentManagerProps {
  /** Undefined in create mode: files attach to a saved item only. */
  itemId: string | undefined;
}

interface Picked {
  uri: string;
  name: string;
  size: number | null | undefined;
  type: string | null | undefined;
}

export function AttachmentManager({ itemId }: AttachmentManagerProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const rtlText = useRtlTextStyle();
  const push = useToastStore((s) => s.push);
  const list = useBuildingInfoAttachments(itemId);
  const upload = useUploadAttachment();
  const remove = useDeleteAttachment();
  const link = useAttachmentLink();
  const [uploadError, setUploadError] = useState<string | null>(null);

  const attachments = list.data ?? [];
  const atCap = attachments.length >= MAX_ATTACHMENTS;

  if (!itemId) {
    return (
      <View style={styles.box}>
        <FieldLabel label={t('fm.buildingInfo.attachments')} />
        <Text style={[styles.hint, rtlText]}>{t('fm.buildingInfo.createFirst')}</Text>
      </View>
    );
  }

  const send = (file: Picked): void => {
    setUploadError(null);
    const problem = validateAttachment({ name: file.name, size: file.size });
    if (problem) {
      setUploadError(
        problem === 'tooLarge'
          ? t('fm.buildingInfo.tooLarge', { size: MAX_ATTACHMENT_MB })
          : t('fm.buildingInfo.badType'),
      );
      return;
    }
    upload.mutate(
      { itemId, file: { uri: file.uri, name: file.name, type: mimeForFile(file.name, file.type) } },
      {
        onError: (error) => {
          setUploadError(t('fm.buildingInfo.uploadFailed'));
          showApiErrorToast(push, error, t, { fallbackTitle: t('fm.buildingInfo.uploadFailed') });
        },
      },
    );
  };

  const pickDocument = async (): Promise<void> => {
    const res = await DocumentPicker.getDocumentAsync({
      type: PICKER_MIME_TYPES,
      multiple: false,
      copyToCacheDirectory: true,
    });
    const asset = res.canceled ? undefined : res.assets[0];
    if (!asset) return;
    send({ uri: asset.uri, name: asset.name, size: asset.size, type: asset.mimeType });
  };

  const pickPhoto = async (): Promise<void> => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      push({ variant: 'error', title: t('errors.photoAccessDenied') });
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    const asset = res.canceled ? undefined : res.assets[0];
    if (!asset) return;
    const name = asset.fileName ?? asset.uri.split('/').pop() ?? 'photo.jpg';
    send({ uri: asset.uri, name, size: asset.fileSize, type: asset.mimeType });
  };

  const add = (): void => {
    // Three buttons max, so this stays an Alert on Android too.
    Alert.alert(t('fm.buildingInfo.add'), undefined, [
      { text: t('fm.buildingInfo.addDocument'), onPress: () => void pickDocument() },
      { text: t('fm.buildingInfo.addPhoto'), onPress: () => void pickPhoto() },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const open = (a: BuildingInfoAttachment): void => {
    // Minted per tap: the link expires, so it is never prefetched or reused.
    link.mutate(
      { itemId, attachmentId: a.id },
      {
        onSuccess: async (res) => {
          try {
            await Linking.openURL(res.url);
          } catch {
            push({ variant: 'error', title: t('fm.buildingInfo.openFailed') });
          }
        },
        onError: (error) =>
          showApiErrorToast(push, error, t, { fallbackTitle: t('fm.buildingInfo.openFailed') }),
      },
    );
  };

  const confirmDelete = (a: BuildingInfoAttachment): void => {
    confirmAction({
      title: t('fm.buildingInfo.deleteFileTitle'),
      message: a.originalFilename,
      confirmLabel: t('fm.buildingInfo.delete'),
      cancelLabel: t('common.cancel'),
      onConfirm: () =>
        remove.mutate(
          { itemId, attachmentId: a.id },
          {
            onError: (error) =>
              showApiErrorToast(push, error, t, {
                fallbackTitle: t('fm.buildingInfo.deleteFileFailed'),
              }),
          },
        ),
    });
  };

  return (
    <View style={styles.box}>
      <FieldLabel
        label={t('fm.buildingInfo.attachments')}
        count={attachments.length}
        max={MAX_ATTACHMENTS}
      />
      <Text style={[styles.hint, rtlText]}>
        {t('fm.buildingInfo.help', { max: MAX_ATTACHMENTS, size: MAX_ATTACHMENT_MB })}
      </Text>

      {list.isLoading ? <ActivityIndicator color={theme.colors.textMuted} /> : null}
      {list.isError ? (
        <Button
          label={t('common.retry')}
          variant="ghost"
          size="sm"
          onPress={() => void list.refetch()}
        />
      ) : null}

      {attachments.map((a) => (
        <AttachmentRow
          key={a.id}
          attachment={a}
          opening={link.isPending && link.variables?.attachmentId === a.id}
          deleting={remove.isPending && remove.variables?.attachmentId === a.id}
          onOpen={open}
          onDelete={confirmDelete}
        />
      ))}

      {upload.isPending ? (
        <View style={styles.uploading} accessibilityLiveRegion="polite">
          <View style={styles.uploadingHead}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={[styles.hint, rtlText]} numberOfLines={1}>
              {t('fm.buildingInfo.uploading', { name: upload.variables?.file.name ?? '' })}
            </Text>
          </View>
          <View style={styles.track}>
            <View style={styles.bar} />
          </View>
        </View>
      ) : null}

      {uploadError ? (
        <View style={styles.errorRow} accessibilityLiveRegion="assertive">
          <Icons.Warning size={16} color={theme.colors.error} weight="fill" />
          <Text style={[styles.error, rtlText]}>{uploadError}</Text>
        </View>
      ) : null}

      {atCap ? (
        <Text style={[styles.hint, rtlText]}>
          {t('fm.buildingInfo.atCap', { max: MAX_ATTACHMENTS })}
        </Text>
      ) : (
        <Button
          label={t('fm.buildingInfo.add')}
          variant="secondary"
          size="sm"
          disabled={upload.isPending || list.isLoading}
          leadingIcon={<Icons.Plus size={16} color={theme.colors.textPrimary} weight="bold" />}
          onPress={add}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  box: { gap: theme.spacing[8] },
  hint: { flexShrink: 1, fontSize: theme.type.body.sm.size, color: theme.colors.textSecondary },
  uploading: { gap: theme.spacing[6] },
  uploadingHead: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8] },
  track: {
    height: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.borderSubtle,
    overflow: 'hidden',
  },
  // Indeterminate: a fixed segment; the spinner carries the motion.
  bar: { width: '40%', height: 4, backgroundColor: theme.colors.primary },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[6] },
  error: { flex: 1, fontSize: theme.type.body.sm.size, color: theme.colors.error },
}));
