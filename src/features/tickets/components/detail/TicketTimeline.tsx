import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';
import { langOf } from '../../lib/labels';
import { isTerminalStatus, isUnassigned } from '../../lib/ticket-status';
import type { FmTicketDetail } from '../../types';
import { formatAbsolute } from './format-absolute';

type StageState = 'complete' | 'current' | 'future';

export interface TimelineStage {
  key: string;
  labelKey: string;
  date: string | null;
  state: StageState;
}

/**
 * FM lifecycle: Created -> Assigned -> In progress -> Resolved / Closed / Not
 * actionable. Built from createdAt, the assignee (+ firstResponseAt, which the
 * backend stamps on assignment) and resolvedAt/closedAt.
 */
export function buildTimeline(ticket: FmTicketDetail): TimelineStage[] {
  const status = ticket.statusCode;
  const terminal = isTerminalStatus(status);
  const open = status === 'OPEN';
  const assigned = !isUnassigned(ticket) || !!ticket.firstResponseAt || !open;

  const stages: TimelineStage[] = [
    {
      key: 'created',
      labelKey: 'fm.tickets.timelineStage.created',
      date: ticket.createdAt || null,
      state: 'complete',
    },
    {
      key: 'assigned',
      labelKey: 'fm.tickets.timelineStage.assigned',
      date: assigned ? ticket.firstResponseAt : null,
      state: assigned ? 'complete' : 'current',
    },
    {
      key: 'inProgress',
      labelKey: 'fm.tickets.timelineStage.inProgress',
      date: null,
      state: terminal ? 'complete' : assigned && !open ? 'current' : 'future',
    },
  ];

  if (status === 'NOT_ACTIONABLE') {
    stages.push({
      key: 'end',
      labelKey: 'fm.tickets.timelineStage.notActionable',
      date: ticket.resolvedAt ?? ticket.closedAt,
      state: 'complete',
    });
  } else if (status === 'CLOSED' && !ticket.resolvedAt) {
    stages.push({
      key: 'end',
      labelKey: 'fm.tickets.timelineStage.closed',
      date: ticket.closedAt,
      state: 'complete',
    });
  } else {
    stages.push({
      key: 'end',
      labelKey: 'fm.tickets.timelineStage.resolved',
      date: ticket.resolvedAt,
      state: terminal ? 'complete' : 'future',
    });
  }
  return stages;
}

/** Ported from dyarna-rn `TicketTimeline.tsx` (dot + line layout), with FM stages. */
export function TicketTimeline({ ticket }: { ticket: FmTicketDetail }): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const lang = langOf(i18n.language);
  const stages = buildTimeline(ticket);

  return (
    <View style={styles.timeline}>
      {stages.map((stage, index) => {
        const isLast = index === stages.length - 1;
        const date = stage.date ? formatAbsolute(stage.date, lang) : '';
        return (
          <View key={stage.key} style={styles.stage}>
            <View style={styles.markerCol}>
              <Dot state={stage.state} />
              {isLast ? null : (
                <View
                  style={[
                    styles.line,
                    stage.state === 'complete' ? styles.lineComplete : styles.linePending,
                  ]}
                />
              )}
            </View>
            <View style={[styles.stageContent, isLast && styles.stageContentLast]}>
              <Text
                style={[styles.stageLabel, stage.state === 'future' && styles.stageLabelFuture]}
              >
                {t(stage.labelKey)}
              </Text>
              {date ? <Text style={styles.stageDate}>{date}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function Dot({ state }: { state: StageState }): React.JSX.Element {
  if (state === 'complete') {
    return (
      <View style={[styles.dot, styles.dotComplete]}>
        <View style={styles.dotInner} />
      </View>
    );
  }
  if (state === 'current') {
    return (
      <View style={[styles.dot, styles.dotCurrent]}>
        <View style={styles.dotCurrentInner} />
      </View>
    );
  }
  return <View style={[styles.dot, styles.dotFuture]} />;
}

const styles = StyleSheet.create((theme) => ({
  timeline: { gap: 0 },
  stage: {
    flexDirection: 'row',
    gap: theme.spacing[12],
    minHeight: 44,
  },
  markerCol: { width: 16, alignItems: 'center' },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  dotComplete: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary },
  dotInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.textOnPrimary,
  },
  dotCurrent: { borderColor: theme.colors.primary, backgroundColor: theme.colors.surface },
  dotCurrentInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  dotFuture: { borderColor: theme.colors.borderStrong, backgroundColor: theme.colors.surface },
  line: { flex: 1, width: 2, marginTop: 2 },
  lineComplete: { backgroundColor: theme.colors.primarySubtle },
  linePending: { backgroundColor: theme.colors.borderHairline },
  stageContent: { flex: 1, gap: 2, paddingBottom: theme.spacing[16] },
  stageContentLast: { paddingBottom: 0 },
  stageLabel: {
    fontSize: theme.type.body.md.size,
    lineHeight: theme.type.body.md.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  stageLabelFuture: { color: theme.colors.textMuted, fontWeight: '500' },
  stageDate: {
    fontSize: theme.type.body.sm.size,
    lineHeight: theme.type.body.sm.lineHeight,
    color: theme.colors.textMuted,
  },
}));
