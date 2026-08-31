import { View, Text, StyleSheet } from 'react-native';
import { Reflection } from '@/types';
import { colors, spacing, radius, typography } from '@/theme';

interface AIInsightCardProps {
  reflection: Reflection;
  isFirst?: boolean;
}

function tsToDateString(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function AIInsightCard({ reflection }: AIInsightCardProps) {
  const createdDate = tsToDateString(reflection.createdAt);

  return (
    <View style={styles.dateGroup}>
      <Text style={styles.dateHeader}>{createdDate}</Text>
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.cardProgress}>AI 洞察</Text>
          <Text style={styles.cardDate}>{createdDate}</Text>
        </View>
        <Text style={styles.cardBody} numberOfLines={4}>
          {reflection.content}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={styles.expandText}>展开</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dateGroup: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  dateHeader: {
    ...typography.caption,
    color: colors.textSubtle,
    fontWeight: '400',
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: '#EAF3E4',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    gap: spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardProgress: {
    color: '#3F6B2A',
    fontSize: 11,
    fontWeight: '700',
  },
  cardDate: {
    ...typography.micro,
    fontSize: 11,
    color: colors.text,
  },
  cardBody: {
    ...typography.caption,
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 2,
  },
  expandText: {
    color: '#3F6B2A',
    fontSize: 11,
    fontWeight: '500',
  },
});