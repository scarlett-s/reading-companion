// 纯工具函数：不依赖 React Native / 网络，便于单测

import { ReadingEntry } from './types';

/** 今天的本地日期，格式 YYYY-MM-DD */
export function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 笔记是否有 AI 对话记录（仅当存在实际对话条目时；菜单项禁用 + 卡片 AI 标记） */
export function entryHasAI(e: ReadingEntry): boolean {
  return !!(e.discussion && e.discussion.length > 0);
}

/** 笔记字数（含对话） */
export function entryCharCount(e: ReadingEntry): number {
  let n = e.comment?.length ?? 0;
  if (e.discussion) for (const t of e.discussion) n += t.text?.length ?? 0;
  return n;
}

/** 阅读进度文案：「读至 xx 页」/「读至 xx%」；无进度返回空串 */
export function formatProgress(e: ReadingEntry): string {
  if (e.progressPercent != null) return `读至 ${round2(e.progressPercent)}%`;
  if (e.currentPage != null) return `读至 ${e.currentPage} 页`;
  return '';
}

export interface TagSegment {
  text: string;
  tag: boolean;
}

export interface QuoteSegment {
  text: string;
  quote: boolean;
}

/**
 * 把正文按配对的中文「」引号切成段落。quote 段含首尾引号（「xxx」），
 * 非 quote 段为普通文本。供卡片把引文应用 italic editorial 样式。
 *
 * 规则：开括号「后到下一个匹配闭括号」之前的全部内容（含两个引号），
 * 作为一段 quote；其余作为普通段。嵌套未做特殊处理，遇见第一个」即闭合。
 * ASCII 双引号 " 也支持，用于英文引文。
 */
export function segmentQuotes(text: string): QuoteSegment[] {
  const re = /「[^」]*」|"[^"]*"/g;
  const segments: QuoteSegment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segments.push({ text: text.slice(last, m.index), quote: false });
    segments.push({ text: m[0], quote: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), quote: false });
  return segments;
}

/**
 * 把正文按 #标签 切成段落：tag 段含 '#'（如 '#哲学'），非 tag 段为普通文本。
 * 规则：# 前有空格（或位于行首）、后跟非空白字符，直到空格/行尾结束。
 * 供卡片把标签内联高亮在正文里。
 */
export function segmentTags(text: string): TagSegment[] {
  const re = /(?:^|\s)(#[^\s#]+)/g;
  const segments: TagSegment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const tag = m[1];
    const tagStart = m.index + (m[0].length - tag.length);
    if (tagStart > last) segments.push({ text: text.slice(last, tagStart), tag: false });
    segments.push({ text: tag, tag: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), tag: false });
  return segments;
}

/** 从正文中识别标签名（不含 '#'，去重，按出现顺序返回） */
export function parseTags(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const seg of segmentTags(text)) {
    if (!seg.tag) continue;
    const name = seg.text.slice(1);
    if (!seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}

/** 时间戳(ms) → 'YYYY-MM-DD HH:MM'（本地时区） */
export function tsToDateTime(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** 四舍五入到 2 位小数（去除浮点尾差，如 12.340000000000001 → 12.34） */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * 将某次阅读记录归一化为 0-100 的进度。
 * 优先用百分比；否则用「当前页 / 总页数」换算；无法确定返回 null。
 */
export function normalizeProgress(opts: {
  currentPage?: number;
  progressPercent?: number;
  pageCount?: number;
}): number | null {
  const { currentPage, progressPercent, pageCount } = opts;
  if (progressPercent != null && !Number.isNaN(progressPercent)) {
    return clamp(progressPercent, 0, 100);
  }
  if (currentPage != null && pageCount != null && pageCount > 0) {
    return clamp((currentPage / pageCount) * 100, 0, 100);
  }
  return null;
}

/**
 * 解析 AI 提炼要点：按行拆分，去掉行首的序号/项目符号，过滤空行。
 * 支持 "1."、"1、"、"1)"、"-"、"•"、"*" 等前缀。
 */
export function parseKeyPoints(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.replace(/^\s*(?:\d+[\.、\)]|[-•*])\s*/, '').trim())
    .filter((s) => s.length > 0);
}

/**
 * 纯函数：根据已有列，生成缺失列的 ALTER TABLE 语句。
 * 用于老库迁移（补 readCount / rating / aiSummary 等新列）。
 */
export function planColumnMigrations(
  table: string,
  existing: string[],
  desired: Record<string, string>
): string[] {
  const have = new Set(existing);
  const out: string[] = [];
  for (const [col, def] of Object.entries(desired)) {
    if (!have.has(col)) out.push(`ALTER TABLE ${table} ADD COLUMN ${col} ${def};`);
  }
  return out;
}

/** 时间戳(ms) → 'YYYY-MM-DD'（本地时区） */
export function tsToDate(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
