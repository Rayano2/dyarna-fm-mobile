export const tokens = {
  colors: {
    light: {
      ink: {
        950: '#1A1712',
        800: '#2F2A23',
        600: '#5C5244',
        400: '#8A7E66',
        200: '#BEB3A0',
        100: '#D9CFBA',
        50: '#EDE6D5',
      },
      surface: {
        canvas: '#F5F2EA',
        raised: '#FDFBF5',
        elevated: '#FFFFFF',
        overlay: 'rgba(26,23,18,0.4)',
      },
      brand: {
        900: '#1F2A15',
        700: '#344226',
        600: '#445335',
        500: '#6B7D52',
        300: '#A8B892',
        100: '#DCE4CC',
        50: '#EEF1E6',
      },
      gold: { 600: '#B08B3F', 100: '#F4EBD0' },
      terracotta: { 600: '#B5634A', 100: '#F4DCD1' },
      feedback: {
        success: '#445335',
        error: '#B5634A',
        warning: '#B08B3F',
        info: '#4A6A8A',
        infoSubtle: '#E9EEF5',
      },
      // Photo-lightbox chrome. DELIBERATELY IDENTICAL in light and dark:
      // a full-screen image viewer is theme-independent, like the OS
      // viewers. `surface.overlay` is a 40-65% sheet scrim (too
      // transparent to isolate a photo) and `textOnPrimary` inverts in
      // dark mode, which would render the viewer's chrome dark-on-black.
      scrim: { base: 'rgba(0,0,0,0.92)', text: '#FFFFFF' },
    },
    dark: {
      ink: {
        950: '#F5F2EA',
        800: '#E8E3D4',
        600: '#B8AE96',
        400: '#756A54',
        200: '#403930',
        100: '#2A2420',
        50: '#1F1A14',
      },
      surface: {
        canvas: '#13110E',
        raised: '#1F1B16',
        elevated: '#26221C',
        overlay: 'rgba(0,0,0,0.65)',
      },
      brand: {
        900: '#1F2A15',
        700: '#445335',
        600: '#5A6E48',
        500: '#8A9A77',
        300: '#A8B892',
        100: '#344226',
        50: '#2A3420',
      },
      gold: { 600: '#D4A658', 100: '#4A3E28' },
      terracotta: { 600: '#D47B64', 100: '#4A3328' },
      feedback: {
        success: '#5A6E48',
        error: '#D47B64',
        warning: '#D4A658',
        info: '#6E90B3',
        infoSubtle: '#2A3542',
      },
      // Photo-lightbox chrome. DELIBERATELY IDENTICAL in light and dark:
      // a full-screen image viewer is theme-independent, like the OS
      // viewers. `surface.overlay` is a 40-65% sheet scrim (too
      // transparent to isolate a photo) and `textOnPrimary` inverts in
      // dark mode, which would render the viewer's chrome dark-on-black.
      scrim: { base: 'rgba(0,0,0,0.92)', text: '#FFFFFF' },
    },
  },
  spacing: {
    '2': 2,
    '4': 4,
    '6': 6,
    '8': 8,
    '12': 12,
    '16': 16,
    '20': 20,
    '24': 24,
    '32': 32,
    '40': 40,
    '48': 48,
    '64': 64,
    '80': 80,
    '96': 96,
  },
  radius: { sm: 8, md: 12, lg: 16, pill: 999 },
  shadows: {
    card: [
      { color: 'rgba(38, 34, 28, 0.04)', offsetY: 1, radius: 2 },
      { color: 'rgba(38, 34, 28, 0.06)', offsetY: 8, radius: 24 },
    ],
    buttonPrimary: [
      { color: 'rgba(68, 83, 53, 0.20)', offsetY: 2, radius: 4 },
      { color: 'rgba(68, 83, 53, 0.12)', offsetY: 8, radius: 20 },
    ],
    toast: [
      { color: 'rgba(38, 34, 28, 0.05)', offsetY: 2, radius: 4 },
      { color: 'rgba(38, 34, 28, 0.10)', offsetY: 12, radius: 32 },
    ],
    sheet: [
      { color: 'rgba(0, 0, 0, 0.08)', offsetY: -4, radius: 16 },
      { color: 'rgba(0, 0, 0, 0.12)', offsetY: -12, radius: 40 },
    ],
  },
  type: {
    display: {
      xl: { size: 40, lineHeight: 48, family: 'display', weight: '500', tracking: -0.015 },
      lg: { size: 32, lineHeight: 40, family: 'display', weight: '500', tracking: -0.01 },
    },
    heading: {
      xl: { size: 24, lineHeight: 32, family: 'headingTight', weight: '600', tracking: -0.005 },
      lg: { size: 20, lineHeight: 28, family: 'headingTight', weight: '600', tracking: -0.003 },
      md: { size: 17, lineHeight: 24, family: 'headingTight', weight: '600', tracking: 0 },
    },
    body: {
      lg: { size: 16, lineHeight: 26, family: 'body', weight: '400', tracking: 0 },
      md: { size: 15, lineHeight: 22, family: 'body', weight: '400', tracking: 0 },
      sm: { size: 13, lineHeight: 20, family: 'body', weight: '400', tracking: 0 },
    },
    label: {
      lg: { size: 14, lineHeight: 20, family: 'body', weight: '500', tracking: 0.02 },
      md: { size: 12, lineHeight: 16, family: 'body', weight: '500', tracking: 0.03 },
    },
    mono: {
      md: { size: 14, lineHeight: 20, family: 'mono', weight: '400', tracking: 0 },
    },
  },
  motion: {
    press: { scale: 0.98, duration: 120 },
    screenTransition: { forwardDurationMs: 300, backDurationMs: 250 },
    spring: { damping: 14, stiffness: 180 },
    listStaggerMs: 30,
  },
} as const;

export type Tokens = typeof tokens;
