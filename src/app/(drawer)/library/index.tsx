import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useRouter, useFocusEffect } from 'expo-router';
import { getAllBooks, getRecentBooks } from '@/db';
import { Book } from '@/types';
import BookCover from '@/components/BookCover';
import EmptyState from '@/components/EmptyState';
import { Pressable } from '@/components/Pressable';
import { colors, spacing, radius, typography } from '@/theme';

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
              <SymbolView name="xmark" size={16} tintColor={colors.textMuted} type="monochrome" />
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
                  <SymbolView name="plus" size={28} tintColor={colors.textSubtle} type="monochrome" />
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
            {filtered.length === 0 && (
              <EmptyState
                symbol="books.vertical"
                title="书库还没有书"
                hint="点「添加图书」开始建立你的书库。"
              />
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: spacing.lg },
  searchRow: { position: 'relative', marginBottom: spacing.lg },
  search: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
    paddingRight: 44,
  },
  clearBtn: {
    position: 'absolute',
    right: spacing.sm,
    top: 0,
    bottom: 0,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdown: {
    backgroundColor: colors.surface,
    borderRadius: radius.md - 2,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  dropdownItem: { paddingHorizontal: spacing.md + 2, paddingVertical: spacing.md - 1, borderBottomWidth: 1, borderBottomColor: colors.border },
  dropdownTitle: { ...typography.body, fontSize: 15, fontWeight: '500', color: colors.text },
  dropdownSub: { fontSize: 12, color: colors.textSubtle, marginTop: 2 },
  dropdownEmpty: { color: colors.textSubtle, fontSize: 13, padding: spacing.lg, textAlign: 'center' },
  sectionTitle: { ...typography.label, color: colors.textMuted, marginBottom: spacing.md, marginTop: spacing.sm },
  sectionTitleSpaced: { marginTop: spacing.xxxl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.xl },
  gridItem: { width: '33.33%', alignItems: 'center', gap: spacing.xs + 2 },
  gridTitle: { ...typography.caption, fontSize: 13, color: colors.text, textAlign: 'center' },
  gridPublisher: { ...typography.micro, fontSize: 11, color: colors.textSubtle, textAlign: 'center' },
  addCard: {
    width: 88,
    height: 123,
    borderRadius: radius.sm - 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});