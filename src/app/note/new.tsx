import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  InputAccessoryView,
  Platform,
  Keyboard,
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { getAllBooks, addEntry, updateEntry, getEntry, getBook, generateId } from '@/db';
import { todayString } from '@/utils';
import { Book, ReadingEntry } from '@/types';

const SUBMIT_ID = 'note-new-submit';

export default function NewNoteScreen() {
  const router = useRouter();
  const { entryId } = useLocalSearchParams<{ entryId?: string }>();
  const editing = !!entryId;

  const [books, setBooks] = useState<Book[]>([]);
  const [original, setOriginal] = useState<ReadingEntry | null>(null);
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

  useEffect(() => {
    if (!entryId) return;
    (async () => {
      const e = await getEntry(entryId);
      if (!e) return;
      setOriginal(e);
      const b = await getBook(e.bookId);
      if (b) {
        setSelectedBook(b);
        setBookQuery(b.title);
      }
      setCurrentPage(e.currentPage != null ? String(e.currentPage) : '');
      setPercent(e.progressPercent != null ? String(e.progressPercent) : '');
      setComment(e.comment);
    })();
  }, [entryId]);

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
    if (editing && original && selectedBook) {
      setSaving(true);
      await updateEntry(original.id, {
        bookId: selectedBook.id,
        date: original.date,
        currentPage: currentPage.trim() ? Number(currentPage) : undefined,
        progressPercent: percent.trim() ? Number(percent) : undefined,
        comment: comment.trim(),
      });
      Keyboard.dismiss();
      router.back();
      return;
    }
    const entry = buildEntry('plain');
    if (!entry) return;
    setSaving(true);
    await addEntry(entry);
    Keyboard.dismiss();
    router.back();
  }

  async function goChat() {
    const entry = buildEntry('chat');
    if (!entry) return;
    setSaving(true);
    await addEntry(entry);
    Keyboard.dismiss();
    router.replace({ pathname: '/note/chat/[entryId]', params: { entryId: entry.id } });
  }

  // iOS 键盘附件视图（顶部放「提交」按钮）
  const accessory = Platform.OS === 'ios' && (
    <InputAccessoryView nativeID={SUBMIT_ID}>
      <View style={styles.accessory}>
        <View style={{ flex: 1 }} />
        <Pressable
          style={[styles.accessorySubmit, !canSave && styles.btnDisabled]}
          disabled={!canSave}
          onPress={submitPlain}>
          <Text style={styles.accessorySubmitText}>提交</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
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
            <Pressable style={styles.dropdownItem} onPress={() => router.push('/library/add')}>
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
          inputAccessoryViewID={Platform.OS === 'ios' ? SUBMIT_ID : undefined}
        />

        {!editing && (
          <Text style={styles.hint}>「与 AI 对话」先保存笔记，再进入苏格拉底式对话（最多 10 轮）。</Text>
        )}
      </ScrollView>

      {!editing && (
        <View style={styles.bottomBar} pointerEvents="box-none">
          <View style={styles.bottomRow}>
            <View style={{ flex: 1 }} />
            <Pressable
              style={[styles.btnChat, !canSave && styles.btnDisabled]}
              disabled={!canSave}
              onPress={goChat}>
              <Text style={styles.btnText}>与 AI 对话</Text>
            </Pressable>
          </View>
        </View>
      )}

      {accessory}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  scroll: { flex: 1 },
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
    minHeight: 140,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
  },
  bottomRow: { flexDirection: 'row', alignItems: 'center' },
  btnChat: {
    backgroundColor: '#7CB342',
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  hint: { fontSize: 12, color: '#999', lineHeight: 17, marginTop: 4 },
  accessory: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  accessorySubmit: {
    backgroundColor: '#208AEF',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  accessorySubmitText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});