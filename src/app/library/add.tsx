import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { searchBooks as searchOpenLibrary } from '@/openlibrary';
import { searchBooks as searchDouban, fetchDoubanDetail } from '@/douban';
import { addBook, generateId } from '@/db';
import { Book, BookSearchResult } from '@/types';
import BookCover from '@/components/BookCover';
import { Pressable } from '@/components/Pressable';
import { colors, spacing, radius, typography } from '@/theme';

const DOUBAN_RETRIES = 2;

/** 豆瓣失败重试；成功则原样返回结果（即使为 0 也直接交给上层判断要不要兜底）。 */
async function searchDoubanWithRetry(query: string): Promise<BookSearchResult[]> {
  let lastErr: unknown = null;
  for (let i = 0; i <= DOUBAN_RETRIES; i++) {
    try {
      return await searchDouban(query);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('搜索失败');
}

export default function AddBookScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [resultsFromDouban, setResultsFromDouban] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [manual, setManual] = useState(false);
  const [mTitle, setMTitle] = useState('');
  const [mAuthor, setMAuthor] = useState('');
  const [mPages, setMPages] = useState('');

  async function onSearch() {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError('');
    setResults([]);
    setResultsFromDouban(false);
    try {
      // 默认先豆瓣：成功返回（可能 0 条）→ 0 条再走 Open Library 兜底
      let r: BookSearchResult[] = [];
      let fromDouban = false;
      try {
        r = await searchDoubanWithRetry(q);
        fromDouban = true;
      } catch {
        // 豆瓣失败（含全部重试）→ 静默兜底 Open Library
        r = [];
      }
      if (r.length === 0) {
        try {
          r = await searchOpenLibrary(q);
          if (fromDouban) setError('豆瓣未找到结果，已切换到 Open Library');
        } catch (e) {
          setError(e instanceof Error ? e.message : '搜索失败，可手动录入');
        }
      }
      setResults(r);
      setResultsFromDouban(fromDouban);
      if (r.length === 0 && !error) setError('没有找到结果，可手动录入');
    } catch (e) {
      setError(e instanceof Error ? e.message : '搜索失败');
    } finally {
      setLoading(false);
    }
  }

  async function pick(result: BookSearchResult) {
    // 豆瓣先快速回填搜索结果字段，再后台拉详情补 出版社/译者/页数/出版年
    let r = result;
    if (resultsFromDouban) {
      r = await fetchDoubanDetail(result.key, result);
    }
    const book: Book = {
      id: generateId(),
      title: r.title,
      author: r.author || '未知作者',
      publisher: r.publisher,
      publishYear: r.publishYear,
      isbn: r.isbn,
      pageCount: r.pageCount,
      translator: r.translator,
      coverUrl: r.coverUrl,
      status: 'reading',
      readCount: 0,
      createdAt: Date.now(),
    };
    await addBook(book);
    router.back();
  }

  async function addManual() {
    if (!mTitle.trim()) return;
    const book: Book = {
      id: generateId(),
      title: mTitle.trim(),
      author: mAuthor.trim() || '未知作者',
      pageCount: mPages ? Number(mPages) : undefined,
      status: 'reading',
      readCount: 0,
      createdAt: Date.now(),
    };
    await addBook(book);
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="输入书名搜索"
          placeholderTextColor={colors.textSubtle}
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
              <Text style={styles.rowAuthor} numberOfLines={1}>
                {item.author}
                {item.publishYear ? ` · ${item.publishYear}` : ''}
                {item.publisher ? ` · ${item.publisher}` : ''}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.bg },
  searchRow: { flexDirection: 'row', gap: spacing.sm },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  searchBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  searchText: { color: colors.primaryText, fontWeight: '600' },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  manualToggle: { marginTop: spacing.md },
  manualToggleText: { color: colors.accent, fontSize: 14 },
  manualForm: { marginTop: spacing.md, gap: spacing.sm + 2 },
  loading: { marginTop: spacing.xl },
  error: { marginTop: spacing.md, color: colors.danger, fontSize: 14 },
  row: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowText: { flex: 1, justifyContent: 'center' },
  rowTitle: { ...typography.body, fontSize: 15, fontWeight: '500', color: colors.text },
  rowAuthor: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
});