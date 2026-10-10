import { useTranslation } from 'react-i18next';
import { useUnistyles } from 'react-native-unistyles';
import { Badge, Icons, type BadgeTone } from '@/shared/ui';
import { priorityLabel } from '../lib/labels';
import { useToneForeground } from './StatusBadge';

type IconName = keyof typeof Icons;

const PRIORITY_STYLE: Record<string, { tone: BadgeTone; icon: IconName }> = {
  LOW: { tone: 'neutral', icon: 'CaretDown' },
  MEDIUM: { tone: 'goldMuted', icon: 'Info' },
  HIGH: { tone: 'gold', icon: 'Warning' },
  URGENT: { tone: 'danger', icon: 'Lightning' },
  // bms-tms V6 lookup code.
  CRITICAL: { tone: 'danger', icon: 'Lightning' },
  EMERGENCY: { tone: 'danger', icon: 'Lightning' },
};

/** Accent-bar colour per priority (the card's start stripe). */
export function usePriorityColor(): (code: string) => string {
  const { theme } = useUnistyles();
  return (code) => {
    switch (code) {
      case 'URGENT':
      case 'CRITICAL':
      case 'EMERGENCY': {
        return theme.colors.error;
      }
      case 'HIGH': {
        return theme.colors.warning;
      }
      case 'MEDIUM': {
        return theme.colors.gold;
      }
      default: {
        return theme.colors.borderStrong;
      }
    }
  };
}

export function PriorityBadge({ code }: { code: string }): React.JSX.Element | null {
  const { t } = useTranslation();
  const fg = useToneForeground();
  if (!code) return null;
  const { tone, icon } = PRIORITY_STYLE[code] ?? {
    tone: 'neutral' as BadgeTone,
    icon: 'Info' as IconName,
  };
  const Icon = Icons[icon] as React.ComponentType<{ size: number; color: string; weight: 'bold' }>;
  return (
    <Badge
      size="sm"
      tone={tone}
      label={priorityLabel(t, code)}
      icon={<Icon size={12} color={fg(tone)} weight="bold" />}
    />
  );
}
