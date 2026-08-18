import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getRecentBooks } from '@/db';
import { Book } from '@/types';
import BookCover from '@/components/BookCover';

export default function RecordScreen() {
  const router = useRouter();
  const [recent, setRecent] = useState<Book[]>([]);

  useFocusEffect(
    useCallback(() => {
      getRecentBooks(4).then(setRecent);
    }, [])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>记录</Text>
      <Text style={styles.subtitle}>今天读了哪本？点一下开始记录</Text>

      {recent.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>还没有阅读记录</Text>
        </View>
      ) : (
        <FlatList
          data={recent}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push({ pathname: '/entry/new', params: { bookId: item.id } })}>
              <BookCover url={item.coverUrl} size={48} />
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.rowAuthor}>{item.author}</Text>
              </View>
              <Text style={styles.record}>记一笔 →</Text>
            </Pressable>
          )}
        />
      )}

      <View style={styles.actions}>
        <Pressable style={styles.btn} onPress={() => router.push('/book/search')}>
          <Text style={styles.btnText}>＋ 添加图书</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => router.push('/book/list')}>
          <Text style={styles.btnGhostText}>全部图书</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 26, fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#888', marginTop: 4 },
  list: { marginTop: 16, gap: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#aaa', fontSize: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f7f7f7',
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowAuthor: { fontSize: 13, color: '#666', marginTop: 2 },
  record: { fontSize: 13, color: '#208AEF' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  btn: {
    flex: 1,
    backgroundColor: '#208AEF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  btnGhost: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#208AEF' },
  btnGhostText: { color: '#208AEF', fontWeight: '600', fontSize: 15 },
});
