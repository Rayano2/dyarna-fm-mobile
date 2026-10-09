import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { CachedImage, HapticPressable, Icons, ImageViewer } from '@/shared/ui';
import { isImageAttachment } from '../../api/mappers';
import type { TicketAttachment } from '../../types';

/**
 * Ported from dyarna-rn `TicketDetail/AttachmentsGallery.tsx`. FM changes: a
 * 3-column thumbnail grid (not a hero/strip), images detected by media type OR
 * extension (as the web), non-images listed as file rows, and an empty state.
 */
export function AttachmentsGallery({
  attachments,
  onRetry,
}: {
  attachments: readonly TicketAttachment[];
  /** Presigned links expire: a broken image is fixed by refetching the ticket. */
  onRetry?: (() => void) | undefined;
}): React.JSX.Element {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const images = attachments.filter((a) => isImageAttachment(a));
  const files = attachments.filter((a) => !isImageAttachment(a));
  const urls = images.map((a) => a.downloadUrl);

  if (attachments.length === 0) {
    return <Text style={styles.empty}>{t('fm.tickets.noAttachments')}</Text>;
  }

  return (
    <View style={styles.column}>
      {images.length > 0 ? (
        <View style={styles.grid}>
          {images.map((a, i) => (
            <HapticPressable
              key={a.id}
              scaleOnPress={1}
              style={styles.cell}
              onPress={() => setViewerIndex(i)}
              accessibilityRole="imagebutton"
              accessibilityLabel={t('imageViewer.openA11y', { index: i + 1, total: urls.length })}
            >
              <CachedImage
                source={{ uri: a.downloadUrl }}
                style={styles.thumb}
                resizeMode="cover"
              />
            </HapticPressable>
          ))}
        </View>
      ) : null}
      {files.map((a) => (
        <HapticPressable
          key={a.id}
          style={styles.fileRow}
          onPress={() => void Linking.openURL(a.downloadUrl)}
          accessibilityRole="link"
          accessibilityLabel={a.fileName}
        >
          <Icons.FileText size={18} color={theme.colors.textSecondary} weight="regular" />
          <Text style={styles.fileName} numberOfLines={1}>
            {a.fileName}
          </Text>
        </HapticPressable>
      ))}
      <ImageViewer
        visible={viewerIndex !== null}
        images={urls}
        initialIndex={viewerIndex ?? 0}
        onClose={() => setViewerIndex(null)}
        {...(onRetry ? { onRetry } : {})}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  column: { gap: theme.spacing[8] },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[8],
  },
  // Three per row: (100% - 2 gaps) / 3, rounded down.
  cell: { width: '31%', aspectRatio: 1 },
  thumb: {
    width: '100%',
    height: '100%',
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.borderSubtle,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[8],
    minHeight: 44,
    paddingHorizontal: theme.spacing[12],
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderHairline,
  },
  fileName: {
    flex: 1,
    fontSize: theme.type.body.sm.size,
    color: theme.colors.textPrimary,
  },
  empty: {
    fontSize: theme.type.body.sm.size,
    color: theme.colors.textMuted,
  },
}));
