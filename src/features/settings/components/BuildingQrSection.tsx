import { useMemo, useRef, useState } from 'react';
import { Share, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useProjectsBuildingsFilter } from '@/shared/hooks/useProjectsBuildingsFilter';
import { ltr } from '@/shared/lib/bidi';
import {
  Button,
  Icons,
  SettingsRow,
  Skeleton,
  RTL_INLINE,
  useIsRtl,
  type BottomSheetRef,
} from '@/shared/ui';
import { resolveQrSelection } from '../lib/building-qr';
import { PickerSheet } from './PickerSheet';
import { SettingsSection } from './SettingsSection';

const QR_SIZE = 180;

function shareCode(code: string): void {
  // A dismissed share sheet is not an error; a failed one has nothing to retry.
  Share.share({ message: code }).catch(() => null);
}

export function BuildingQrSection() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const isRtl = useIsRtl();
  const filter = useProjectsBuildingsFilter();
  const projectSheet = useRef<BottomSheetRef>(null);
  const buildingSheet = useRef<BottomSheetRef>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [buildingCode, setBuildingCode] = useState<string | null>(null);

  const projects = useMemo(() => filter.data ?? [], [filter.data]);
  const { project, building } = resolveQrSelection(projects, projectId, buildingCode);
  const projectOptions = projects.map((p) => ({
    key: String(p.projectId),
    label: p.projectName || String(p.projectId),
  }));
  const buildingOptions = (project?.buildings ?? []).map((b) => ({
    key: b.buildingCode,
    label: `${b.buildingName} (${ltr(b.buildingCode)})`,
  }));

  let body: React.ReactNode;
  if (filter.isPending) {
    body = (
      <View style={styles.stack} testID="settings-qr-loading">
        <Skeleton height={44} />
        <Skeleton height={44} />
        <View style={styles.center}>
          <Skeleton width={QR_SIZE} height={QR_SIZE} radius={theme.radius.md} />
        </View>
      </View>
    );
  } else if (filter.isError && !filter.data) {
    body = (
      <View style={styles.stack} testID="settings-qr-error">
        <View style={styles.messageRow}>
          <Icons.Warning size={18} color={theme.colors.error} />
          <Text style={[styles.message, isRtl ? RTL_INLINE : null]}>
            {t('fm.settings.buildingQrError')}
          </Text>
        </View>
        <Button
          label={t('common.retry')}
          variant="secondary"
          size="sm"
          hitSlop={4}
          onPress={() => {
            void filter.refetch();
          }}
        />
      </View>
    );
  } else if (project) {
    body = (
      <View style={styles.stack}>
        <SettingsRow
          icon={<Icons.Buildings size={20} color={theme.colors.textSecondary} />}
          label={t('fm.settings.project')}
          value={project.projectName}
          chevron
          onPress={() => projectSheet.current?.present()}
        />
        {building ? (
          <>
            <SettingsRow
              icon={<Icons.House size={20} color={theme.colors.textSecondary} />}
              label={t('fm.settings.building')}
              value={building.buildingName}
              chevron
              onPress={() => buildingSheet.current?.present()}
            />
            <View
              style={styles.center}
              accessible
              accessibilityRole="image"
              accessibilityLabel={t('fm.settings.buildingQrA11y', {
                code: ltr(building.buildingCode),
              })}
              testID="settings-qr-code"
            >
              {/* Library defaults (black on white + quiet zone) stay scannable in dark mode. */}
              <QRCode value={building.buildingCode} size={QR_SIZE} quietZone={20} ecl="M" />
              <Text style={styles.code} selectable>
                {building.buildingCode}
              </Text>
            </View>
            <Button
              label={t('fm.settings.shareCode')}
              variant="secondary"
              leadingIcon={<Icons.Share size={18} color={theme.colors.textPrimary} />}
              onPress={() => shareCode(building.buildingCode)}
              testID="settings-qr-share"
            />
          </>
        ) : (
          <EmptyLine label={t('fm.settings.buildingQrEmpty')} />
        )}
      </View>
    );
  } else {
    body = <EmptyLine label={t('fm.settings.buildingQrEmpty')} />;
  }

  return (
    <SettingsSection title={t('fm.settings.buildingQrTitle')} testID="settings-qr-section">
      {body}
      <PickerSheet
        ref={projectSheet}
        title={t('fm.settings.project')}
        options={projectOptions}
        selectedKey={project ? String(project.projectId) : undefined}
        onSelect={(key) => {
          setProjectId(Number(key));
          setBuildingCode(null);
          projectSheet.current?.dismiss();
        }}
      />
      <PickerSheet
        ref={buildingSheet}
        title={t('fm.settings.building')}
        options={buildingOptions}
        selectedKey={building?.buildingCode}
        onSelect={(key) => {
          setBuildingCode(key);
          buildingSheet.current?.dismiss();
        }}
      />
    </SettingsSection>
  );
}

function EmptyLine({ label }: { label: string }) {
  const { theme } = useUnistyles();
  const isRtl = useIsRtl();
  return (
    <View style={styles.messageRow} testID="settings-qr-empty">
      <Icons.Buildings size={18} color={theme.colors.textMuted} />
      <Text style={[styles.message, isRtl ? RTL_INLINE : null]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  stack: { gap: theme.spacing[12] },
  center: { alignItems: 'center', gap: theme.spacing[8] },
  messageRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8] },
  message: {
    flex: 1,
    fontSize: theme.type.body.md.size,
    lineHeight: theme.type.body.md.lineHeight,
    color: theme.colors.textSecondary,
  },
  code: {
    fontSize: theme.type.body.md.size,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    writingDirection: 'ltr',
  },
}));
