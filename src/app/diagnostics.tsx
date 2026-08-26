import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  getAllEntries,
  getAllBooks,
  getBook,
  getEntry,
  getSettings,
  saveSetting,
  getEmbedding,
  getEmbeddingStats,
  getEntriesMissingEmbedding,
  deleteEmbedding,
  addBook,
  addEntry,
  deleteBook,
  generateId,
} from '@/db';
import {
  onEntrySaved,
  backfillEmbeddings,
  retrieveRelatedNotes,
  retrieveByVector,
  OpenAIEmbeddingProvider,
  resolveEmbeddingModel,
  resolveEmbeddingUrl,
  MIN_SIMILARITY,
  MAX_RETRIEVED,
} from '@/embedding';
import { generateSocraticQuestion } from '@/ai';
import { Book } from '@/types';
import { todayString } from '@/utils';

interface NoteItem {
  id: string;
  bookId: string;
  title: string;
  comment: string;
  date: string;
}

const SEED_TITLE = '🧪 RAG 测试语料';
const SEED_COMMENTS = [
  '苏格拉底的助产术强调通过提问引出对方已有的知识。',
  '苏格拉底认为美德即知识，无人有意作恶。',
  '苏格拉底的助产术强调通过提问引出对方已有的知识。', // 与第 1 条完全重复
  '苏格拉底认为美德即知识，无人有意作恶。', // 与第 2 条完全重复
  '今天做红烧肉，先焯水去腥，再小火慢炖一小时。',
  '红烧肉的关键是糖色，火候过了会发苦。',
];

function fmtRetrieved(res: { title: string; score: number; comment: string }[]): string {
  if (res.length === 0) return '（无结果）';
  return res.map((r, i) => `#${i + 1} score=${r.score.toFixed(4)} 《${r.title}》 ${r.comment}`).join('\n');
}

