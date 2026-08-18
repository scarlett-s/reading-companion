import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getAllBooks } from '@/db';
import { Book } from '@/types';
import BookCover from '@/components/BookCover';

export default function BookListScreen() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);

  useFocusEffect(
    useCallback(() => {
      getAllBooks().then(setBooks);
    }, [])
  );

  return (
    <View style={styles.container}>
      {books.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>书架还空着，去添加第一本书吧</Text>
          <Pressable style={styles.addBtn} onPress={() => router.push('/book/search')}>
            <Text style={styles.addText}>添加图书</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={(b) => b.id}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push({ pathname: '/book/[id]', params: { id: item.id } })}>
              <BookCover url={item.coverUrl} size={44} />
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.rowAuthor}>{item.author}</Text>
              </View>
              {item.status === 'finished' && <Text style={styles.badge}>读完</Text>}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  emptyText: { color: '#888', fontSize: 15 },
  addBtn: { backgroundColor: '#208AEF', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12 },
  addText: { color: '#fff', fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '500' },
  rowAuthor: { fontSize: 13, color: '#666', marginTop: 2 },
  badge: { fontSize: 12, color: '#208AEF', borderWidth: 1, borderColor: '#208AEF', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
});
