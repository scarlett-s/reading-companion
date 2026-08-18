import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getBook, addEntry, generateId } from '@/db';
import { todayString } from '@/utils';
import { Book } from '@/types';

export default function NewEntryScreen() {
  const router = useRouter();
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [currentPage, setCurrentPage] = useState('');
  const [percent, setPercent] = useState('');
  const [pagesRead, setPagesRead] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (bookId) getBook(bookId).then(setBook);
  }, [bookId]);

  const hasProgress = currentPage.trim().length > 0 || percent.trim().length > 0;

  async function savePlain() {
    if (!bookId || !hasProgress) return;
    await addEntry({
      id: generateId(),
      bookId,
      date: todayString(),
      currentPage: currentPage.trim() ? Number(currentPage) : undefined,
      progressPercent: percent.trim() ? Number(percent) : undefined,
      pagesRead: pagesRead.trim() ? Number(pagesRead) : undefined,
      comment: comment.trim(),
      mode: 'plain',
      createdAt: Date.now(),
    });
    router.back();
  }

  function goDiscuss() {
    if (!bookId || !hasProgress || !comment.trim()) return;
    router.push({
      pathname: '/entry/discuss',
      params: {
        bookId,
        comment,
        currentPage,
        progressPercent: percent,
        pagesRead,
      },
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.bookTitle}>{book?.title ?? '…'}</Text>

      <Text style={styles.label}>进度（页数 与 百分比 至少填一项）</Text>
      <View style={styles.progressRow}>
        <View style={styles.progressField}>
          <TextInput
            style={styles.input}
            value={currentPage}
            onChangeText={setCurrentPage}
            placeholder="读到第几页"
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.progressField}>
          <TextInput
            style={styles.input}
            value={percent}
            onChangeText={setPercent}
            placeholder="百分比 %"
            keyboardType="number-pad"
          />
        </View>
      </View>

      <Text style={styles.label}>本次读了多少页（可选）</Text>
      <TextInput
        style={styles.input}
        value={pagesRead}
        onChangeText={setPagesRead}
        placeholder="页数"
        keyboardType="number-pad"
      />

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
        <Pressable
          style={[styles.btn, (!bookId || !hasProgress) && styles.btnDisabled]}
          disabled={!bookId || !hasProgress}
          onPress={savePlain}>
          <Text style={styles.btnText}>直接保存</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, styles.btnDiscuss, (!bookId || !hasProgress || !comment.trim()) && styles.btnDisabled]}
          disabled={!bookId || !hasProgress || !comment.trim()}
          onPress={goDiscuss}>
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
  bookTitle: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  label: { fontSize: 13, color: '#555', marginTop: 4 },
  progressRow: { flexDirection: 'row', gap: 10 },
  progressField: { flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
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
  btn: {
    flex: 1,
    backgroundColor: '#208AEF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDiscuss: { backgroundColor: '#8e44ad' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  hint: { fontSize: 12, color: '#999', lineHeight: 17, marginTop: 4 },
});
