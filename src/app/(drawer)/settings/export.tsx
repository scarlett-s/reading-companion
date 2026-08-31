import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { getAllBooks, getAllEntries } from '@/db';
import { allBooksToMarkdown, markdownToPlainText, markdownToHtml } from '@/export';
import { Book, ReadingEntry } from '@/types';
import ExportButtons from '@/components/ExportButtons';
import { Pressable } from '@/components/Pressable';
import { colors, spacing, typography } from '@/theme';

export default function ExportScreen() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [entriesByBook, setEntriesByBook] = useState<Record<string, ReadingEntry[]>>({});

  useEffect(() => {
    Promise.all([getAllBooks(), getAllEntries()]).then(([bs, es]) => {
      setBooks(bs);
      const map: Record<string, ReadingEntry[]> = {};
      for (const e of es) (map[e.bookId] ??= []).push(e);
      setEntriesByBook(map);
    });
  }, []);

  return (
    <View style={styles.root}>
      {/* 顶部 nav bar：< | 导出笔记 | 占位 */}
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.navBtn}>
          <SymbolView name="chevron.left" size={24} tintColor={colors.text} type="monochrome" />
        </Pressable>
        <View style={styles.navTitleLayer} pointerEvents="none">
          <Text style={styles.navTitle}>导出笔记</Text>
        </View>
        <View style={styles.navBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.hint}>把全部笔记按书籍导出，可分享或保存到本地文件。</Text>

        <ExportButtons
          filename="全部笔记"
          getContent={(format) => {
            const md = allBooksToMarkdown(books, entriesByBook);
            if (format === 'md') return md;
            if (format === 'html') return markdownToHtml(md);
            return markdownToPlainText(md);
          }}
        />

        {__DEV__ && (
          <>
            <Text style={styles.sectionTitle}>开发者</Text>
            <Pressable style={styles.diagBtn} onPress={() => router.push('/diagnostics')}>
              <SymbolView name="stethoscope" size={16} tintColor={colors.primaryText} type="monochrome" />
              <Text style={styles.diagText}>诊断 / 测试（Embedding & RAG）</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  // Nav bar
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    paddingHorizontal: spacing.sm + 2,
  },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  navTitleLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },

  // Body
  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
  hint: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  sectionTitle: { ...typography.subheading, marginTop: spacing.sm },
  diagBtn: {
    backgroundColor: colors.text,
    borderRadius: 12,
    paddingVertical: spacing.md + 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  diagText: { color: colors.primaryText, fontSize: 14, fontWeight: '600' },
});
