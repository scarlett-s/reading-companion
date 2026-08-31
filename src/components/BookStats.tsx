import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/theme';

interface BookStatsProps {
  /** 自上次阅读过去了多少天 */
  lastOpenDays?: number | null;
  /** 已读天数 */
  readDays: number;
  /** 阅读进度百分比 0-100 */
  progressPct?: number | null;
}

export default function BookStats({ lastOpenDays, readDays, progressPct }: BookStatsProps) {
  return (
    <View style={styles.row}>
      <StatCell
        label="距上次阅读日"
        value={lastOpenDays != null ? `${lastOpenDays}` : '—'}
      />
      <StatCell label="阅读天数" value={`${readDays}`} />
      <StatCell
        label="阅读进度"
        value={progressPct != null ? `${Math.round(progressPct)}%` : '—'}
      />
    </View>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    gap: spacing.md,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    ...typography.micro,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  value: {
    ...typography.bodyStrong,
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});