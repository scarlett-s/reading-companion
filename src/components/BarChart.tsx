import { View, Text, StyleSheet } from 'react-native';
import { round2 } from '@/utils';
import { colors, radius, spacing } from '@/theme';

export interface BarDatum {
  label: string;
  value: number;
}

export default function BarChart({ data }: { data: BarDatum[] }) {
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  return (
    <View style={styles.root}>
      {data.length === 0 ? (
        <Text style={styles.empty}>本周期暂无进度</Text>
      ) : (
        data.map((d, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.label} numberOfLines={1}>
              {d.label}
            </Text>
            <View style={styles.track}>
              <View
                style={[
                  styles.bar,
                  {
                    width: `${(Math.abs(d.value) / max) * 100}%`,
                    backgroundColor: d.value >= 0 ? colors.primary : colors.danger,
                  },
                ]}
              />
            </View>
            <Text style={styles.value}>
              {d.value > 0 ? '+' : ''}
              {round2(d.value)}%
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { width: 90, fontSize: 13, color: colors.text },
  track: { flex: 1, height: 14, backgroundColor: colors.border, borderRadius: 7, overflow: 'hidden' },
  bar: { height: 14, borderRadius: 7 },
  value: { width: 48, fontSize: 13, color: colors.textMuted, textAlign: 'right', fontVariant: ['tabular-nums'] },
  empty: { color: colors.textSubtle, fontSize: 13 },
});
