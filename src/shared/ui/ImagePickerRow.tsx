import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { CachedImage } from './CachedImage';
import { HapticPressable } from './HapticPressable';
import * as Icons from './icons';
import { useToastStore } from '@/shared/stores/toastStore';
import { logger } from '@/shared/lib/logger';

/** A locally-picked attachment (image or document) queued for upload.
 *  Feature compose schemas (posts, tickets, marketplace) validate against
 *  this same shape. */
export interface ComposeImage {
  uri: string;
  fileName: string;
  mimeType: string;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // match Flutter

export interface ImagePickerRowProps {
  images: ComposeImage[];
  onChange: (next: ComposeImage[]) => void;
  max: number;
}

export function ImagePickerRow({ images, onChange, max }: ImagePickerRowProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const [choicesOpen, setChoicesOpen] = useState(false);
  const toast = useToastStore((s) => s.push);

  async function pickFromLibrary() {
    setChoicesOpen(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast({ variant: 'error', title: t('errors.photoAccessDenied') });
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: Math.max(0, max - images.length),
    });
    if (res.canceled) return;
    append(res.assets);
  }

  async function pickFromCamera() {
    setChoicesOpen(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      toast({ variant: 'error', title: t('errors.cameraAccessDenied') });
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (res.canceled) return;
    append(res.assets);
  }

  async function pickDocument() {
    setChoicesOpen(false);
    const res = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    const additions: ComposeImage[] = [];
    for (const a of res.assets) {
      if (images.length + additions.length >= max) break;
      if (typeof a.size === 'number' && a.size > MAX_FILE_SIZE_BYTES) {
        toast({ variant: 'warning', title: t('posts.compose.fileTooLarge') });
        continue;
      }
      const name = a.name && a.name.length > 0 ? a.name : deriveFileName(a.uri);
      const type = a.mimeType && a.mimeType.length > 0 ? a.mimeType : 'application/octet-stream';
      additions.push({ uri: a.uri, fileName: name, mimeType: type });
    }
    if (additions.length > 0) {
      onChange([...images, ...additions]);
    }
  }

  function append(assets: ImagePicker.ImagePickerAsset[]) {
    const additions: ComposeImage[] = [];
    for (const a of assets) {
      if (images.length + additions.length >= max) break;
      if (typeof a.fileSize === 'number' && a.fileSize > MAX_FILE_SIZE_BYTES) {
        toast({ variant: 'warning', title: t('posts.compose.fileTooLarge') });
        continue;
      }
      const name = a.fileName && a.fileName.length > 0 ? a.fileName : deriveFileName(a.uri);
      const type = a.mimeType && a.mimeType.length > 0 ? a.mimeType : 'image/jpeg';
      additions.push({ uri: a.uri, fileName: name, mimeType: type });
    }
    if (additions.length > 0) {
      onChange([...images, ...additions]);
    }
  }

  // Android may destroy the hosting Activity while the camera/gallery is in
  // the foreground — under memory pressure, or always when "Don't keep
  // activities" is on in developer options. The picker still completes, but
  // our process is gone by the time it does, so the photo is lost AND the
  // whole in-progress compose draft with it. `getPendingResultAsync` hands
  // back exactly that dropped result on the next launch; without this call
  // nothing else in the app recovers it.
  //
  // Kept in a "latest ref" so the result is appended to the images as they
  // are when the promise settles, not as they were at mount — the user can
  // add attachments while this is still in flight, and appending against a
  // stale array would silently drop them.
  const appendRef = useRef(append);
  useEffect(() => {
    appendRef.current = append;
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        // Resolves to null on every platform except Android.
        const pending = await ImagePicker.getPendingResultAsync();
        if (cancelled || !pending) return;
        // The union also carries ImagePickerErrorResult ({ code, message }),
        // which has no `canceled` field — narrow before touching assets.
        if (!('canceled' in pending)) {
          logger.warn('Pending image-picker result returned an error', pending);
          return;
        }
        if (pending.canceled) return;
        appendRef.current(pending.assets);
      } catch (error) {
        // Never let recovery break mounting the compose screen: failing to
        // recover a photo is exactly the status quo this improves on.
        logger.warn('getPendingResultAsync failed', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function remove(uri: string) {
    onChange(images.filter((i) => i.uri !== uri));
  }

  const canAdd = images.length < max;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {images.map((img) => {
          const isImage = img.mimeType.startsWith('image/');
          return (
            <View key={img.uri} style={styles.tile}>
              {isImage ? (
                <CachedImage source={{ uri: img.uri }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.fileTile]}>
                  <Icons.FileText size={28} color={theme.colors.textSecondary} weight="regular" />
                  <Text numberOfLines={2} style={styles.fileTileText}>
                    {img.fileName}
                  </Text>
                </View>
              )}
              <HapticPressable
                onPress={() => remove(img.uri)}
                style={styles.removeChip}
                accessibilityRole="button"
                accessibilityLabel={t('posts.compose.removeImage')}
                hitSlop={8}
              >
                <Icons.X size={14} color={theme.colors.textOnPrimary} weight="bold" />
              </HapticPressable>
            </View>
          );
        })}
        {canAdd ? (
          <HapticPressable
            onPress={() => setChoicesOpen((v) => !v)}
            style={[styles.tile, styles.addTile]}
            accessibilityRole="button"
            accessibilityLabel={t('posts.compose.addImage')}
          >
            <Icons.Plus size={24} color={theme.colors.textSecondary} weight="regular" />
          </HapticPressable>
        ) : null}
      </ScrollView>
      {choicesOpen ? (
        <View style={styles.choices}>
          <HapticPressable onPress={pickFromCamera} style={styles.choiceRow}>
            <Icons.Camera size={18} color={theme.colors.textPrimary} weight="regular" />
            <Text style={styles.choiceText}>{t('posts.compose.takePhoto')}</Text>
          </HapticPressable>
          <HapticPressable onPress={pickFromLibrary} style={styles.choiceRow}>
            <Icons.Image size={18} color={theme.colors.textPrimary} weight="regular" />
            <Text style={styles.choiceText}>{t('posts.compose.chooseFromLibrary')}</Text>
          </HapticPressable>
          <HapticPressable onPress={pickDocument} style={styles.choiceRow}>
            <Icons.FileText size={18} color={theme.colors.textPrimary} weight="regular" />
            <Text style={styles.choiceText}>{t('posts.compose.attachFile')}</Text>
          </HapticPressable>
        </View>
      ) : null}
    </View>
  );
}

function deriveFileName(uri: string): string {
  const last = uri.split('/').pop() ?? 'image.jpg';
  return last.includes('.') ? last : `${last}.jpg`;
}

const styles = StyleSheet.create((theme) => ({
  wrapper: { gap: theme.spacing[8] },
  row: {
    gap: theme.spacing[8],
    paddingHorizontal: theme.spacing[24],
  },
  tile: {
    width: 84,
    height: 84,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
  },
  thumb: { width: '100%', height: '100%' },
  fileTile: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing[6],
    gap: 4,
  },
  fileTileText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  addTile: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeChip: {
    position: 'absolute',
    top: 4,
    end: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(64, 61, 56, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choices: {
    marginHorizontal: theme.spacing[24],
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    paddingVertical: theme.spacing[4],
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[12],
    paddingHorizontal: theme.spacing[16],
    paddingVertical: theme.spacing[12],
  },
  choiceText: {
    fontSize: theme.type.body.md.size,
    color: theme.colors.textPrimary,
  },
}));
