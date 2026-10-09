import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';
import { formatRelativeTime } from '@/shared/lib/format-relative-time';
import { Skeleton } from '@/shared/ui';
import type { TicketComment } from '../../types';

/**
 * Read-only thread. The backend @JsonIgnore's the comment id and the author
 * name (`TicketCommentResponse.java`), so neither reaches the app; each row is
 * labelled by the author's role and keyed client-side.
 */
export function CommentsSection({
  comments,
  loading,
}: {
  comments: readonly TicketComment[];
  loading: boolean;
}): React.JSX.Element {
  const { t } = useTranslation();
  if (loading && comments.length === 0) {
    return (
      <View style={styles.list}>
        <Skeleton height={56} />
        <Skeleton height={56} />
      </View>
    );
  }
  if (comments.length === 0) {
    return <Text style={styles.empty}>{t('fm.tickets.noComments')}</Text>;
  }
  return (
    <View style={styles.list}>
      {comments.map((c) => (
        <View key={c.key} style={styles.comment}>
          <View style={styles.head}>
            <Text style={styles.author}>
              {t(`fm.tickets.role.${c.authorRole}`, { defaultValue: t('fm.tickets.role.UNKNOWN') })}
            </Text>
            {c.isInternal ? <Text style={styles.internal}>{t('fm.tickets.internal')}</Text> : null}
            <Text style={styles.time}>{formatRelativeTime(c.createdAt, t)}</Text>
          </View>
          <Text style={styles.body}>{c.body}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  list: { gap: theme.spacing[8] },
  comment: {
    padding: theme.spacing[12],
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.borderHairline,
    gap: theme.spacing[4],
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8] },
  author: {
    flex: 1,
    fontSize: theme.type.label.lg.size,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  internal: {
    fontSize: theme.type.label.md.size,
    color: theme.colors.gold,
    fontWeight: '600',
  },
  time: { fontSize: theme.type.label.md.size, color: theme.colors.textMuted },
  body: {
    fontSize: theme.type.body.md.size,
    lineHeight: theme.type.body.md.lineHeight,
    color: theme.colors.textPrimary,
  },
  empty: { fontSize: theme.type.body.sm.size, color: theme.colors.textMuted },
}));
