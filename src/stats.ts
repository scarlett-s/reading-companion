import { ReadingEntry } from './types';
import { normalizeProgress } from './utils';

/** 'YYYY-MM-DD' → 自 Unix 纪元起的天数（按 UTC，避免时区/夏令时误差） */
function toDayNumber(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/** 实际读书天数：去重日期数 */
export function daysWithEntries(entries: ReadingEntry[]): number {
  return new Set(entries.map((e) => e.date)).size;
}

/** 阅读周期：首末记录日期（含两端）之间的天数；无记录返回 0 */
export function readingSpanDays(entries: ReadingEntry[]): number {
  if (entries.length === 0) return 0;
  const days = entries.map((e) => toDayNumber(e.date));
  return Math.max(...days) - Math.min(...days) + 1;
}

/** 距今天数：todayStr - dateStr（可为负） */
export function daysSince(dateStr: string, todayStr: string): number {
  return toDayNumber(todayStr) - toDayNumber(dateStr);
}

/** 单条记录归一化为 0-100 百分比；无法确定返回 null */
export function entryProgress(entry: ReadingEntry, pageCount?: number): number | null {
  return normalizeProgress({
    currentPage: entry.currentPage,
    progressPercent: entry.progressPercent,
    pageCount,
  });
}

/**
 * 周期进度增量 = 末进度 − 初基线。
 * 初基线取「周期开始前最近一条记录」的进度，无则按 0；
 * 末进度取「周期内（含两端）最后一条记录」的进度。
 * 返回百分比增量（可为负，表示进度回退）。
 */
export function periodDelta(
  entries: ReadingEntry[],
  periodStart: string,
  periodEnd: string,
  pageCount?: number
): number {
  if (entries.length === 0) return 0;
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const before = sorted.filter((e) => e.date < periodStart);
  const base = before.length > 0 ? entryProgress(before[before.length - 1], pageCount) ?? 0 : 0;

  const within = sorted.filter((e) => e.date >= periodStart && e.date <= periodEnd);
  const end = within.length > 0 ? entryProgress(within[within.length - 1], pageCount) ?? 0 : base;

  return end - base;
}
