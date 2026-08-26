// Embedding Pipeline + Semantic Retrieval + 渐进式 RAG
// 职责：provider 抽象、content_hash 去重、异步 pipeline（不阻塞保存）、本地 cosine 检索、backfill。
// 说明：向量存 SQLite、JS 里算 cosine，规模（几百~几千条）够用；retrieval 层可替换为向量索引/vector DB。

import { AISettings, EmbeddingProvider, RetrievedNote } from './types';
import {
  getSettings,
  getEntry,
  getBook,
  getEmbedding,
  getAllReadyEmbeddings,
  upsertEmbedding,
  markEmbeddingPending,
  markEmbeddingFailed,
  deleteEmbedding,
  getEntriesMissingEmbedding,
} from './db';

// ===== 常量（Token/上下文控制） =====
export const MAX_RETRIEVED = 3; // 最多注入的历史笔记数
export const MIN_SIMILARITY = 0.5; // cosine 最低阈值
export const MAX_COMMENT_CHARS = 200; // 单条历史笔记注入上下文的最多字数
const DEDUP_THRESHOLD = 0.98; // 与已保留项高度相似则去重

// ===== content_hash =====

/** 简单稳定哈希（djb2，32bit，hex）——只用于变更检测，非加密 */
export function hashString(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}

// ===== Provider =====

/** 解析 embedding model：优先 settings.embeddingModel，否则按 baseUrl 推断（Ollama 用 nomic） */
export function resolveEmbeddingModel(settings: AISettings): string {
  const explicit = (settings.embeddingModel ?? '').trim();
  if (explicit) return explicit;
  return settings.baseUrl.includes('11434') ? 'nomic-embed-text' : 'text-embedding-3-small';
}

/** 是否为 Ollama（默认端口 11434） */
export function isOllama(baseUrl: string): boolean {
  return /:11434(\/|$)/.test(baseUrl);
}

/** 提取 origin（scheme://host:port）；Ollama 原生 /api/embed 只认 origin，与 baseUrl 是否带 /v1 无关 */
function originOf(baseUrl: string): string {
  const m = baseUrl.match(/^(https?:\/\/[^/]+)/i);
  return m ? m[1] : baseUrl.replace(/\/+$/, '');
}

/** 计算 embedding 请求 URL：Ollama → /api/embed，其它 → OpenAI 兼容 /embeddings */
export function resolveEmbeddingUrl(settings: AISettings): string {
  const { baseUrl } = settings;
  return isOllama(baseUrl)
    ? `${originOf(baseUrl)}/api/embed`
    : `${baseUrl.replace(/\/+$/, '')}/embeddings`;
}

/**
 * 默认实现：按 baseUrl 自动选端点。
 * - Ollama（:11434）→ 原生 POST /api/embed，body {model, input}，响应 embeddings[0]
 * - 其它（OpenAI 等）→ OpenAI 兼容 POST /embeddings，body {model, input}，响应 data[0].embedding
 * 请求前打印 URL/body、响应后打印 status/body（真机排查用）；错误信息也带上三者，便于在诊断屏看到。
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  constructor(private settings: AISettings) {}

  modelInfo(): { model: string; dimensions: number } {
    // 维度要 embed 之后才知道，这里只给 model 名
    return { model: resolveEmbeddingModel(this.settings), dimensions: 0 };
  }

  async embed(text: string): Promise<number[]> {
    const { apiKey } = this.settings;
    const model = resolveEmbeddingModel(this.settings);
    const url = resolveEmbeddingUrl(this.settings);
    const body = { model, input: text };
    console.log('[embedding] POST', url, 'BODY', JSON.stringify(body));

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(body),
    });

    const raw = await res.text();
    console.log('[embedding] RESPONSE', res.status, raw.slice(0, 500));
    if (!res.ok) {
      throw new Error(
        `Embedding 请求失败 ${res.status} ${res.statusText}\nurl=${url}\nbody=${JSON.stringify(body)}\nresp=${raw.slice(0, 300)}`
      );
    }

    let data: any = null;
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }
    const vec = isOllama(this.settings.baseUrl) ? data?.embeddings?.[0] : data?.data?.[0]?.embedding;
    if (!Array.isArray(vec) || vec.length === 0) {
      throw new Error(`Embedding 响应缺少向量\nurl=${url}\nresp=${raw.slice(0, 300)}`);
    }
    return vec.map((n: unknown) => Number(n));
  }
}

// ===== 纯函数：相似度 / 检索（可单测） =====

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export interface RetrieveHit {
  noteId: string;
  score: number;
}

export interface RetrieveCandidate {
  noteId: string;
  embedding: number[];
}

/**
 * 语义检索：query 与候选向量算 cosine → 排除自身 → 阈值过滤 → 高度相似去重 → Top-K。
 * 返回按相似度降序、含 evidence（score）。
 */
