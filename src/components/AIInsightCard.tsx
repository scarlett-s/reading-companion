import { View, Text, StyleSheet } from 'react-native';
import { Reflection } from '@/types';

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
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  dateHeader: {
    color: '#9C9C9C',
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#eaf6e6',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardProgress: {
    color: '#388E3C',
    fontSize: 11,
    fontWeight: '700',
  },
  cardDate: {
    color: '#1a1a1a',
    fontSize: 11,
  },
  cardBody: {
    color: '#222',
    fontSize: 13,
    lineHeight: 19,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 2,
  },
  expandText: {
    color: '#388E3C',
    fontSize: 11,
    fontWeight: '500',
  },
});