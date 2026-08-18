import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getSettings, getBook, addEntry, generateId } from '@/db';
import { generateQuestion, extractKeyPoints } from '@/ai';
import { todayString } from '@/utils';
import { AISettings, DiscussionTurn } from '@/types';

const MAX_ROUNDS = 3;

type Params = {
  bookId: string;
  comment: string;
  currentPage?: string;
  progressPercent?: string;
  pagesRead?: string;
  date?: string;
};

export default function DiscussScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();

  const settingsRef = useRef<AISettings | null>(null);
  const [bookTitle, setBookTitle] = useState('');
  const [turns, setTurns] = useState<DiscussionTurn[]>([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<string[] | null>(null);

  const roundCount = turns.length / 2;

  useEffect(() => {
    (async () => {
      try {
        const [settings, book] = await Promise.all([getSettings(), getBook(params.bookId ?? '')]);
        settingsRef.current = settings;
        const title = book?.title ?? '';
        setBookTitle(title);
        setQuestion(await generateQuestion(settings, params.comment ?? '', [], title));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'AI 调用失败');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function submitAnswer() {
    const a = answer.trim();
    if (!a || loading || extracting) return;
    setAnswer('');
    const next: DiscussionTurn[] = [
      ...turns,
      { role: 'assistant', text: question },
      { role: 'user', text: a },
    ];
    setTurns(next);

    if (next.length / 2 >= MAX_ROUNDS) {
      await finish(next);
    } else {
      setLoading(true);
      setError('');
      try {
        setQuestion(await generateQuestion(settingsRef.current!, params.comment ?? '', next, bookTitle));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'AI 调用失败');
      } finally {
        setLoading(false);
      }
    }
  }

  async function finish(finalTurns?: DiscussionTurn[]) {
    const t = finalTurns ?? turns;
    setExtracting(true);
    setError('');
    try {
      const kp =
        t.length > 0
          ? await extractKeyPoints(settingsRef.current!, params.comment ?? '', t)
          : [];
      await addEntry({
        id: generateId(),
        bookId: params.bookId ?? '',
        date: params.date || todayString(),
        currentPage: params.currentPage ? Number(params.currentPage) : undefined,
        progressPercent: params.progressPercent ? Number(params.progressPercent) : undefined,
        pagesRead: params.pagesRead ? Number(params.pagesRead) : undefined,
        comment: params.comment ?? '',
        mode: 'discuss',
        discussion: t,
        aiKeyPoints: kp,
        createdAt: Date.now(),
      });
      setSaved(kp);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setExtracting(false);
    }
  }

  function leave() {
    router.replace({ pathname: '/book/[id]', params: { id: params.bookId ?? '' } });
  }

  if (saved !== null) {
    return (
      <View style={styles.center}>
        <Text style={styles.doneTitle}>已保存 ✓</Text>
        {saved.length > 0 && (
          <View style={styles.points}>
            <Text style={styles.pointsTitle}>AI 提炼要点</Text>
            {saved.map((p, i) => (
              <Text key={i} style={styles.point}>
                · {p}
              </Text>
            ))}
          </View>
        )}
        <Pressable style={styles.btn} onPress={leave}>
          <Text style={styles.btnText}>返回图书</Text>
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
          <Text style={styles.commentLabel}>你的评论</Text>
          <Text style={styles.commentText}>{params.comment}</Text>
        </View>

        {turns.map((t, i) => (
          <View key={i} style={t.role === 'assistant' ? styles.bubbleAI : styles.bubbleUser}>
            <Text style={t.role === 'assistant' ? styles.bubbleTextAI : styles.bubbleTextUser}>
              {t.text}
            </Text>
          </View>
        ))}

        {!loading && !error && question !== '' && (
          <View style={styles.bubbleAI}>
            <Text style={styles.bubbleTextAI}>{question}</Text>
          </View>
        )}

        {loading && <ActivityIndicator style={styles.loading} />}
        {!!error && <Text style={styles.errorText}>{error}</Text>}
        {extracting && <Text style={styles.extracting}>正在提炼要点…</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <TextInput
          style={styles.answerInput}
          value={answer}
          onChangeText={setAnswer}
          placeholder="简单回答…"
          multiline
          editable={!loading && !extracting}
        />
        <Pressable
          style={[styles.btn, (loading || extracting || !answer.trim()) && styles.btnDisabled]}
          disabled={loading || extracting || !answer.trim()}
          onPress={submitAnswer}>
          <Text style={styles.btnText}>回答</Text>
        </Pressable>
        <View style={styles.footerRow}>
          <Text style={styles.roundInfo}>
            第 {Math.min(roundCount + 1, MAX_ROUNDS)} / {MAX_ROUNDS} 轮
          </Text>
          <Pressable onPress={() => finish()} disabled={extracting || loading}>
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
  extracting: { color: '#888', fontSize: 13 },
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
