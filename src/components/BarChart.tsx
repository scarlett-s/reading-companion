import { View, Text, StyleSheet } from 'react-native';

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
                    backgroundColor: d.value >= 0 ? '#7CB342' : '#e74c3c',
                  },
                ]}
              />
            </View>
            <Text style={styles.value}>
              {d.value > 0 ? '+' : ''}
              {d.value}%
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { width: 90, fontSize: 13, color: '#333' },
  track: { flex: 1, height: 14, backgroundColor: '#eee', borderRadius: 7, overflow: 'hidden' },
  bar: { height: 14, borderRadius: 7 },
  value: { width: 48, fontSize: 13, color: '#555', textAlign: 'right' },
  empty: { color: '#999', fontSize: 13 },
});
