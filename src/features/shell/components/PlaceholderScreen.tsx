import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';
import { EmptyState, Screen } from '@/shared/ui';
import { ShellHeader } from './ShellHeader';

export interface PlaceholderScreenProps {
  /** Header title, already translated. */
  title: string;
  /** Screens reached from More / the bell get a back button; tab roots don't. */
  showBack?: boolean;
  showBell?: boolean;
  /** Extra content under the empty state (e.g. the Settings logout row). */
  footer?: React.ReactNode;
  testID?: string;
}

/** "Coming soon" body shared by every FM route until its feature ticket lands. */
export function PlaceholderScreen({
  title,
  showBack = false,
  showBell = true,
  footer,
  testID,
}: PlaceholderScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    // ShellHeader owns the top inset and the absolute TabBar the bottom one.
    <Screen edges={[]} keyboardAvoiding={false} {...(testID ? { testID } : {})}>
      <ShellHeader title={title} showBack={showBack} showBell={showBell} />
      <View style={styles.body}>
        <EmptyState title={t('fm.placeholder.title')} body={t('fm.placeholder.body')} />
      </View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  body: { flex: 1, justifyContent: 'center' },
  // Clears the absolutely positioned tab bar.
  footer: { paddingBottom: theme.spacing[96] },
}));
