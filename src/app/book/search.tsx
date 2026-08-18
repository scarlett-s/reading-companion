import { useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { searchBooks, BookSearchResult } from '@/openlibrary';
import { addBook, generateId } from '@/db';
import { Book } from '@/types';
import BookCover from '@/components/BookCover';

export default function BookSearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [manual, setManual] = useState(false);
  const [mTitle, setMTitle] = useState('');
  const [mAuthor, setMAuthor] = useState('');
  const [mPages, setMPages] = useState('');

  async function onSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const r = await searchBooks(query.trim());
      setResults(r);
      if (r.length === 0) setError('没有找到结果，可手动录入');
    } catch (e) {
      setError(e instanceof Error ? e.message : '搜索失败');
    } finally {
      setLoading(false);
    }
  }

  async function pick(result: BookSearchResult) {
    const book: Book = {
      id: generateId(),
      title: result.title,
      author: result.author || '未知作者',
      publisher: result.publisher,
      publishYear: result.publishYear,
      isbn: result.isbn,
      pageCount: result.pageCount,
      coverUrl: result.coverUrl,
      status: 'reading',
      createdAt: Date.now(),
    };
    await addBook(book);
    router.replace({ pathname: '/book/[id]', params: { id: book.id } });
  }

  async function addManual() {
    if (!mTitle.trim()) return;
    const book: Book = {
      id: generateId(),
      title: mTitle.trim(),
      author: mAuthor.trim() || '未知作者',
      pageCount: mPages ? Number(mPages) : undefined,
      status: 'reading',
      createdAt: Date.now(),
    };
    await addBook(book);
    router.replace({ pathname: '/book/[id]', params: { id: book.id } });
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="输入书名搜索"
          onSubmitEditing={onSearch}
          returnKeyType="search"
          autoCorrect={false}
        />
        <Pressable style={styles.searchBtn} onPress={onSearch}>
          <Text style={styles.searchText}>搜索</Text>
        </Pressable>
      </View>

      <Pressable onPress={() => setManual((v) => !v)} style={styles.manualToggle}>
        <Text style={styles.manualToggleText}>{manual ? '收起手动录入' : '搜索不到？手动录入'}</Text>
      </Pressable>

      {manual && (
        <View style={styles.manualForm}>
          <TextInput style={styles.input} value={mTitle} onChangeText={setMTitle} placeholder="书名 *" />
          <TextInput style={styles.input} value={mAuthor} onChangeText={setMAuthor} placeholder="作者" />
          <TextInput
            style={styles.input}
            value={mPages}
            onChangeText={setMPages}
            placeholder="总页数（可选）"
            keyboardType="number-pad"
          />
          <Pressable style={styles.saveBtn} onPress={addManual}>
            <Text style={styles.searchText}>保存</Text>
          </Pressable>
        </View>
      )}

      {loading && <ActivityIndicator style={styles.loading} />}
      {!!error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={results}
        keyExtractor={(item) => item.key}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => pick(item)}>
            <BookCover url={item.coverUrl} size={44} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.rowAuthor}>
                {item.author}
                {item.publishYear ? ` · ${item.publishYear}` : ''}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  searchRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  searchBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  searchText: { color: '#fff', fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  manualToggle: { marginTop: 12 },
  manualToggleText: { color: '#208AEF', fontSize: 14 },
  manualForm: { marginTop: 12, gap: 10 },
  loading: { marginTop: 20 },
  error: { marginTop: 12, color: '#c0392b', fontSize: 14 },
  row: { flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  rowText: { flex: 1, justifyContent: 'center' },
  rowTitle: { fontSize: 15, fontWeight: '500' },
  rowAuthor: { fontSize: 13, color: '#666', marginTop: 2 },
});
