import { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getAllBooks, addEntry, generateId } from '@/db';
import { todayString } from '@/utils';
import { Book } from '@/types';

export default function RecordScreen() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [bookQuery, setBookQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [date, setDate] = useState(todayString());
  const [currentPage, setCurrentPage] = useState('');
  const [percent, setPercent] = useState('');
  const [comment, setComment] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  useFocusEffect(
    useCallback(() => {
      getAllBooks().then(setBooks);
    }, [])
  );

  // 从书库中按书名/作者模糊匹配
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
  const canSave = selectedBook != null && hasProgress;
  const canDiscuss = canSave && comment.trim().length > 0;

  function reset() {
    setSelectedBook(null);
    setBookQuery('');
    setCurrentPage('');
    setPercent('');
    setComment('');
    setDate(todayString());
  }

  async function savePlain() {
    if (!selectedBook || !hasProgress) return;
    await addEntry({
      id: generateId(),
      bookId: selectedBook.id,
      date: date || todayString(),
      currentPage: currentPage.trim() ? Number(currentPage) : undefined,
      progressPercent: percent.trim() ? Number(percent) : undefined,
      comment: comment.trim(),
      mode: 'plain',
      createdAt: Date.now(),
    });
    reset();
    setSavedMsg('已保存 ✓');
    setTimeout(() => setSavedMsg(''), 2000);
  }

  function goDiscuss() {
    if (!selectedBook || !canDiscuss) return;
    router.push({
      pathname: '/entry/discuss',
      params: {
        bookId: selectedBook.id,
        comment,
        currentPage,
        progressPercent: percent,
        date,
      },
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>记录</Text>
      {!!savedMsg && <Text style={styles.saved}>{savedMsg}</Text>}

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

      <Text style={styles.label}>日期</Text>
      <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" autoCorrect={false} />

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

      <Text style={styles.label}>评论</Text>
      <TextInput
        style={styles.commentInput}
        value={comment}
        onChangeText={setComment}
        placeholder="今天读完后的一点想法…"
        multiline
        textAlignVertical="top"
      />

      <View style={styles.actions}>
        <Pressable style={[styles.btn, !canSave && styles.btnDisabled]} disabled={!canSave} onPress={savePlain}>
          <Text style={styles.btnText}>直接保存</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.btnDiscuss, !canDiscuss && styles.btnDisabled]} disabled={!canDiscuss} onPress={goDiscuss}>
          <Text style={styles.btnText}>Discuss</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>Discuss：AI 基于你的评论追问（最多 3 轮），结束后提炼要点一起保存。</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, gap: 10 },
  title: { fontSize: 26, fontWeight: '700' },
  saved: { fontSize: 14, color: '#27ae60', fontWeight: '600' },
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
  btnDiscuss: { backgroundColor: '#8e44ad' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  hint: { fontSize: 12, color: '#999', lineHeight: 17, marginTop: 4 },
});
