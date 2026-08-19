import { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getAllBooks, getAllEntries } from '@/db';
import { periodRange, periodDelta, type PeriodKey } from '@/stats';
import { todayString, tsToDate } from '@/utils';
import { Book, ReadingEntry } from '@/types';
import BarChart from '@/components/BarChart';
import HeatMap from '@/components/HeatMap';

const LABELS: Record<PeriodKey, string> = { week: '周', month: '月', year: '年' };

export default function StatsScreen() {
  const [period, setPeriod] = useState<PeriodKey>('week');
  const [books, setBooks] = useState<Book[]>([]);
  const [entriesByBook, setEntriesByBook] = useState<Record<string, ReadingEntry[]>>({});
  const [allEntries, setAllEntries] = useState<ReadingEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getAllBooks(), getAllEntries()]).then(([bs, es]) => {
        setBooks(bs);
        setAllEntries(es);
        const map: Record<string, ReadingEntry[]> = {};
        for (const e of es) (map[e.bookId] ??= []).push(e);
        for (const k in map) map[k].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
        setEntriesByBook(map);
      });
    }, [])
  );

  const today = todayString();
  const { start, end } = periodRange(period, today);
  const limit = period === 'year' ? 10 : 5;

  const finished = useMemo(
    () =>
      books.filter((b) => {
        if (b.finishedAt == null) return false;
        const d = tsToDate(b.finishedAt);
        return d >= start && d <= end;
      }),
    [books, start, end]
  );

  const started = useMemo(
    () =>
      books.filter((b) => {
        const es = entriesByBook[b.id] ?? [];
        return es.length > 0 && es[0].date >= start && es[0].date <= end;
      }),
    [books, entriesByBook, start, end]
  );

  const ranking = useMemo(
    () =>
      books
        .map((b) => ({ book: b, delta: periodDelta(entriesByBook[b.id] ?? [], start, end, b.pageCount) }))
        .filter((r) => r.delta !== 0)
        .sort((a, b) => b.delta - a.delta)
        .slice(0, limit),
    [books, entriesByBook, start, end, limit]
  );

  const heatData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of allEntries) map[e.date] = (map[e.date] ?? 0) + 1;
    return map;
  }, [allEntries]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.periodRow}>
        {(Object.keys(LABELS) as PeriodKey[]).map((p) => (
          <Pressable
            key={p}
            style={[styles.periodBtn, period === p && styles.periodActive]}
            onPress={() => setPeriod(p)}>
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{LABELS[p]}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>阅读活跃度</Text>
      <HeatMap data={heatData} weeks={52} endDate={today} />

      <Text style={styles.sectionTitle}>进度排名</Text>
      <BarChart data={ranking.map((r) => ({ label: r.book.title, value: r.delta }))} />

      <Text style={styles.sectionTitle}>读完的书（{finished.length}）</Text>
      {finished.length === 0 ? (
        <Text style={styles.empty}>本周期没有读完的书</Text>
      ) : (
        finished.map((b) => (
          <Text key={b.id} style={styles.bookLine}>
            {b.title}
          </Text>
        ))
      )}

      <Text style={styles.sectionTitle}>开始读的书（{started.length}）</Text>
      {started.length === 0 ? (
        <Text style={styles.empty}>本周期没有新开始读的书</Text>
      ) : (
        started.map((b) => (
          <Text key={b.id} style={styles.bookLine}>
            {b.title}
          </Text>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, gap: 14 },
  periodRow: { flexDirection: 'row', gap: 8 },
  periodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  periodActive: { backgroundColor: '#7CB342', borderColor: '#7CB342' },
  periodText: { fontSize: 15, color: '#555' },
  periodTextActive: { color: '#fff', fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 6 },
  empty: { color: '#999', fontSize: 13 },
  bookLine: { fontSize: 14, color: '#333', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
});