export default function DiagnosticsScreen() {
  const router = useRouter();
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [index, setIndex] = useState(0);
  const [stats, setStats] = useState<{ total: number; ready: number; pending: number; failed: number; missing: number } | null>(null);
  const [config, setConfig] = useState<{ baseUrl: string; model: string; embeddingModel: string; embedUrl: string } | null>(null);
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [freeQuery, setFreeQuery] = useState('量子力学与相对论');

  const load = useCallback(async () => {
    const [es, books, s, cfg] = await Promise.all([
      getAllEntries(),
      getAllBooks(),
      getEmbeddingStats(),
      getSettings(),
    ]);
    const bm = new Map(books.map((b) => [b.id, b.title]));
    setNotes(
      es.map((e) => ({ id: e.id, bookId: e.bookId, title: bm.get(e.bookId) ?? '未知书', comment: e.comment, date: e.date }))
    );
    setStats(s);
    setConfig({ baseUrl: cfg.baseUrl, model: cfg.model, embeddingModel: resolveEmbeddingModel(cfg), embedUrl: resolveEmbeddingUrl(cfg) });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cur = notes[Math.min(index, notes.length - 1)] ?? null;

  async function guard(fn: () => Promise<void>) {
    setBusy(true);
    setResult('');
    try {
      await fn();
    } catch (err) {
      setResult(`❌ 出错：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  // ① 生成 embedding（跑完整 pipeline）
  function runPipeline() {
    guard(async () => {
      if (!cur) return;
      const t0 = Date.now();
      await onEntrySaved(cur.id);
      const emb = await getEmbedding(cur.id);
      const ms = Date.now() - t0;
      const head = emb?.embedding?.slice(0, 5).map((n) => n.toFixed(4)).join(', ') ?? '';
      setResult(
        `noteId=${cur.id}\nstatus=${emb?.status ?? '无记录'}\nmodel=${emb?.model ?? '-'}\ndims=${emb?.dimensions ?? '-'}\ncontent_hash=${emb?.contentHash ?? '-'}\n耗时=${ms}ms\n前5值=[${head}]`
      );
      load();
    });
  }

  // ①b 直接对当前笔记正文调 provider.embed
  function runEmbedRaw() {
    guard(async () => {
      if (!cur) return;
      const s = await getSettings();
      if (!s.baseUrl) {
        setResult('未配置 AI（baseUrl 为空）');
        return;
      }
      const t0 = Date.now();
      const vec = await new OpenAIEmbeddingProvider(s).embed(cur.comment);
      const ms = Date.now() - t0;
      setResult(`url=${resolveEmbeddingUrl(s)}\nmodel=${resolveEmbeddingModel(s)}\ndims=${vec.length}\n耗时=${ms}ms\n前5值=[${vec.slice(0, 5).map((n) => n.toFixed(4)).join(', ')}]`);
    });
  }

  // ② 语义检索（阈值 0 看全貌，便于肉眼判断相关性）
  function runRetrieval() {
    guard(async () => {
      if (!cur) return;
      const res = await retrieveRelatedNotes(cur.id, { topK: 8, threshold: 0 });
      setResult(`query=《${cur.title}》 "${cur.comment.slice(0, 40)}…"\n当前阈值 MIN_SIMILARITY=${MIN_SIMILARITY}\n\n${fmtRetrieved(res)}`);
    });
  }

  // ②b 无关 query（应返回空）
  function runUnrelated() {
    guard(async () => {
      const text = freeQuery.trim();
      if (!text) {
        setResult('请先输入 query 文本');
        return;
      }
      const s = await getSettings();
      if (!s.baseUrl) {
        setResult('未配置 AI');
        return;
      }
      const vec = await new OpenAIEmbeddingProvider(s).embed(text);
      const res = await retrieveByVector(vec, { topK: 8, threshold: MIN_SIMILARITY });
      setResult(`query="${text}"\n阈值=${MIN_SIMILARITY}\n\n${fmtRetrieved(res)}${res.length === 0 ? '\n（空 = 正常：无相关历史笔记）' : ''}`);
    });
  }

  // ③ RAG A/B：同一条笔记，关/开 RAG 各问一次
  function runRagAB() {
    guard(async () => {
      if (!cur) return;
      const s = await getSettings();
      if (!s.baseUrl || !s.model) {
        setResult('未配置 AI（baseUrl/model 为空）');
        return;
      }
      const book = await getBook(cur.bookId);
      const title = book?.title ?? '';
      const related = await retrieveRelatedNotes(cur.id, { topK: MAX_RETRIEVED, threshold: MIN_SIMILARITY });
      const off = await generateSocraticQuestion(s, cur.comment, [], title, []);
      const on = await generateSocraticQuestion(s, cur.comment, [], title, related);
      setResult(
        `【RAG 关】\n${off}\n\n【RAG 开】（注入 ${related.length} 条）\n${on}\n\n—— 注入的相关笔记 ——\n${fmtRetrieved(related)}`
      );
    });
  }

  // ④ 反例：embedding API 失效
  function runApiFailure() {
    guard(async () => {
      if (!cur) return;
      const s = await getSettings();
      const orig = s.baseUrl;
      const lines: string[] = [];
      // 1) provider 直接调用：应抛错
      try {
        await new OpenAIEmbeddingProvider({ ...s, baseUrl: 'http://127.0.0.1:1' }).embed('测试');
        lines.push('provider.embed 意外成功（未抛错）');
      } catch (err) {
        lines.push(`provider.embed 抛错（预期）：${err instanceof Error ? err.message : String(err)}`);
      }
      // 2) 完整 pipeline：清 embedding → 坏 baseUrl → 重生成 → 应 failed，笔记不受影响
      await deleteEmbedding(cur.id);
      await saveSetting('baseUrl', 'http://127.0.0.1:1');
      await onEntrySaved(cur.id);
      const emb = await getEmbedding(cur.id);
      await saveSetting('baseUrl', orig);
      const note = await getEntry(cur.id);
      lines.push(`pipeline 后 status=${emb?.status ?? '无记录'}（预期 failed）`);
      lines.push(`笔记仍存在：${note ? '是' : '否'}（预期 是）`);
      lines.push('已恢复 baseUrl；要恢复该笔记 embedding 请再点「① 生成 embedding」或跑 backfill。');
      setResult(lines.join('\n'));
      load();
    });
  }

  // ④ 反例：旧笔记无 embedding → backfill
  function runBackfill() {
    guard(async () => {
      const before = await getEmbeddingStats();
      const missing = await getEntriesMissingEmbedding(1000);
      await backfillEmbeddings(20);
      const after = await getEmbeddingStats();
      setResult(
        `backfill 前：ready=${before.ready}，missing=${before.missing}\n待补笔记数=${missing.length}\nbackfill 后：ready=${after.ready}，missing=${after.missing}\n\n（每批 ≤20，失败会标 failed 供重试）`
      );
      load();
    });
  }

  // ④ 反例：seed 重复语料 / 清除
  function runSeed() {
    guard(async () => {
      const exists = (await getAllBooks()).find((b) => b.title === SEED_TITLE);
      if (exists) {
        setResult('已存在测试语料书，请先「清除语料」再 seed。');
        return;
      }
      const book: Book = { id: generateId(), title: SEED_TITLE, author: '测试', status: 'reading', readCount: 0, createdAt: Date.now() };
      await addBook(book);
      const date = todayString();
      for (const c of SEED_COMMENTS) {
        const id = generateId();
        await addEntry({ id, bookId: book.id, date, comment: c, mode: 'plain', createdAt: Date.now() });
        await onEntrySaved(id);
      }
      setResult(`已 seed ${SEED_COMMENTS.length} 条笔记到《${SEED_TITLE}》并生成 embedding。\n建议：选一条「苏格拉底」笔记跑 ②（应命中同类、重复被去重）；再选它跑 ③ 看 A/B。`);
      load();
      setIndex(0);
    });
  }

  function runCleanup() {
    guard(async () => {
      const book = (await getAllBooks()).find((b) => b.title === SEED_TITLE);
      if (!book) {
        setResult('没有测试语料书，无需清除。');
        return;
      }
      await deleteBook(book.id);
      setResult(`已删除《${SEED_TITLE}》及其全部笔记与 embedding。`);
      load();
      setIndex(0);
    });
  }

  const Btn = ({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) => (
    <Pressable style={[styles.btn, danger && styles.btnDanger]} onPress={onPress} disabled={busy}>
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={styles.back}>‹ 返回</Text>
          </Pressable>
          <Text style={styles.title}>诊断 / 测试</Text>
          <Pressable onPress={load} hitSlop={10}>
            <Text style={styles.refresh}>刷新</Text>
          </Pressable>
        </View>

        {config && (
          <View style={styles.box}>
            <Text style={styles.mono}>
              baseUrl: {config.baseUrl || '（空）'}{'\n'}model: {config.model || '（空）'}{'\n'}embeddingModel: {config.embeddingModel}{'\n'}embed POST → {config.embedUrl}
            </Text>
          </View>
        )}
        {stats && (
          <View style={styles.box}>
            <Text style={styles.mono}>
              笔记 {notes.length} 条 · embedding：ready {stats.ready} / pending {stats.pending} / failed {stats.failed} / 缺 {stats.missing}
            </Text>
          </View>
        )}

        <View style={styles.notePicker}>
          <Pressable style={styles.navBtn} onPress={() => setIndex((i) => Math.max(0, i - 1))} disabled={busy}>
            <Text style={styles.navText}>‹</Text>
          </Pressable>
          <View style={styles.noteInfo}>
            <Text style={styles.noteTitle} numberOfLines={1}>
              {cur ? `#${index + 1}《${cur.title}》${cur.date}` : '（无笔记）'}
            </Text>
            <Text style={styles.noteComment} numberOfLines={2}>
              {cur ? cur.comment : '请先创建笔记或 seed 测试语料'}
            </Text>
          </View>
          <Pressable style={styles.navBtn} onPress={() => setIndex((i) => Math.min(notes.length - 1, i + 1))} disabled={busy}>
            <Text style={styles.navText}>›</Text>
          </Pressable>
        </View>

        {!config?.baseUrl && <Text style={styles.warn}>⚠️ 未配置 AI，大多数测试需要先在「设置」里填 baseUrl（Ollama/OpenAI）。</Text>}

        <View style={styles.group}>
          <Text style={styles.groupTitle}>① Embedding 生成</Text>
          <Btn label="跑 pipeline（onEntrySaved）" onPress={runPipeline} />
          <Btn label="直接 embed 当前笔记正文" onPress={runEmbedRaw} />
        </View>

        <View style={styles.group}>
          <Text style={styles.groupTitle}>② 语义检索</Text>
          <Btn label="检索与当前笔记相关的历史笔记" onPress={runRetrieval} />
          <TextInput
            style={styles.input}
            value={freeQuery}
            onChangeText={setFreeQuery}
            placeholder="无关 query 文本"
            autoCorrect={false}
          />
          <Btn label="用上面的 query 检索（应返回空）" onPress={runUnrelated} />
        </View>

        <View style={styles.group}>
          <Text style={styles.groupTitle}>③ RAG A/B 对比</Text>
          <Btn label="同一笔记：RAG 关 vs 开 各问一次" onPress={runRagAB} />
        </View>

        <View style={styles.group}>
          <Text style={styles.groupTitle}>④ 反例</Text>
          <Btn label="embedding API 失效（坏 baseUrl）" onPress={runApiFailure} danger />
          <Btn label="旧笔记无 embedding → 跑 backfill" onPress={runBackfill} />
          <Btn label="seed 重复语料（6 条）" onPress={runSeed} />
          <Btn label="清除测试语料" onPress={runCleanup} danger />
        </View>

        {busy && <ActivityIndicator style={styles.loading} />}
        {!!result && (
          <View style={styles.result}>
            <Text style={styles.resultText} selectable>
              {result}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  back: { fontSize: 16, color: '#208AEF' },
  refresh: { fontSize: 14, color: '#208AEF' },
  title: { fontSize: 18, fontWeight: '700' },
  box: { backgroundColor: '#f4f6f8', borderRadius: 10, padding: 10 },
  mono: { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 12, lineHeight: 18, color: '#333' },
  notePicker: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#eee', borderRadius: 8 },
  navText: { fontSize: 18, color: '#555' },
  noteInfo: { flex: 1 },
  noteTitle: { fontSize: 13, fontWeight: '600' },
  noteComment: { fontSize: 12, color: '#777', marginTop: 2 },
  warn: { color: '#b8860b', fontSize: 12, lineHeight: 17 },
  group: { gap: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 12 },
  groupTitle: { fontSize: 15, fontWeight: '700' },
  btn: { backgroundColor: '#208AEF', borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  btnDanger: { backgroundColor: '#e74c3c' },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  loading: { marginVertical: 8 },
  result: { backgroundColor: '#1e1e1e', borderRadius: 10, padding: 12 },
  resultText: { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 12, lineHeight: 18, color: '#fff' },
});
