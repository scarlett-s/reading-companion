// 全局类型定义（唯一事实来源，见 SPEC §6）

export interface Book {
  id: string;
  title: string;
  author: string;
  publisher?: string;
  publishYear?: number;
  isbn?: string;
  pageCount?: number;
  translator?: string;
  coverUrl?: string;
  status: 'reading' | 'finished';
  readCount: number; // 已读完遍数，默认 0；「正在读第 x 遍」= readCount + 1
  rating?: number; // 0–5，未评 undefined
  startedAt?: number;
  finishedAt?: number;
  createdAt: number;
}

export type CommentMode = 'plain' | 'chat' | 'discuss'; // 'discuss' 为旧数据兼容

export interface DiscussionTurn {
  role: 'assistant' | 'user';
  text: string;
}

export interface ReadingEntry {
  id: string;
  bookId: string;
  date: string; // YYYY-MM-DD
  currentPage?: number; // 读到第几页（纸质书）
  progressPercent?: number; // 百分比（Kindle）
  pagesRead?: number; // 本次读了多少页
  comment: string;
  mode: CommentMode;
  aiKeyPoints?: string[]; // 旧「提炼要点」，将被 aiSummary 取代
  aiSummary?: string; // 苏格拉底对话结束时 AI 给的总结
  discussion?: DiscussionTurn[]; // 对话记录
  createdAt: number;
}

export interface Reflection {
  id: string;
  bookId: string;
  content: string;
  createdAt: number;
}

/** 图书搜索结果（豆瓣 / Open Library 统一结构） */
export interface BookSearchResult {
  key: string;
  title: string;
  author: string;
  coverUrl?: string;
  publishYear?: number;
  publisher?: string;
  isbn?: string;
  pageCount?: number;
  translator?: string;
}

/** 一条被链接的笔记（含书名，用于双链展示） */
export interface LinkedEntry extends ReadingEntry {
  bookTitle: string;
}

// AI 配置（OpenAI 兼容：DeepSeek / Ollama / OpenAI 共用一条通路）
export interface AISettings {
  baseUrl: string; // 如 https://api.deepseek.com 或 http://localhost:11434
  apiKey: string; // Ollama 可为空
  model: string; // 如 deepseek-chat / llama3
}
