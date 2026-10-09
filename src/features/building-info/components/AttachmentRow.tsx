import { memo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import type { TFunction } from 'i18next';
import { safeNumberFormat } from '@/shared/lib/safe-intl';
import { HapticPressable, Icons, useRtlTextStyle } from '@/shared/ui';
import type { BuildingInfoAttachment } from '../api/building-info-api';

export interface AttachmentRowProps {
  attachment: BuildingInfoAttachment;
  opening: boolean;
  deleting: boolean;
  onOpen: (attachment: BuildingInfoAttachment) => void;
  onDelete: (attachment: BuildingInfoAttachment) => void;
}

/** Copied from dyarna-rn `AttachmentRow.formatFileSize` (reuses the resident `buildingInfo.detail.*` keys). */
export function formatFileSize(bytes: number, t: TFunction): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  const kb = bytes / 1024;
  if (kb < 1024) {
    return t('buildingInfo.detail.fileSizeKb', {
      size: safeNumberFormat(Math.max(1, Math.round(kb))),
    });
  }
  return t('buildingInfo.detail.fileSizeMb', {
    size: safeNumberFormat(kb / 1024, { maximumFractionDigits: 1 }),
  });
}

/** Adapted from dyarna-rn `AttachmentRow`: FM adds a delete button next to open. */
function AttachmentRowImpl({
  attachment,
  opening,
  deleting,
  onOpen,
  onDelete,
}: AttachmentRowProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const rtlText = useRtlTextStyle();
  const size = formatFileSize(attachment.sizeBytes, t);
  const busy = opening || deleting;

  return (
    <View style={[styles.row, busy && styles.rowPending]}>
      <HapticPressable
        onPress={() => onOpen(attachment)}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={t('fm.buildingInfo.openA11y', { name: attachment.originalFilename })}
        accessibilityState={{ disabled: busy, busy: opening }}
        scaleOnPress={1}
        style={styles.open}
      >
        <Icons.FileText size={20} color={theme.colors.textSecondary} weight="regular" />
        <View style={styles.text}>
          <Text style={[styles.filename, rtlText]} numberOfLines={1} ellipsizeMode="middle">
            {attachment.originalFilename}
          </Text>
          {size ? <Text style={styles.size}>{size}</Text> : null}
        </View>
        {opening ? <ActivityIndicator size="small" color={theme.colors.textMuted} /> : null}
      </HapticPressable>
      <HapticPressable
        onPress={() => onDelete(attachment)}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={t('fm.buildingInfo.deleteFileA11y', {
          name: attachment.originalFilename,
        })}
        accessibilityState={{ disabled: busy, busy: deleting }}
        hitSlop={4}
        style={styles.delete}
      >
        {deleting ? (
          <ActivityIndicator size="small" color={theme.colors.textMuted} />
        ) : (
          <Icons.Trash size={18} color={theme.colors.error} weight="regular" />
        )}
      </HapticPressable>
    </View>
  );
}

export const AttachmentRow = memo(AttachmentRowImpl);

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderHairline,
    paddingStart: theme.spacing[12],
    minHeight: 56,
  },
  rowPending: { opacity: 0.6 },
  open: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[12],
    minHeight: 56,
  },
  text: { flex: 1, gap: theme.spacing[2] },
  filename: {
    fontSize: theme.type.body.md.size,
    lineHeight: theme.type.body.md.lineHeight,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  // File sizes read left-to-right in both locales.
  size: {
    writingDirection: 'ltr',
    fontSize: theme.type.body.sm.size,
    color: theme.colors.textMuted,
  },
  delete: { width: 48, height: 56, alignItems: 'center', justifyContent: 'center' },
}));
