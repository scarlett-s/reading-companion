import { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Image, type ImageSource } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { getEntriesByMonth, getAllBooks } from '@/db';
import { shareText } from '@/share';
import { Book, ReadingEntry } from '@/types';
import { formatProgress, todayString } from '@/utils';

const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1);
  // 周日开头（ref 用的就是 Sun..Sat）
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) grid.push(null);
  for (let d = 1; d <= daysInMonth; d++) grid.push(d);
  return grid;
}

function coverSource(url?: string): ImageSource | undefined {
  if (!url) return undefined;
  return url.includes('doubanio.com')
    ? { uri: url, headers: { Referer: 'https://book.douban.com/' } }
    : { uri: url };
}

export default function CalendarScreen() {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0 起
  const [entriesByDate, setEntriesByDate] = useState<Record<string, ReadingEntry[]>>({});
  const [booksById, setBooksById] = useState<Record<string, Book>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const yearMonth = `${year}-${String(month + 1).padStart(2, '0')}`;

  useFocusEffect(
    useCallback(() => {
      Promise.all([getEntriesByMonth(yearMonth), getAllBooks()]).then(([rows, books]) => {
        const map: Record<string, ReadingEntry[]> = {};
        for (const e of rows) (map[e.date] ??= []).push(e);
        setEntriesByDate(map);
        const bm: Record<string, Book> = {};
        for (const b of books) bm[b.id] = b;
        setBooksById(bm);
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

  function goToday() {
    const n = new Date();
    setYear(n.getFullYear());
    setMonth(n.getMonth());
    setSelectedDate(todayString());
  }

  async function shareMonth() {
    const lines: string[] = [`# ${year}-${String(month + 1).padStart(2, '0')} 阅读记录`];
    for (const date of Object.keys(entriesByDate).sort()) {
      const entries = entriesByDate[date];
      if (!entries || entries.length === 0) continue;
      const book = booksById[entries[0].bookId];
      lines.push('');
      lines.push(`## ${date}`);
      for (const e of entries) {
        const title = book?.title ?? '未知书';
        const progress = formatProgress(e);
        lines.push(`- **${title}**${progress ? `（${progress}）` : ''}`);
        if (e.comment) lines.push(`  ${e.comment}`);
      }
    }
    if (lines.length === 1) {
      lines.push('（本月没有记录）');
    }
    await shareText(`reading-${yearMonth}.md`, lines.join('\n'), 'text/markdown');
  }

  const selectedEntries = selectedDate ? entriesByDate[selectedDate] ?? [] : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.titleRow}>
        <View style={styles.tabs}>
          <Text style={[styles.tab, styles.tabActive]}>日历</Text>
          <Pressable onPress={() => router.push('/stats')} hitSlop={6}>
            <Text style={styles.tab}>统计</Text>
          </Pressable>
        </View>
        <View style={styles.actions}>
          <Pressable onPress={goToday} hitSlop={8} style={styles.iconBtn}>
            <Text style={styles.iconText}>⌖</Text>
          </Pressable>
          <Pressable onPress={shareMonth} hitSlop={8} style={styles.iconBtn}>
            <Text style={styles.iconText}>↗</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.header}>
        <Pressable onPress={() => shiftMonth(-1)} style={styles.navBtn}>
          <Text style={styles.navText}>‹</Text>
        </Pressable>
        <Text style={styles.monthTitle}>
          {year}-{String(month + 1).padStart(2, '0')}
        </Text>
        <Pressable onPress={() => shiftMonth(1)} style={styles.navBtn}>
          <Text style={styles.navText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS_EN.map((w) => (
          <Text key={w} style={styles.weekday}>
            {w}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {grid.map((d, i) => {
          const date = d != null ? `${yearMonth}-${String(d).padStart(2, '0')}` : null;
          const entries = date ? entriesByDate[date] ?? [] : [];
          const firstBook = entries.length > 0 ? booksById[entries[0].bookId] : null;
          const src = coverSource(firstBook?.coverUrl);
          const isSelected = date != null && date === selectedDate;
          return (
            <Pressable
              key={i}
              style={[styles.cell, isSelected && styles.cellSelected]}
              onPress={() => date && setSelectedDate(date)}>
              {src ? (
                <Image source={src} style={styles.cellImg} contentFit="cover" />
              ) : (
                <Text style={styles.day}>{d ?? ''}</Text>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{selectedDate ? selectedDate : '当天记录'}</Text>
      </View>

      {selectedEntries.length === 0 ? (
        <Text style={styles.empty}>
          {selectedDate ? '当天没有记录，点一个有图的格子查看' : '点一个有标记的日期查看'}
        </Text>
      ) : (
        selectedEntries.map((e) => {
          const book = booksById[e.bookId];
          const src = coverSource(book?.coverUrl);
          return (
            <Pressable
              key={e.id}
              style={styles.entry}
              onPress={() => router.push({ pathname: '/library/[id]', params: { id: e.bookId } })}>
              {src ? (
                <Image source={src} style={styles.entryCover} contentFit="cover" />
              ) : (
                <View style={styles.entryCoverPlaceholder}>
                  <Text style={styles.entryCoverIcon}>📖</Text>
                </View>
              )}
              <View style={styles.entryBody}>
                <Text style={styles.entryTitle} numberOfLines={1}>
                  {book?.title ?? '未知书'}
                </Text>
                {!!formatProgress(e) && (
                  <Text style={styles.entryProgress}>{formatProgress(e)}</Text>
                )}
                {!!e.comment && (
                  <Text style={styles.entryComment} numberOfLines={2}>
                    {e.comment}
                  </Text>
                )}
                <Text style={styles.entryDate}>{e.date}</Text>
              </View>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F5F2' },
  content: { padding: 16, paddingBottom: 32 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  tabs: { flexDirection: 'row', gap: 18 },
  tab: { fontSize: 18, color: '#999', fontWeight: '500' },
  tabActive: { color: '#222', fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 14 },
  iconBtn: { padding: 4 },
  iconText: { fontSize: 18, color: '#666' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { paddingHorizontal: 14, paddingVertical: 6 },
  navText: { fontSize: 26, color: '#555', fontWeight: '300' },
  monthTitle: { fontSize: 18, fontWeight: '600' },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekday: { flex: 1, textAlign: 'center', fontSize: 12, color: '#aaa', paddingVertical: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  cellSelected: { transform: [{ scale: 0.95 }] },
  cellImg: { width: '100%', height: '100%', borderRadius: 6 },
  day: { fontSize: 14, color: '#555' },
  sectionHeader: { marginTop: 20, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  empty: { color: '#999', fontSize: 14 },
  entry: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  entryCover: { width: 56, height: 78, borderRadius: 4 },
  entryCoverPlaceholder: {
    width: 56,
    height: 78,
    borderRadius: 4,
    backgroundColor: '#e8e8e8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryCoverIcon: { fontSize: 22 },
  entryBody: { flex: 1, gap: 4, justifyContent: 'flex-start' },
  entryTitle: { fontSize: 15, fontWeight: '600', color: '#222' },
  entryProgress: { fontSize: 12, color: '#208AEF' },
  entryComment: { fontSize: 13, color: '#555', lineHeight: 19 },
  entryDate: { fontSize: 11, color: '#aaa', marginTop: 2 },
});