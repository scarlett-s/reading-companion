import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
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

  const searching = query.trim().length > 0;

  function openBook(id: string) {
    router.push({ pathname: '/library/[id]', params: { id } });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <View style={styles.searchRow}>
          <TextInput
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder="搜索书库内图书"
            placeholderTextColor="#999"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searching && (
            <Pressable onPress={() => setQuery('')} hitSlop={8} style={styles.clearBtn}>
              <Text style={styles.clearText}>×</Text>
            </Pressable>
          )}
        </View>

        {searching ? (
          <View style={styles.dropdown}>
            {filtered.length === 0 ? (
              <Text style={styles.dropdownEmpty}>没有匹配的图书</Text>
            ) : (
              filtered.map((b) => (
                <Pressable key={b.id} style={styles.dropdownItem} onPress={() => openBook(b.id)}>
                  <Text style={styles.dropdownTitle} numberOfLines={1}>
                    {b.title}
                  </Text>
                  <Text style={styles.dropdownSub} numberOfLines={1}>
                    {b.author}
                    {b.publisher ? ` · ${b.publisher}` : ''}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        ) : (
          <>
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
                      {!!b.publisher && (
                        <Text style={styles.gridPublisher} numberOfLines={1}>
                          {b.publisher}
                        </Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            <Text style={[styles.sectionTitle, recent.length > 0 && styles.sectionTitleSpaced]}>我的书库</Text>
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
                  {!!b.publisher && (
                    <Text style={styles.gridPublisher} numberOfLines={1}>
                      {b.publisher}
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>
            {filtered.length === 0 && <Text style={styles.empty}>书库还没有书</Text>}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { flex: 1 },
  content: { padding: 16 },
  searchRow: { position: 'relative', marginBottom: 16 },
  search: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    paddingRight: 36,
  },
  clearBtn: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  clearText: { fontSize: 20, color: '#999' },
  dropdown: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 16,
    overflow: 'hidden',
  },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  dropdownTitle: { fontSize: 15, fontWeight: '500', color: '#222' },
  dropdownSub: { fontSize: 12, color: '#888', marginTop: 2 },
  dropdownEmpty: { color: '#999', fontSize: 13, padding: 16, textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, marginTop: 8 },
  sectionTitleSpaced: { marginTop: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  gridItem: { width: '33.33%', alignItems: 'center', gap: 6 },
  gridTitle: { fontSize: 13, color: '#333' },
  gridPublisher: { fontSize: 11, color: '#999' },
  addCard: {
    width: 88,
    height: 123,
    borderRadius: 4,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { fontSize: 32, color: '#999' },
  empty: { color: '#999', fontSize: 14, marginTop: 8 },
});