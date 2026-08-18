import { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getEntriesByMonth, getAllBooks } from '@/db';
import { Book, ReadingEntry } from '@/types';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

function buildGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // 周一开头
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) grid.push(null);
  for (let d = 1; d <= daysInMonth; d++) grid.push(d);
  return grid;
}

export default function CalendarScreen() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0 起
  const [entriesByDate, setEntriesByDate] = useState<Record<string, ReadingEntry[]>>({});
  const [bookTitles, setBookTitles] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const yearMonth = `${year}-${String(month + 1).padStart(2, '0')}`;

  useFocusEffect(
    useCallback(() => {
      Promise.all([getEntriesByMonth(yearMonth), getAllBooks()]).then(([rows, books]) => {
        const map: Record<string, ReadingEntry[]> = {};
        for (const e of rows) (map[e.date] ??= []).push(e);
        setEntriesByDate(map);
        const titles: Record<string, string> = {};
        for (const b of books) titles[b.id] = b.title;
        setBookTitles(titles);
      });
    }, [yearMonth])
  );

  const grid = useMemo(() => buildGrid(year, month), [year, month]);

  function shiftMonth(delta: number) {
    setSelectedDate(null);
    const m = month + delta;
    if (m < 0) {
      setMonth(11);
      setYear(year - 1);
    } else if (m > 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(m);
    }
  }

  const selectedEntries = selectedDate ? entriesByDate[selectedDate] ?? [] : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => shiftMonth(-1)} style={styles.navBtn}>
          <Text style={styles.navText}>‹</Text>
        </Pressable>
        <Text style={styles.monthTitle}>
          {year}年{month + 1}月
        </Text>
        <Pressable onPress={() => shiftMonth(1)} style={styles.navBtn}>
          <Text style={styles.navText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={styles.weekday}>
            {w}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {grid.map((d, i) => {
          const date = d != null ? `${yearMonth}-${String(d).padStart(2, '0')}` : null;
          const hasEntries = date != null && (entriesByDate[date]?.length ?? 0) > 0;
          return (
            <Pressable
              key={i}
              style={[styles.cell, date === selectedDate && styles.cellSelected]}
              onPress={() => date && setSelectedDate(date)}>
              {d != null && <Text style={styles.day}>{d}</Text>}
              {hasEntries && <View style={styles.dot} />}
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>
        {selectedDate ? `${selectedDate} 的记录` : '当天记录'}
      </Text>
      {selectedEntries.length === 0 ? (
        <Text style={styles.empty}>点一个有标记的日期查看</Text>
      ) : (
        selectedEntries.map((e) => (
          <View key={e.id} style={styles.entry}>
            <View style={styles.entryHead}>
              <Text style={styles.entryBook}>{bookTitles[e.bookId] ?? '未知书'}</Text>
              <Text style={styles.entryProgress}>{formatProgress(e)}</Text>
            </View>
            {!!e.comment && <Text style={styles.entryComment}>{e.comment}</Text>}
            {!!e.aiKeyPoints?.length && (
              <Text style={styles.entryPoints}>要点：{e.aiKeyPoints.join('；')}</Text>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

function formatProgress(e: ReadingEntry): string {
  if (e.progressPercent != null) return `${e.progressPercent}%`;
  if (e.currentPage != null) return `第 ${e.currentPage} 页`;
  return '';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { paddingHorizontal: 14, paddingVertical: 6 },
  navText: { fontSize: 24, color: '#555' },
  monthTitle: { fontSize: 18, fontWeight: '600' },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekday: { flex: 1, textAlign: 'center', fontSize: 13, color: '#888', paddingVertical: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  cellSelected: { backgroundColor: '#eaf3ff' },
  day: { fontSize: 15 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#208AEF', marginTop: 3 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 20, marginBottom: 10 },
  empty: { color: '#999', fontSize: 14 },
  entry: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  entryHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  entryBook: { fontSize: 14, fontWeight: '600' },
  entryProgress: { fontSize: 13, color: '#555' },
  entryComment: { fontSize: 14, lineHeight: 20 },
  entryPoints: { fontSize: 13, color: '#7f8c8d', marginTop: 6, lineHeight: 19 },
});
