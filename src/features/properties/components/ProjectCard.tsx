import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Badge, Button, Card, HapticPressable, Icons, useRtlTextStyle } from '@/shared/ui';
import type { PropertyProject } from '../api/mappers';
import { projectStats } from '../lib/occupancy';
import { OccupancyBar } from './OccupancyBar';

export interface ProjectCardProps {
  project: PropertyProject;
  onOpen: (project: PropertyProject) => void;
  onAssignPresident: (project: PropertyProject) => void;
}

export function ProjectCard({
  project,
  onOpen,
  onAssignPresident,
}: ProjectCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const rtlText = useRtlTextStyle();
  const stats = projectStats(project);
  const counts = `${t('fm.properties.buildings', { count: stats.buildings })} · ${t(
    'fm.properties.units',
    { count: stats.units },
  )}`;
  const occupancy = t('fm.properties.occupiedOf', { occupied: stats.occupied, total: stats.units });

  return (
    <Card style={styles.card}>
      {/* Only the summary opens the project; the president control is a
          sibling so screen readers can reach it on its own. */}
      <HapticPressable
        onPress={() => onOpen(project)}
        accessibilityRole="button"
        accessibilityLabel={[project.projectName, project.cityCode, counts, occupancy]
          .filter(Boolean)
          .join(', ')}
        style={styles.summary}
        testID={`property-project-${project.projectId}`}
      >
        <View style={styles.topRow}>
          <View style={styles.iconBox}>
            <Icons.Buildings size={20} color={theme.colors.primary} weight="regular" />
          </View>
          <View style={styles.titleBlock}>
            <Text style={[styles.name, rtlText]} numberOfLines={2}>
              {project.projectName}
            </Text>
            {project.cityCode ? (
              <View style={styles.cityRow}>
                <Icons.MapPin size={14} color={theme.colors.textMuted} weight="regular" />
                <Text style={[styles.muted, rtlText]} numberOfLines={1}>
                  {project.cityCode}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <Text style={[styles.counts, rtlText]}>{counts}</Text>
        <OccupancyBar ratio={stats.ratio} caption={occupancy} />
      </HapticPressable>
      <View style={styles.president}>
        {project.president?.nameAvailable ? (
          <Badge
            tone="primarySubtle"
            size="md"
            icon={<Icons.Star size={12} color={theme.colors.primary} weight="fill" />}
            label={`${t('fm.properties.president')}: ${project.president.fullName}`}
            numberOfLines={1}
          />
        ) : project.president ? (
          // A president exists but BMS couldn't resolve the name: never offer
          // to assign one, just say the name is missing.
          <View
            style={styles.presidentRow}
            accessible
            accessibilityLabel={`${t('fm.properties.president')}: ${t('fm.properties.nameUnavailable')}`}
            testID={`president-name-unavailable-${project.projectId}`}
          >
            <Badge
              tone="primarySubtle"
              size="md"
              icon={<Icons.Star size={12} color={theme.colors.primary} weight="fill" />}
              label={t('fm.properties.president')}
              numberOfLines={1}
            />
            <Text style={[styles.muted, rtlText]} numberOfLines={1}>
              {t('fm.properties.nameUnavailable')}
            </Text>
          </View>
        ) : (
          <Button
            label={t('fm.properties.assignPresident')}
            variant="secondary"
            size="sm"
            hitSlop={4}
            leadingIcon={<Icons.UserPlus size={16} color={theme.colors.primary} />}
            onPress={() => onAssignPresident(project)}
            testID={`assign-president-${project.projectId}`}
          />
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: { gap: theme.spacing[12] },
  summary: { gap: theme.spacing[12] },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[12] },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: { flex: 1, gap: theme.spacing[2] },
  name: {
    fontSize: theme.type.heading.md.size,
    lineHeight: theme.type.heading.md.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[4] },
  muted: { fontSize: theme.type.body.sm.size, color: theme.colors.textMuted },
  counts: { fontSize: theme.type.body.sm.size, color: theme.colors.textSecondary },
  president: { flexDirection: 'row', alignItems: 'center' },
  presidentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[8],
    flexShrink: 1,
  },
}));
