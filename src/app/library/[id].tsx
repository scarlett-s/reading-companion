import { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  getBook,
  getEntriesByBook,
  getReflections,
  countEntriesByBook,
  addReflection,
  markFinished,
  setBookRating,
  generateId,
  getSettings,
} from '@/db';
import { synthesizeBook } from '@/ai';
import { daysWithEntries, readingSpanDays, daysSince } from '@/stats';
import { todayString, round2 } from '@/utils';
import { Book, ReadingEntry, Reflection } from '@/types';
import BookCover from '@/components/BookCover';
import StarRating from '@/components/StarRating';
import HeatMap from '@/components/HeatMap';
import ExportButtons from '@/components/ExportButtons';
import { bookToMarkdown, markdownToPlainText, markdownToHtml } from '@/export';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [entries, setEntries] = useState<ReadingEntry[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [noteCount, setNoteCount] = useState(0);
  const [organizing, setOrganizing] = useState(false);
  const [organizeError, setOrganizeError] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      Promise.all([getBook(id), getEntriesByBook(id), getReflections(id), countEntriesByBook(id)]).then(
        ([b, e, r, c]) => {
          setBook(b);
          setEntries(e);
          setReflections(r);
          setNoteCount(c);
        }
      );
    }, [id])
  );

  const heatData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of entries) map[e.date] = (map[e.date] ?? 0) + 1;
    return map;
  }, [entries]);

  if (!book) {
    return (
      <View style={styles.center}>
        <Text>加载中…</Text>
      </View>
    );
  }

  const lastDate = entries.length > 0 ? entries[entries.length - 1].date : null;
  const lastOpen = lastDate ? daysSince(lastDate, todayString()) : null;
  const readDays = daysWithEntries(entries);
  const spanDays = readingSpanDays(entries);
  const readTimes = book.readCount ?? 0;
  const currentRound = book.status === 'reading' ? readTimes + 1 : readTimes;

  async function finishBook() {
    await markFinished(book!.id);
    setBook(await getBook(book!.id));
  }

  async function rate(v: number) {
    await setBookRating(book!.id, v);
    setBook(await getBook(book!.id));
  }

  async function generateInsight() {
    setOrganizing(true);
    setOrganizeError('');
    try {
      const settings = await getSettings();
      const content = await synthesizeBook(
        settings,
        book!.title,
        entries.map((e) => ({ comment: e.comment, aiKeyPoints: e.aiKeyPoints, aiSummary: e.aiSummary }))
      );
      await addReflection({ id: generateId(), bookId: book!.id, content, createdAt: Date.now() });
      setReflections(await getReflections(book!.id));
    } catch (e) {
      setOrganizeError(e instanceof Error ? e.message : '生成失败');
    } finally {
      setOrganizing(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.coverCard}>
        <BookCover url={book.coverUrl} size={140} />
        <Text style={styles.title}>{book.title}</Text>
        <Text style={styles.author}>{book.author}</Text>
      </View>

      <View style={styles.ratingRow}>
        <StarRating value={book.rating ?? 0} onChange={rate} />
      </View>

      <View style={styles.roundRow}>
        <Text style={styles.roundText}>
          {book.status === 'finished' ? `已读完 ${readTimes} 遍` : `正在读第 ${currentRound} 遍`}
        </Text>
        {book.status !== 'finished' && (
          <Pressable style={styles.finishBtn} onPress={finishBook}>
            <Text style={styles.finishText}>标记读完</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.heatCard}>
        <Text style={styles.cardLabel}>阅读热力图</Text>
        <HeatMap data={heatData} weeks={26} endDate={todayString()} />
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoCard}>
          <Text style={styles.infoValue}>{lastOpen != null ? `${lastOpen} 天` : '—'}</Text>
          <Text style={styles.infoLabel}>距上次读</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoValue}>{readDays} 天</Text>
          <Text style={styles.infoLabel}>已读</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoValue}>{spanDays} 天</Text>
          <Text style={styles.infoLabel}>阅读周期</Text>
        </View>
      </View>

      <View style={styles.insightSection}>
        <Pressable
          style={[styles.insightBtn, (organizing || noteCount <= 5) && styles.disabled]}
          disabled={organizing || noteCount <= 5}
          onPress={generateInsight}>
          {organizing ? <ActivityIndicator color="#fff" /> : <Text style={styles.insightText}>✨ 生成洞察报告</Text>}
        </Pressable>
        {noteCount <= 5 && (
          <Text style={styles.hint}>笔记超过 5 条后可生成洞察报告（当前 {noteCount} 条）</Text>
        )}
        {!!organizeError && <Text style={styles.error}>{organizeError}</Text>}
      </View>

      {reflections.map((r) => (
        <View key={r.id} style={styles.reflection}>
          <Text style={styles.reflectionDate}>{formatDate(r.createdAt)}</Text>
          <Text style={styles.reflectionContent}>{r.content}</Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>导出笔记</Text>
      <ExportButtons
        filename={book.title}
        getContent={(format) => {
          const md = bookToMarkdown(book, entries);
          if (format === 'md') return md;
          if (format === 'html') return markdownToHtml(md);
          return markdownToPlainText(md);
        }}
      />

      <Text style={styles.sectionTitle}>笔记（{entries.length}）</Text>
      {entries.length === 0 ? (
        <Text style={styles.empty}>还没有笔记</Text>
      ) : (
        entries.map((e) => (
          <View key={e.id} style={styles.entry}>
            <View style={styles.entryHead}>
              <Text style={styles.entryDate}>{e.date}</Text>
              <Text style={styles.entryProgress}>{formatProgress(e)}</Text>
            </View>
            <Text style={styles.entryComment}>{e.comment}</Text>
            {!!e.aiSummary && <Text style={styles.entrySummary}>总结：{e.aiSummary}</Text>}
          </View>
        ))
      )}
    </ScrollView>
  );
}

function formatProgress(e: ReadingEntry): string {
  if (e.progressPercent != null) return `读至 ${round2(e.progressPercent)}%`;
  if (e.currentPage != null) return `读至 ${e.currentPage} 页`;
  return '';
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f0f0' },
  content: { padding: 16, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  coverCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20, alignItems: 'center', gap: 10 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  author: { fontSize: 14, color: '#666' },
  ratingRow: { alignItems: 'center' },
  roundRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roundText: { fontSize: 14, color: '#555' },
  finishBtn: { backgroundColor: '#208AEF', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  finishText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  heatCard: { backgroundColor: '#eaf6e6', borderRadius: 12, padding: 14, gap: 10 },
  cardLabel: { fontSize: 13, color: '#4a7c2a', fontWeight: '600' },
  infoRow: { flexDirection: 'row', gap: 10 },
  infoCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', gap: 4 },
  infoValue: { fontSize: 18, fontWeight: '700' },
  infoLabel: { fontSize: 12, color: '#888' },
  insightSection: { gap: 8 },
  insightBtn: { backgroundColor: '#8e44ad', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  insightText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  disabled: { opacity: 0.4 },
  hint: { fontSize: 12, color: '#999' },
  error: { fontSize: 13, color: '#c0392b' },
  reflection: { backgroundColor: '#faf7fb', borderRadius: 10, padding: 14, gap: 8 },
  reflectionDate: { fontSize: 12, color: '#999' },
  reflectionContent: { fontSize: 14, lineHeight: 21 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  empty: { color: '#888', fontSize: 14 },
  entry: { backgroundColor: '#fff', borderRadius: 10, padding: 12, gap: 6 },
  entryHead: { flexDirection: 'row', justifyContent: 'space-between' },
  entryDate: { fontSize: 13, color: '#888' },
  entryProgress: { fontSize: 13, color: '#555' },
  entryComment: { fontSize: 14, lineHeight: 20 },
  entrySummary: { fontSize: 13, color: '#7f8c8d', lineHeight: 19 },
});
