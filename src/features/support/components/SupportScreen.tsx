import { useMemo, useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { ShellHeader } from '@/features/shell';
import { ltr } from '@/shared/lib/bidi';
import { useToastStore } from '@/shared/stores/toastStore';
import {
  Card,
  Divider,
  HapticPressable,
  Icons,
  Screen,
  SettingsRow,
  RTL_INLINE,
  useIsRtl,
  useRtlTextStyle,
} from '@/shared/ui';
import {
  SUPPORT_FAQ_IDS,
  getSupportChannels,
  type SupportChannelId,
  type SupportFaqId,
} from '../lib/support-content';

const CHANNEL_ICONS: Record<SupportChannelId, typeof Icons.Envelope> = {
  whatsapp: Icons.WhatsappLogo,
  email: Icons.Envelope,
  phone: Icons.Phone,
};

export function SupportScreen() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const rtlText = useRtlTextStyle();
  const isRtl = useIsRtl();
  const push = useToastStore((s) => s.push);
  const [openId, setOpenId] = useState<SupportFaqId | null>(null);
  const prefill = t('fm.support.contact.whatsappPrefill');
  const channels = useMemo(() => getSupportChannels(prefill), [prefill]);

  const open = async (url: string): Promise<void> => {
    try {
      await Linking.openURL(url);
    } catch {
      push({ variant: 'error', title: t('fm.support.openFailed') });
    }
  };

  return (
    // ShellHeader owns the top inset and the absolute TabBar the bottom one.
    <Screen edges={[]} keyboardAvoiding={false} testID="fm-support-screen">
      <ShellHeader title={t('fm.support.title')} showBack />
      <ScrollView contentContainerStyle={styles.content}>
        {channels.length > 0 ? (
          <Card style={styles.card} testID="support-contact">
            <Text style={[styles.sectionTitle, rtlText]} accessibilityRole="header">
              {t('fm.support.contactTitle')}
            </Text>
            {channels.map((channel) => {
              const Icon = CHANNEL_ICONS[channel.id];
              return (
                <SettingsRow
                  key={channel.id}
                  icon={<Icon size={20} color={theme.colors.textSecondary} />}
                  label={t(`fm.support.contact.${channel.id}`)}
                  value={ltr(channel.display)}
                  chevron
                  onPress={() => {
                    void open(channel.url);
                  }}
                />
              );
            })}
          </Card>
        ) : null}

        <Card style={styles.card} testID="support-faq">
          <Text style={[styles.sectionTitle, rtlText]} accessibilityRole="header">
            {t('fm.support.faqTitle')}
          </Text>
          {SUPPORT_FAQ_IDS.map((id, index) => {
            const expanded = openId === id;
            return (
              <View key={id}>
                {index > 0 ? <Divider /> : null}
                <HapticPressable
                  onPress={() => setOpenId(expanded ? null : id)}
                  scaleOnPress={1}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  style={styles.trigger}
                  testID={`support-faq-${id}`}
                >
                  <Text style={[styles.question, isRtl ? RTL_INLINE : null]}>
                    {t(`fm.support.faq.items.${id}.question`)}
                  </Text>
                  <View style={expanded ? styles.caretOpen : null}>
                    <Icons.CaretDown size={18} color={theme.colors.textSecondary} />
                  </View>
                </HapticPressable>
                {expanded ? (
                  <Text style={[styles.answer, rtlText]}>
                    {t(`fm.support.faq.items.${id}.answer`)}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  // paddingBottom clears the absolutely positioned tab bar.
  content: {
    padding: theme.spacing[16],
    paddingBottom: theme.spacing[96],
    gap: theme.spacing[16],
  },
  card: { gap: theme.spacing[8] },
  sectionTitle: {
    fontSize: theme.type.label.lg.size,
    lineHeight: theme.type.label.lg.lineHeight,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[12],
    minHeight: 44,
    paddingVertical: theme.spacing[12],
  },
  question: {
    flex: 1,
    fontSize: theme.type.body.md.size,
    lineHeight: theme.type.body.md.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  caretOpen: { transform: [{ rotate: '180deg' }] },
  answer: {
    fontSize: theme.type.body.md.size,
    lineHeight: theme.type.body.md.lineHeight,
    color: theme.colors.textSecondary,
    paddingBottom: theme.spacing[12],
  },
}));
