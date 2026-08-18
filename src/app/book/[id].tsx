import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  getBook,
  getEntriesByBook,
  getReflections,
  addReflection,
  updateBookStatus,
  generateId,
  getSettings,
} from '@/db';
import { synthesizeBook } from '@/ai';
import { Book, ReadingEntry, Reflection } from '@/types';
import BookCover from '@/components/BookCover';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [entries, setEntries] = useState<ReadingEntry[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [organizing, setOrganizing] = useState(false);
  const [organizeError, setOrganizeError] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      Promise.all([getBook(id), getEntriesByBook(id), getReflections(id)]).then(([b, e, r]) => {
        setBook(b);
        setEntries(e);
        setReflections(r);
      });
    }, [id])
  );

  async function toggleFinished() {
    if (!book) return;
    const finishing = book.status !== 'finished';
    await updateBookStatus(book.id, finishing ? 'finished' : 'reading', finishing ? Date.now() : undefined);
    setBook(await getBook(book.id));
  }

  async function organize() {
    if (!book) return;
    setOrganizing(true);
    setOrganizeError('');
    try {
      const settings = await getSettings();
      const content = await synthesizeBook(
        settings,
        book.title,
        entries.map((e) => ({ comment: e.comment, aiKeyPoints: e.aiKeyPoints }))
      );
      await addReflection({ id: generateId(), bookId: book.id, content, createdAt: Date.now() });
      setReflections(await getReflections(book.id));
    } catch (e) {
      setOrganizeError(e instanceof Error ? e.message : '整理失败');
    } finally {
      setOrganizing(false);
    }
  }

  if (!book) {
    return (
      <View style={styles.center}>
        <Text>加载中…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <BookCover url={book.coverUrl} size={80} />
        <View style={styles.headerText}>
          <Text style={styles.title}>{book.title}</Text>
          <Text style={styles.author}>{book.author}</Text>
          {book.pageCount != null && <Text style={styles.meta}>共 {book.pageCount} 页</Text>}
        </View>
        <Pressable style={[styles.statusBtn, book.status === 'finished' && styles.statusDone]} onPress={toggleFinished}>
          <Text style={styles.statusText}>{book.status === 'finished' ? '已读完' : '在读'}</Text>
        </Pressable>
      </View>

      <View style={styles.organizeSection}>
        <Pressable
          style={[styles.organizeBtn, (organizing || entries.length === 0) && styles.disabled]}
          disabled={organizing || entries.length === 0}
          onPress={organize}>
          {organizing ? <ActivityIndicator color="#fff" /> : <Text style={styles.organizeText}>✨ 整理我对这本书的思考</Text>}
        </Pressable>
        {entries.length === 0 && <Text style={styles.hint}>先记录阅读 + 评论，才能整理</Text>}
        {!!organizeError && <Text style={styles.error}>{organizeError}</Text>}
      </View>

      {reflections.map((r) => (
        <View key={r.id} style={styles.reflection}>
          <Text style={styles.reflectionDate}>{formatDate(r.createdAt)}</Text>
          <Text style={styles.reflectionContent}>{r.content}</Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>阅读记录（{entries.length}）</Text>
      {entries.length === 0 ? (
        <Text style={styles.empty}>还没有记录</Text>
      ) : (
        entries.map((e) => (
          <View key={e.id} style={styles.entry}>
            <View style={styles.entryHead}>
              <Text style={styles.entryDate}>{e.date}</Text>
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

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  headerText: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700' },
  author: { fontSize: 15, color: '#555', marginTop: 4 },
  meta: { fontSize: 13, color: '#888', marginTop: 4 },
  statusBtn: { borderWidth: 1, borderColor: '#208AEF', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5 },
  statusDone: { borderColor: '#27ae60', backgroundColor: '#eafaf1' },
  statusText: { fontSize: 13, color: '#208AEF' },
  organizeSection: { gap: 8 },
  organizeBtn: { backgroundColor: '#8e44ad', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  organizeText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  disabled: { opacity: 0.4 },
  hint: { fontSize: 12, color: '#999' },
  error: { fontSize: 13, color: '#c0392b' },
  reflection: { backgroundColor: '#faf7fb', borderRadius: 10, padding: 14, gap: 8 },
  reflectionDate: { fontSize: 12, color: '#999' },
  reflectionContent: { fontSize: 14, lineHeight: 21 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  empty: { color: '#888', fontSize: 14 },
  entry: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  entryHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  entryDate: { fontSize: 13, color: '#888' },
  entryProgress: { fontSize: 13, color: '#555' },
  entryComment: { fontSize: 14, lineHeight: 20 },
  entryPoints: { fontSize: 13, color: '#7f8c8d', marginTop: 6, lineHeight: 19 },
});
