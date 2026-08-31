import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { getBook, getEntriesByBook } from '@/db';
import { bookToMarkdown, markdownToPlainText, markdownToHtml } from '@/export';
import { shareText } from '@/share';
import { Book, ReadingEntry } from '@/types';
import { Pressable } from '@/components/Pressable';
import { colors, spacing, radius, typography } from '@/theme';

type Format = 'md' | 'txt' | 'html';

const FORMAT_LABEL: Record<Format, string> = {
  md: 'Markdown (.md)',
  txt: '纯文本 (.txt)',
  html: '网页 (.html)',
};

export default function ExportBookScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [entries, setEntries] = useState<ReadingEntry[]>([]);
  const [includeAi, setIncludeAi] = useState(true);
  const [format, setFormat] = useState<Format>('md');
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      Promise.all([getBook(id), getEntriesByBook(id)]).then(([b, e]) => {
        setBook(b);
        setEntries(e);
      });
    }, [id])
  );

  async function doExport() {
    if (!book || busy) return;
    setBusy(true);
    try {
      const md = bookToMarkdown(book, entries, { includeAi });
      const content = format === 'md' ? md : format === 'html' ? markdownToHtml(md) : markdownToPlainText(md);
      const ext = format === 'md' ? 'md' : format === 'html' ? 'html' : 'txt';
      const mime = format === 'html' ? 'text/html' : 'text/plain';
      await shareText(`${book.title}.${ext}`, content, mime);
    } catch (e) {
      Alert.alert('导出失败', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!book) {
    return (
      <View style={styles.center}>
        <Text>加载中…</Text>
      </View>
    );
  }

  const aiCount = entries.filter((e) => e.discussion && e.discussion.length > 0).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
      <Text style={styles.meta}>{entries.length} 条笔记{includeAi ? ` · ${aiCount} 条含 AI 对话` : ''}</Text>

      <Section title="导出范围">
        <RadioRow
          selected={!includeAi}
          onSelect={() => setIncludeAi(false)}
          label="不包含 AI 对话"
          sub="只导笔记正文与阅读进度（导出更快、AI 敏感内容不外传）"
        />
        <RadioRow
          selected={includeAi}
          onSelect={() => setIncludeAi(true)}
          label="包含 AI 对话"
          sub="笔记正文 + 每条 AI 总结与苏格拉底对话记录"
        />
      </Section>

      <Section title="导出格式">
        {(['md', 'txt', 'html'] as Format[]).map((f, i) => (
          <View key={f}>
            <RadioRow
              selected={format === f}
              onSelect={() => setFormat(f)}
              label={FORMAT_LABEL[f]}
              sub={f === 'md' ? '适合再编辑、复制到笔记软件' : f === 'txt' ? '纯文本，最通用' : '可在浏览器打开，单文件'}
            />
            {i < 2 && <View style={styles.rowDivider} />}
          </View>
        ))}
      </Section>

      <Pressable
        style={[styles.exportBtn, busy && styles.exportBtnDisabled]}
        onPress={doExport}
        disabled={busy}
        hitSlop={6}>
        {busy ? <ActivityIndicator color={colors.primaryText} /> : <Text style={styles.exportBtnText}>导出并分享</Text>}
      </Pressable>
      <Text style={styles.hint}>导出后会触发系统分享面板，可保存到「文件」/ 复制内容 / 发到其他 App。</Text>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.group}>{children}</View>
    </View>
  );
}

function RadioRow({
  selected,
  onSelect,
  label,
  sub,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
  sub?: string;
}) {
  return (
    <Pressable style={styles.row} onPress={onSelect} hitSlop={6}>
      <View style={[styles.radio, selected && styles.radioActive]}>
        {selected && <View style={styles.radioDot} />}
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {!!sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bookTitle: { ...typography.title, fontSize: 20, color: colors.text },
  meta: { color: colors.textSubtle, fontSize: 13, marginTop: -spacing.lg },

  section: { gap: spacing.md - 2 },
  sectionTitle: { ...typography.caption, fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  group: { backgroundColor: colors.surface, borderRadius: radius.md + 2, overflow: 'hidden' },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg - 2, paddingHorizontal: spacing.lg, gap: spacing.md },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, color: colors.text, fontWeight: '500' },
  rowSub: { fontSize: 12, color: colors.textSubtle, marginTop: 2 },
  rowDivider: { height: 1, backgroundColor: colors.border, marginLeft: 50 },

  exportBtn: { backgroundColor: colors.primary, borderRadius: radius.md + 2, paddingVertical: spacing.lg, alignItems: 'center' },
  exportBtnDisabled: { opacity: 0.5 },
  exportBtnText: { color: colors.primaryText, fontSize: 16, fontWeight: '700' },
  hint: { color: colors.textSubtle, fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
