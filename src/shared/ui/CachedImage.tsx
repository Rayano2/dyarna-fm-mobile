import { Image as ExpoImage, type ImageContentFit, type ImageProps } from 'expo-image';

// Drop-in for `Image` from 'react-native' with disk + memory caching, a soft
// fade-in transition, and `resizeMode` translated to expo-image's `contentFit`
// so existing call sites don't need to learn a new prop. Centralised so any
// future change (Sentry image-fail breadcrumbs, switch to blurhash placeholders,
// global cache policy tuning) is one edit.

type RNResizeMode = 'cover' | 'contain' | 'stretch' | 'center' | 'repeat';

const RESIZE_TO_CONTENT_FIT: Record<RNResizeMode, ImageContentFit> = {
  cover: 'cover',
  contain: 'contain',
  stretch: 'fill',
  center: 'none',
  repeat: 'cover',
};

export interface CachedImageProps extends Omit<ImageProps, 'contentFit'> {
  resizeMode?: RNResizeMode;
}

export function CachedImage({ resizeMode, transition, cachePolicy, ...rest }: CachedImageProps) {
  return (
    <ExpoImage
      contentFit={resizeMode ? RESIZE_TO_CONTENT_FIT[resizeMode] : 'cover'}
      cachePolicy={cachePolicy ?? 'memory-disk'}
      transition={transition ?? 150}
      {...rest}
    />
  );
}
