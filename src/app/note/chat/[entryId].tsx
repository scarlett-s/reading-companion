import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getEntry, getBook, getSettings, updateEntryDiscussion } from '@/db';
import { generateSocraticQuestion, generateSocraticSummary, isSocraticEnd } from '@/ai';
import { AISettings, DiscussionTurn, ReadingEntry } from '@/types';

const MAX_ROUNDS = 10;

export default function ChatScreen() {
  const router = useRouter();
  const { entryId } = useLocalSearchParams<{ entryId: string }>();

  const settingsRef = useRef<AISettings | null>(null);
  const [entry, setEntry] = useState<ReadingEntry | null>(null);
  const [bookTitle, setBookTitle] = useState('');
  const [turns, setTurns] = useState<DiscussionTurn[]>([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<string | null>(null);

  const roundCount = turns.filter((t) => t.role === 'assistant').length;

  useEffect(() => {
    (async () => {
      try {
        const [settings, e] = await Promise.all([getSettings(), getEntry(entryId ?? '')]);
        settingsRef.current = settings;
        if (!e) {
          setError('笔记不存在');
          setLoading(false);
          return;
        }
        setEntry(e);
        const book = await getBook(e.bookId);
        const title = book?.title ?? '';
        setBookTitle(title);
        setQuestion(await generateSocraticQuestion(settings, e.comment, [], title));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'AI 调用失败');
      } finally {
        setLoading(false);
      }
    })();
  }, [entryId]);

  async function submitAnswer() {
    const a = answer.trim();
    if (!a || loading || saving) return;
    setAnswer('');
    const next: DiscussionTurn[] = [
      ...turns,
      { role: 'assistant', text: question },
      { role: 'user', text: a },
    ];
    setTurns(next);

    if (next.filter((t) => t.role === 'assistant').length >= MAX_ROUNDS) {
      await finish(next);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const q = await generateSocraticQuestion(settingsRef.current!, entry!.comment, next, bookTitle);
      if (isSocraticEnd(q)) {
        setLoading(false);
        await finish(next);
      } else {
        setQuestion(q);
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 调用失败');
      setLoading(false);
    }
  }

  async function finish(finalTurns?: DiscussionTurn[]) {
    const t = finalTurns ?? turns;
    setSaving(true);
    setError('');
    try {
      const summary = t.length > 0 ? await generateSocraticSummary(settingsRef.current!, entry!.comment, t) : '';
      await updateEntryDiscussion(entryId ?? '', t, summary);
      setSaved(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  function leave() {
    router.replace('/');
  }

  if (saved !== null) {
    return (
      <View style={styles.center}>
        <Text style={styles.doneTitle}>已保存 ✓</Text>
        {saved.length > 0 && (
          <View style={styles.points}>
            <Text style={styles.pointsTitle}>AI 总结</Text>
            <Text style={styles.point}>{saved}</Text>
          </View>
        )}
        <Pressable style={styles.btn} onPress={leave}>
          <Text style={styles.btnText}>返回</Text>
        </Pressable>
      </View>
    );
  }

  if (error && turns.length === 0 && !loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.errorHint}>请先在「设置」里配置 AI（DeepSeek Key 或 Ollama）</Text>
        <Pressable style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>返回</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.commentBox}>
          <Text style={styles.commentLabel}>你的笔记</Text>
          <Text style={styles.commentText}>{entry?.comment}</Text>
        </View>

        {turns.map((t, i) => (
          <View key={i} style={t.role === 'assistant' ? styles.bubbleAI : styles.bubbleUser}>
            <Text style={t.role === 'assistant' ? styles.bubbleTextAI : styles.bubbleTextUser}>{t.text}</Text>
          </View>
        ))}

        {!loading && !error && question !== '' && (
          <View style={styles.bubbleAI}>
            <Text style={styles.bubbleTextAI}>{question}</Text>
          </View>
        )}

        {loading && <ActivityIndicator style={styles.loading} />}
        {!!error && <Text style={styles.errorText}>{error}</Text>}
        {saving && <Text style={styles.saving}>正在总结并保存…</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <TextInput
          style={styles.answerInput}
          value={answer}
          onChangeText={setAnswer}
          placeholder="简单回答…"
          multiline
          editable={!loading && !saving}
        />
        <Pressable
          style={[styles.btn, (loading || saving || !answer.trim()) && styles.btnDisabled]}
          disabled={loading || saving || !answer.trim()}
          onPress={submitAnswer}>
          <Text style={styles.btnText}>回答</Text>
        </Pressable>
        <View style={styles.footerRow}>
          <Text style={styles.roundInfo}>
            第 {Math.min(roundCount + 1, MAX_ROUNDS)} / {MAX_ROUNDS} 轮
          </Text>
          <Pressable onPress={() => finish()} disabled={saving || loading}>
            <Text style={styles.finishText}>结束并保存</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12 },
  commentBox: { backgroundColor: '#f4f6f8', borderRadius: 10, padding: 12 },
  commentLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  commentText: { fontSize: 14, lineHeight: 20 },
  bubbleAI: { alignSelf: 'flex-start', backgroundColor: '#f0f0f0', borderRadius: 12, padding: 10, maxWidth: '85%' },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: '#208AEF', borderRadius: 12, padding: 10, maxWidth: '85%' },
  bubbleTextAI: { fontSize: 14, lineHeight: 20, color: '#222' },
  bubbleTextUser: { fontSize: 14, lineHeight: 20, color: '#fff' },
  loading: { marginVertical: 12 },
  saving: { color: '#888', fontSize: 13 },
  errorText: { color: '#c0392b', fontSize: 14, lineHeight: 20 },
  errorHint: { color: '#888', fontSize: 13, textAlign: 'center' },
  doneTitle: { fontSize: 20, fontWeight: '700' },
  points: { width: '100%', backgroundColor: '#f4f6f8', borderRadius: 10, padding: 14, gap: 6 },
  pointsTitle: { fontSize: 13, color: '#888', marginBottom: 2 },
  point: { fontSize: 14, lineHeight: 20 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0', gap: 10 },
  answerInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 60,
  },
  btn: { backgroundColor: '#208AEF', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roundInfo: { fontSize: 13, color: '#888' },
  finishText: { fontSize: 14, color: '#8e44ad', fontWeight: '600' },
});
