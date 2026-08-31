import { View, StyleSheet } from 'react-native';
import { heatmapCells } from '@/stats';
import { colors, radius } from '@/theme';

const COLORS = ['#EBEDE8', '#C6E48B', '#9CC76F', '#7CB342', '#5A8F2F'];

function colorFor(count: number): string {
  if (count <= 0) return COLORS[0];
  if (count === 1) return COLORS[1];
  if (count === 2) return COLORS[2];
  if (count === 3) return COLORS[3];
  return COLORS[4];
}

export default function HeatMap({
  data,
  weeks = 26,
  endDate,
}: {
  data: Record<string, number>;
  weeks?: number;
  endDate: string;
}) {
  const cols = heatmapCells(data, weeks, endDate);
  return (
    <View style={styles.row}>
      {cols.map((week, wi) => (
        <View key={wi} style={styles.col}>
          {week.map((cell) => (
            <View key={cell.date} style={[styles.cell, { backgroundColor: colorFor(cell.count) }]} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 3 },
  col: { gap: 3 },
  cell: { width: 10, height: 10, borderRadius: radius.sm - 6 },
});
