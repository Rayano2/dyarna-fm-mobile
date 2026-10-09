import { tokens } from './tokens';

function makeTheme(colorMode: 'light' | 'dark') {
  const c = tokens.colors[colorMode];
  return {
    name: colorMode,
    colors: {
      primary: c.brand[600],
      primaryMuted: c.brand[500],
      primaryPressed: c.brand[900],
      primaryHover: c.brand[700],
      primaryDisabled: c.brand[300],
      primarySubtle: c.brand[100],
      primaryFaint: c.brand[50],
      bg: c.surface.canvas,
      surface: c.surface.raised,
      surfaceElevated: c.surface.elevated,
      overlay: c.surface.overlay,
      // Lightbox-only pair — same value in both themes (see tokens.ts).
      scrim: c.scrim.base,
      textOnScrim: c.scrim.text,
      textPrimary: c.ink[800],
      textSecondary: c.ink[600],
      textMuted: c.ink[400],
      textDisabled: c.ink[200],
      textOnPrimary: colorMode === 'light' ? '#FFFFFF' : c.ink[950],
      borderSubtle: c.ink[100],
      borderHairline: c.ink[50],
      borderStrong: c.ink[200],
      gold: c.gold[600],
      goldSubtle: c.gold[100],
      terracotta: c.terracotta[600],
      terracottaSubtle: c.terracotta[100],
      success: c.feedback.success,
      error: c.feedback.error,
      warning: c.feedback.warning,
      info: c.feedback.info,
      infoSubtle: c.feedback.infoSubtle,
      like: '#F91880',
    },
    spacing: tokens.spacing,
    radius: tokens.radius,
    shadows: tokens.shadows,
    type: tokens.type,
    motion: tokens.motion,
  };
}

export const lightTheme = makeTheme('light');
export const darkTheme = makeTheme('dark');
export type AppTheme = typeof lightTheme;
