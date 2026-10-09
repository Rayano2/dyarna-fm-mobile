import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
// Not in the shared icon set; imported directly to keep shared/ui untouched.
import { Funnel } from 'phosphor-react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { HapticPressable, Icons } from '@/shared/ui';

export interface TicketSearchRowProps {
  /** The applied search (from the filters store). */
  value: string;
  onSubmit: (ticketNo: string) => void;
  filterCount: number;
  onFilterPress: () => void;
  onSortPress: () => void;
  disabled: boolean;
}

/**
 * Ticket-number search, submitted explicitly on the return key (as the web),
 * plus the Filter (with a count) and Sort buttons. Mirrors the shared
 * `SearchBar` look; it is not reused because `SearchBar` has no submit hook and
 * changing that shared component is outside this ticket.
 */
export function TicketSearchRow({
  value,
  onSubmit,
  filterCount,
  onFilterPress,
  onSortPress,
  disabled,
}: TicketSearchRowProps): React.JSX.Element {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const [draft, setDraft] = useState(value);

  // "Clear all" elsewhere resets the applied value; mirror it into the field.
  useEffect(() => setDraft(value), [value]);

  return (
    <View style={styles.row}>
      <View style={styles.field}>
        <Icons.MagnifyingGlass size={16} color={theme.colors.textMuted} weight="regular" />
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => onSubmit(draft)}
          placeholder={t('fm.tickets.searchPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
          autoCorrect={false}
          autoCapitalize="characters"
          returnKeyType="search"
          clearButtonMode="never"
          accessibilityLabel={t('fm.tickets.searchPlaceholder')}
          testID="fm-tickets-search"
        />
        {draft.length > 0 ? (
          <HapticPressable
            onPress={() => {
              setDraft('');
              onSubmit('');
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('common.clear')}
            scaleOnPress={1}
          >
            <Icons.XCircle size={18} color={theme.colors.textMuted} weight="fill" />
          </HapticPressable>
        ) : null}
      </View>
      <HapticPressable
        onPress={onFilterPress}
        disabled={disabled}
        style={styles.iconButton}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        accessibilityLabel={t('fm.tickets.a11y.filterButton', { count: filterCount })}
        testID="fm-tickets-filter-button"
      >
        <Funnel size={20} color={theme.colors.textPrimary} weight="regular" />
        {filterCount > 0 ? (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{filterCount}</Text>
          </View>
        ) : null}
      </HapticPressable>
      <HapticPressable
        onPress={onSortPress}
        disabled={disabled}
        style={styles.iconButton}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        accessibilityLabel={t('fm.tickets.sort.title')}
        testID="fm-tickets-sort-button"
      >
        <Icons.SortAscending size={20} color={theme.colors.textPrimary} weight="regular" />
      </HapticPressable>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[8],
    paddingHorizontal: theme.spacing[16],
    paddingBottom: theme.spacing[8],
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[8],
    paddingHorizontal: theme.spacing[12],
    minHeight: 44,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
  },
  input: {
    flex: 1,
    fontSize: theme.type.body.md.size,
    color: theme.colors.textPrimary,
    paddingVertical: 0,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadge: {
    position: 'absolute',
    top: 2,
    end: 2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: theme.spacing[4],
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textOnPrimary,
  },
}));
