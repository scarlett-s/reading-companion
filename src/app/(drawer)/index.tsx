import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getAllEntries, getAllBooks } from '@/db';
import { ReadingEntry } from '@/types';
import NoteCard from '@/components/NoteCard';

interface Note {
  id: string;
  title: string;
  date: string;
  comment: string;
  progress: string;
}

function formatProgress(e: ReadingEntry): string {
  if (e.progressPercent != null) return `${e.progressPercent}%`;
  if (e.currentPage != null) return `第 ${e.currentPage} 页`;
  return '';
}

export default function HomeScreen() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getAllEntries(), getAllBooks()]).then(([entries, books]) => {
        const titles = new Map(books.map((b) => [b.id, b.title]));
        setNotes(
          entries.map((e) => ({
            id: e.id,
            title: titles.get(e.bookId) ?? '未知书名',
            date: e.date,
            comment: e.comment,
            progress: formatProgress(e),
          }))
        );
      });
    }, [])
  );

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        {notes.length === 0 ? (
          <Text style={styles.empty}>还没有笔记，点右下角 ＋ 开始记录</Text>
        ) : (
          notes.map((n) => <NoteCard key={n.id} {...n} />)
        )}
      </ScrollView>
      <Pressable style={styles.fab} onPress={() => router.push('/note/new')}>
        <Text style={styles.fabText}>＋</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0f0f0' },
  content: { padding: 16, gap: 12 },
  empty: { color: '#999', textAlign: 'center', marginTop: 40 },
  fab: {
    position: 'absolute',
    bottom: 28,
    left: '50%',
    marginLeft: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#7CB342',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 30, lineHeight: 34 },
});
