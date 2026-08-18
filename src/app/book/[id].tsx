import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { getBook, getEntriesByBook } from '@/db';
import { Book, ReadingEntry } from '@/types';
import BookCover from '@/components/BookCover';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [entries, setEntries] = useState<ReadingEntry[]>([]);

  useEffect(() => {
    if (!id) return;
    getBook(id).then(setBook);
    getEntriesByBook(id).then(setEntries);
  }, [id]);

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
          {book.status === 'finished' && <Text style={styles.finished}>已读完</Text>}
        </View>
      </View>

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  headerText: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  author: { fontSize: 15, color: '#555', marginTop: 4 },
  meta: { fontSize: 13, color: '#888', marginTop: 4 },
  finished: { fontSize: 13, color: '#27ae60', marginTop: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  empty: { color: '#888', fontSize: 14 },
  entry: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  entryHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  entryDate: { fontSize: 13, color: '#888' },
  entryProgress: { fontSize: 13, color: '#555' },
  entryComment: { fontSize: 14, lineHeight: 20 },
  entryPoints: { fontSize: 13, color: '#7f8c8d', marginTop: 6, lineHeight: 19 },
});
