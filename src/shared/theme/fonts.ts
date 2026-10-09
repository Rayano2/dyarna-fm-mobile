import {
  useFonts as useInter,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { InterTight_600SemiBold, InterTight_700Bold } from '@expo-google-fonts/inter-tight';
import { Fraunces_500Medium, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { Tajawal_400Regular, Tajawal_500Medium, Tajawal_700Bold } from '@expo-google-fonts/tajawal';
import {
  Almarai_400Regular,
  Almarai_700Bold,
  Almarai_800ExtraBold,
} from '@expo-google-fonts/almarai';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';

// Saudi Riyal Font (Emran Alhaddad, SIL OFL). Single-glyph font that maps
// the new SAR symbol to U+20C1 (and also to U+E900 for legacy callers).
// Required because the bundled Latin/Arabic body fonts don't include the
// 2025 Riyal glyph yet, so the OS otherwise renders tofu.
const SaudiRiyalRegular = require('../../../assets/fonts/SaudiRiyal-Regular.ttf');
const SaudiRiyalBold = require('../../../assets/fonts/SaudiRiyal-Bold.ttf');

export function useAppFonts() {
  return useInter({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'InterTight-SemiBold': InterTight_600SemiBold,
    'InterTight-Bold': InterTight_700Bold,
    'Fraunces-Medium': Fraunces_500Medium,
    'Fraunces-SemiBold': Fraunces_600SemiBold,
    'Tajawal-Regular': Tajawal_400Regular,
    'Tajawal-Medium': Tajawal_500Medium,
    'Tajawal-Bold': Tajawal_700Bold,
    'Almarai-Regular': Almarai_400Regular,
    'Almarai-Bold': Almarai_700Bold,
    'Almarai-ExtraBold': Almarai_800ExtraBold,
    'JetBrainsMono-Regular': JetBrainsMono_400Regular,
    saudi_riyal: SaudiRiyalRegular,
    saudi_riyal_bold: SaudiRiyalBold,
  });
}

type FontFamily = 'body' | 'headingTight' | 'display' | 'mono';
type FontWeight = '400' | '500' | '600' | '700';
type Locale = 'en' | 'ar';

const AR_MAP: Record<FontFamily, Partial<Record<FontWeight, string>> & { default: string }> = {
  body: {
    '500': 'Tajawal-Medium',
    '700': 'Tajawal-Bold',
    default: 'Tajawal-Regular',
  },
  headingTight: {
    '700': 'Almarai-ExtraBold',
    default: 'Almarai-Bold',
  },
  display: { default: 'Almarai-Bold' },
  mono: { default: 'JetBrainsMono-Regular' },
};

const EN_MAP: Record<FontFamily, Partial<Record<FontWeight, string>> & { default: string }> = {
  body: {
    '500': 'Inter-Medium',
    '600': 'Inter-SemiBold',
    '700': 'Inter-Bold',
    default: 'Inter-Regular',
  },
  headingTight: {
    '700': 'InterTight-Bold',
    default: 'InterTight-SemiBold',
  },
  display: {
    '600': 'Fraunces-SemiBold',
    default: 'Fraunces-Medium',
  },
  mono: { default: 'JetBrainsMono-Regular' },
};

export function resolveFontFamily(family: FontFamily, weight: FontWeight, locale: Locale): string {
  const map = locale === 'ar' ? AR_MAP[family] : EN_MAP[family];
  return map[weight] ?? map.default;
}
