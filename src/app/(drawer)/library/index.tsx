import { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getAllBooks, getRecentBooks } from '@/db';
import { Book } from '@/types';
import BookCover from '@/components/BookCover';

export default function LibraryScreen() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [recent, setRecent] = useState<Book[]>([]);
  const [query, setQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      Promise.all([getAllBooks(), getRecentBooks(12)]).then(([all, r]) => {
        setBooks(all);
        setRecent(r.filter((b) => b.status === 'reading').slice(0, 6));
      });
    }, [])
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return books;
    return books.filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
  }, [query, books]);

  function openBook(id: string) {
    router.push({ pathname: '/library/[id]', params: { id } });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="搜索书库内图书"
        autoCorrect={false}
      />

      {recent.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>最近在读</Text>
          <View style={styles.grid}>
            {recent.map((b) => (
              <Pressable key={b.id} style={styles.gridItem} onPress={() => openBook(b.id)}>
                <BookCover url={b.coverUrl} size={88} />
                <Text style={styles.gridTitle} numberOfLines={1}>
                  {b.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>我的书库</Text>
      <View style={styles.grid}>
        <Pressable style={styles.gridItem} onPress={() => router.push('/library/add')}>
          <View style={styles.addCard}>
            <Text style={styles.addText}>＋</Text>
          </View>
          <Text style={styles.gridTitle} numberOfLines={1}>
            添加图书
          </Text>
        </Pressable>
        {filtered.map((b) => (
          <Pressable key={b.id} style={styles.gridItem} onPress={() => openBook(b.id)}>
            <BookCover url={b.coverUrl} size={88} />
            <Text style={styles.gridTitle} numberOfLines={1}>
              {b.title}
            </Text>
          </Pressable>
        ))}
      </View>
      {filtered.length === 0 && <Text style={styles.empty}>书库还没有书</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16 },
  search: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  gridItem: { width: '33.33%', alignItems: 'center', gap: 6 },
  gridTitle: { fontSize: 13, color: '#333' },
  addCard: {
    width: 88,
    height: 88,
    borderRadius: 8,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { fontSize: 32, color: '#999' },
  empty: { color: '#999', fontSize: 14, marginTop: 8 },
});