export function retrieveSimilar(
  query: number[],
  candidates: RetrieveCandidate[],
  opts: { excludeNoteId?: string; topK: number; threshold: number; dedupThreshold?: number }
): RetrieveHit[] {
  const dedupThreshold = opts.dedupThreshold ?? DEDUP_THRESHOLD;
  const rows = candidates
    .filter((c) => c.noteId !== opts.excludeNoteId)
    .map((c) => ({ noteId: c.noteId, embedding: c.embedding, score: cosineSimilarity(query, c.embedding) }))
    .filter((r) => r.score >= opts.threshold)
    .sort((a, b) => b.score - a.score);

  const kept: RetrieveHit[] = [];
  const keptVecs: number[][] = [];
  for (const r of rows) {
    if (keptVecs.some((v) => cosineSimilarity(r.embedding, v) >= dedupThreshold)) continue;
    kept.push({ noteId: r.noteId, score: r.score });
    keptVecs.push(r.embedding);
    if (kept.length >= opts.topK) break;
  }
  return kept;
}

// ===== Pipeline（fire-and-forget，失败不阻塞保存） =====

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

/** 笔记保存后触发：content_hash 未变则跳过，变了/缺失则异步重新生成；异常内部捕获并标 failed */
export async function onEntrySaved(entryId: string): Promise<void> {
  try {
    const settings = await getSettings();
    if (!settings.baseUrl) return; // 未配 AI，保持 pending，等 backfill
    const entry = await getEntry(entryId);
    if (!entry) return;
    const hash = hashString(entry.comment);
    const existing = await getEmbedding(entryId);
    if (existing && existing.status === 'ready' && existing.contentHash === hash) return; // 未变
    const model = resolveEmbeddingModel(settings);
    await markEmbeddingPending(entryId, model);
    const vec = await new OpenAIEmbeddingProvider(settings).embed(entry.comment);
    await upsertEmbedding(entryId, vec, model, hash);
  } catch {
    // embedding 失败绝不影响笔记保存；标 failed 供 backfill 重试
    try {
      const settings = await getSettings();
      if (settings.baseUrl) await markEmbeddingFailed(entryId, resolveEmbeddingModel(settings));
    } catch {
      // ignore
    }
  }
}

/** 笔记删除后：同步删除对应 embedding */
export async function onEntryDeleted(entryId: string): Promise<void> {
  await deleteEmbedding(entryId);
}

/** backfill：给「没有 ready embedding」的历史笔记批量补生成（限流、串行、失败可重试） */
export async function backfillEmbeddings(limit = 20): Promise<void> {
  try {
    const settings = await getSettings();
    if (!settings.baseUrl) return; // 未配 AI 不处理，避免误标 failed
    const ids = await getEntriesMissingEmbedding(limit);
    for (const id of ids) {
      await onEntrySaved(id);
    }
  } catch {
    // 静默：backfill 失败不打断启动
  }
}

// ===== 渐进式 RAG：检索相关历史笔记 =====

/**
 * 给定一个 query 向量，检索最相关的历史笔记（含证据 score）。
 * 供「给定笔记」与「给定任意文本」两条路径共用。
 */
export async function retrieveByVector(
  queryVec: number[],
  opts: { topK?: number; threshold?: number; excludeNoteId?: string } = {}
): Promise<RetrievedNote[]> {
  const topK = opts.topK ?? MAX_RETRIEVED;
  const threshold = opts.threshold ?? MIN_SIMILARITY;
  const all = await getAllReadyEmbeddings();
  const candidates: RetrieveCandidate[] = all
    .filter((e) => e.embedding != null)
    .map((e) => ({ noteId: e.noteId, embedding: e.embedding as number[] }));
  const hits = retrieveSimilar(queryVec, candidates, {
    excludeNoteId: opts.excludeNoteId,
    topK,
    threshold,
  });
  const out: RetrievedNote[] = [];
  for (const h of hits) {
    const entry = await getEntry(h.noteId);
    if (!entry) continue;
    const book = await getBook(entry.bookId);
    out.push({
      noteId: h.noteId,
      score: h.score,
      title: book?.title ?? '未知书',
      comment: truncate(entry.comment, MAX_COMMENT_CHARS),
    });
  }
  return out;
}

/**
 * 给定当前笔记，检索最相关的历史笔记（含证据 score）。
 * 当前笔记无 ready embedding 时尝试现场补生成；仍无则返回 []（调用方据此退化到普通对话）。
 */
export async function retrieveRelatedNotes(
  entryId: string,
  opts: { topK?: number; threshold?: number } = {}
): Promise<RetrievedNote[]> {
  const topK = opts.topK ?? MAX_RETRIEVED;
  const threshold = opts.threshold ?? MIN_SIMILARITY;
  let current = await getEmbedding(entryId);
  if (!current || current.status !== 'ready' || !current.embedding) {
    await onEntrySaved(entryId);
    current = await getEmbedding(entryId);
  }
  if (!current || current.status !== 'ready' || !current.embedding) return [];
  return retrieveByVector(current.embedding, { topK, threshold, excludeNoteId: entryId });
}
