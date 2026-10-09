import { useTranslation } from 'react-i18next';
import { useUnistyles } from 'react-native-unistyles';
import { Badge, Icons, type BadgeTone } from '@/shared/ui';
import { langOf, statusLabel } from '../lib/labels';
import type { FmTicket } from '../types';

type IconName = keyof typeof Icons;

const STATUS_STYLE: Record<string, { tone: BadgeTone; icon: IconName }> = {
  OPEN: { tone: 'gold', icon: 'Info' },
  ASSIGNED: { tone: 'info', icon: 'User' },
  IN_PROGRESS: { tone: 'primarySubtle', icon: 'Wrench' },
  ESCALATED: { tone: 'danger', icon: 'Flag' },
  RESOLVED: { tone: 'primary', icon: 'CheckCircle' },
  CLOSED: { tone: 'neutral', icon: 'Lock' },
  NOT_ACTIONABLE: { tone: 'neutral', icon: 'Prohibit' },
};

const FALLBACK = { tone: 'neutral' as BadgeTone, icon: 'Info' as IconName };

/** Foreground per tone, so the icon always matches the badge text. */
export function useToneForeground(): (tone: BadgeTone) => string {
  const { theme } = useUnistyles();
  return (tone) => {
    switch (tone) {
      case 'primary':
      case 'info':
      case 'danger': {
        return theme.colors.textOnPrimary;
      }
      case 'primarySubtle':
      case 'elevated': {
        return theme.colors.primary;
      }
      case 'gold': {
        return theme.colors.gold;
      }
      default: {
        return theme.colors.textSecondary;
      }
    }
  };
}

/** Status pill: icon + text, never colour alone. */
export function StatusBadge({
  ticket,
}: {
  ticket: Pick<FmTicket, 'statusCode' | 'statusNameAr' | 'statusNameEn'>;
}): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const fg = useToneForeground();
  const { tone, icon } = STATUS_STYLE[ticket.statusCode] ?? FALLBACK;
  const Icon = Icons[icon] as React.ComponentType<{ size: number; color: string; weight: 'bold' }>;
  return (
    <Badge
      size="sm"
      tone={tone}
      label={statusLabel(t, ticket, langOf(i18n.language))}
      icon={<Icon size={12} color={fg(tone)} weight="bold" />}
    />
  );
}
