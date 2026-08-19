import { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getAllBooks, addEntry, generateId } from '@/db';
import { todayString } from '@/utils';
import { Book } from '@/types';

export default function NewNoteScreen() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [bookQuery, setBookQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [currentPage, setCurrentPage] = useState('');
  const [percent, setPercent] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getAllBooks().then(setBooks);
    }, [])
  );

  const matches = useMemo(() => {
    const q = bookQuery.trim().toLowerCase();
    if (!q || selectedBook) return [];
    return books
      .filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q))
      .slice(0, 5);
  }, [bookQuery, books, selectedBook]);

  function selectBook(b: Book) {
    setSelectedBook(b);
    setBookQuery(b.title);
  }

  const hasProgress = currentPage.trim().length > 0 || percent.trim().length > 0;
  const canSave = selectedBook != null && hasProgress && comment.trim().length > 0;

  function buildEntry(mode: 'plain' | 'chat') {
    if (!selectedBook) return null;
    return {
      id: generateId(),
      bookId: selectedBook.id,
      date: todayString(),
      currentPage: currentPage.trim() ? Number(currentPage) : undefined,
      progressPercent: percent.trim() ? Number(percent) : undefined,
      comment: comment.trim(),
      mode,
      createdAt: Date.now(),
    };
  }

  async function submitPlain() {
    const entry = buildEntry('plain');
    if (!entry) return;
    setSaving(true);
    await addEntry(entry);
    router.back();
  }

  async function goChat() {
    const entry = buildEntry('chat');
    if (!entry) return;
    setSaving(true);
    await addEntry(entry);
    router.replace({ pathname: '/note/chat/[entryId]', params: { entryId: entry.id } });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>书名</Text>
      <TextInput
        style={styles.input}
        value={bookQuery}
        onChangeText={(t) => {
          setBookQuery(t);
          setSelectedBook(null);
        }}
        placeholder="输入书名，从书库选择"
        autoCorrect={false}
      />
      {!selectedBook && bookQuery.trim().length > 0 && (
        <View style={styles.dropdown}>
          {matches.map((b) => (
            <Pressable key={b.id} style={styles.dropdownItem} onPress={() => selectBook(b)}>
              <Text style={styles.dropdownTitle} numberOfLines={1}>
                {b.title}
              </Text>
              <Text style={styles.dropdownAuthor}>{b.author}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.dropdownItem} onPress={() => router.push('/book/search')}>
            <Text style={styles.addNew}>＋ 添加新图书</Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.label}>阅读进度（页数 或 百分比，至少填一项）</Text>
      <View style={styles.progressRow}>
        <TextInput
          style={[styles.input, styles.progressField]}
          value={currentPage}
          onChangeText={setCurrentPage}
          placeholder="读到第几页"
          keyboardType="number-pad"
        />
        <TextInput
          style={[styles.input, styles.progressField]}
          value={percent}
          onChangeText={setPercent}
          placeholder="百分比 %"
          keyboardType="number-pad"
        />
      </View>

      <Text style={styles.label}>笔记（必填）</Text>
      <TextInput
        style={styles.commentInput}
        value={comment}
        onChangeText={setComment}
        placeholder="今天读完后的一点想法…"
        multiline
        textAlignVertical="top"
      />

      <View style={styles.actions}>
        <Pressable
          style={[styles.btn, styles.btnChat, (!canSave || saving) && styles.btnDisabled]}
          disabled={!canSave || saving}
          onPress={goChat}>
          <Text style={styles.btnText}>与 AI 聊天</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, (!canSave || saving) && styles.btnDisabled]}
          disabled={!canSave || saving}
          onPress={submitPlain}>
          <Text style={styles.btnText}>提交</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>「与 AI 聊天」先保存笔记，再进入苏格拉底式对话（最多 10 轮）。</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, gap: 10 },
  label: { fontSize: 13, color: '#555', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginTop: -2,
    backgroundColor: '#fff',
    elevation: 2,
  },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  dropdownTitle: { fontSize: 15, fontWeight: '500' },
  dropdownAuthor: { fontSize: 12, color: '#888', marginTop: 1 },
  addNew: { fontSize: 14, color: '#208AEF', fontWeight: '600' },
  progressRow: { flexDirection: 'row', gap: 10 },
  progressField: { flex: 1 },
  commentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 100,
  },
  actions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  btn: { flex: 1, backgroundColor: '#208AEF', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnChat: { backgroundColor: '#7CB342' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  hint: { fontSize: 12, color: '#999', lineHeight: 17, marginTop: 4 },
});
