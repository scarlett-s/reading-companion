import { describe, it, expect } from '@jest/globals';
import {
  hashString,
  cosineSimilarity,
  retrieveSimilar,
  resolveEmbeddingModel,
  isOllama,
  resolveEmbeddingUrl,
} from '../src/embedding';
import { AISettings } from '@/types';

describe('hashString', () => {
  it('同输入返回相同哈希', () => {
    expect(hashString('hello')).toBe(hashString('hello'));
  });

  it('不同输入返回不同哈希', () => {
    expect(hashString('hello')).not.toBe(hashString('world'));
  });

  it('返回十六进制字符串', () => {
    expect(hashString('abc')).toMatch(/^[0-9a-f]+$/);
  });

  it('空串也能稳定返回', () => {
    expect(hashString('')).toBe(hashString(''));
  });
});

describe('cosineSimilarity', () => {
  it('相同向量为 1', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it('正交向量为 0', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('相反向量为 -1', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  it('空向量为 0', () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it('长度不一致为 0', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  it('零向量为 0', () => {
    expect(cosineSimilarity([0, 0], [1, 0])).toBe(0);
  });
});

describe('retrieveSimilar', () => {
  const query = [1, 0, 0];

  it('排除自身', () => {
    const hits = retrieveSimilar(
      query,
      [
        { noteId: 'self', embedding: [1, 0, 0] },
        { noteId: 'other', embedding: [0, 1, 0] },
      ],
      { excludeNoteId: 'self', topK: 5, threshold: 0 }
    );
    expect(hits.map((h) => h.noteId)).toEqual(['other']);
  });

  it('按相似度降序 + Top-K 截断', () => {
    const hits = retrieveSimilar(
      query,
      [
        { noteId: 'orthogonal', embedding: [0, 1, 0] }, // 0.0
        { noteId: 'identical', embedding: [1, 0, 0] }, // 1.0
        { noteId: 'diagonal', embedding: [1, 1, 0] }, // ~0.707
      ],
      { topK: 2, threshold: 0 }
    );
    expect(hits.map((h) => h.noteId)).toEqual(['identical', 'diagonal']);
  });

  it('阈值过滤低相关', () => {
    const hits = retrieveSimilar(
      query,
      [
        { noteId: 'high', embedding: [1, 0, 0] }, // 1.0
        { noteId: 'low', embedding: [0, 1, 0] }, // 0.0
      ],
      { topK: 5, threshold: 0.5 }
    );
    expect(hits.map((h) => h.noteId)).toEqual(['high']);
  });

  it('高度相似的候选项被去重（只保留一个）', () => {
    const hits = retrieveSimilar(
      query,
      [
        { noteId: 'x', embedding: [1, 0, 0] }, // 1.0
        { noteId: 'y', embedding: [0.999, 0.04, 0] }, // 与 x 高度相似
        { noteId: 'z', embedding: [0, 1, 0] }, // 0.0，与 x/y 正交
      ],
      { topK: 5, threshold: 0 }
    );
    // x 与 y 高度相似，去重后保留 x（更高分）+ z，丢弃 y
    expect(hits.map((h) => h.noteId)).toEqual(['x', 'z']);
  });

  it('返回 evidence（score）且在 [0,1] 区间', () => {
    const hits = retrieveSimilar(query, [{ noteId: 'a', embedding: [1, 0, 0] }], {
      topK: 5,
      threshold: 0,
    });
    expect(hits[0].score).toBeCloseTo(1);
    expect(hits[0].score).toBeLessThanOrEqual(1);
  });
});

describe('resolveEmbeddingModel', () => {
  const base = (baseUrl: string, embeddingModel = ''): AISettings => ({
    baseUrl,
    apiKey: '',
    model: '',
    embeddingModel,
  });

  it('显式设置优先', () => {
    expect(resolveEmbeddingModel(base('https://api.openai.com', 'my-model'))).toBe('my-model');
  });

  it('Ollama（11434）默认 nomic-embed-text', () => {
    expect(resolveEmbeddingModel(base('http://localhost:11434/v1'))).toBe('nomic-embed-text');
  });

  it('其它默认 text-embedding-3-small', () => {
    expect(resolveEmbeddingModel(base('https://api.openai.com'))).toBe('text-embedding-3-small');
  });
});

describe('resolveEmbeddingUrl / isOllama', () => {
  const s = (baseUrl: string): AISettings => ({ baseUrl, apiKey: '', model: '', embeddingModel: '' });

  it('Ollama 走原生 /api/embed（忽略 /v1 前缀）', () => {
    expect(resolveEmbeddingUrl(s('http://localhost:11434/v1'))).toBe('http://localhost:11434/api/embed');
    expect(resolveEmbeddingUrl(s('http://192.168.1.5:11434'))).toBe('http://192.168.1.5:11434/api/embed');
  });

  it('OpenAI 走 /embeddings', () => {
    expect(resolveEmbeddingUrl(s('https://api.openai.com/v1'))).toBe('https://api.openai.com/v1/embeddings');
  });

  it('isOllama 识别 11434 端口', () => {
    expect(isOllama('http://localhost:11434/v1')).toBe(true);
    expect(isOllama('http://localhost:11434')).toBe(true);
    expect(isOllama('https://api.openai.com/v1')).toBe(false);
  });
});
