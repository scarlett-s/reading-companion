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

/** dayNumber → 'YYYY-MM-DD'（UTC） */
export function dayToDate(day: number): string {
  const d = new Date(day * 86400000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dayStr = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dayStr}`;
}

export interface HeatCell {
  date: string;
  count: number;
}

/** 生成热力图格子：以「周」为列（周一开头），每周 7 格 */
export function heatmapCells(
  data: Record<string, number>,
  weeks: number,
  endDate: string
): HeatCell[][] {
  const endDay = toDayNumber(endDate);
  const total = weeks * 7;
  const endWeekday = (new Date(endDay * 86400000).getUTCDay() + 6) % 7; // 0=周一
  const endSunday = endDay + (6 - endWeekday); // 向上取整到周日
  const alignedStart = endSunday - total + 1;
  const cols: HeatCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const day = alignedStart + w * 7 + d;
      const date = dayToDate(day);
      col.push({ date, count: data[date] ?? 0 });
    }
    cols.push(col);
  }
  return cols;
}

export type PeriodKey = 'week' | 'month' | 'year';

/** 计算周期（周/月/年）的起止日期，包含 today */
export function periodRange(period: PeriodKey, today: string): { start: string; end: string } {
  const [y, m] = today.split('-').map(Number);
  if (period === 'year') {
    return { start: `${y}-01-01`, end: `${y}-12-31` };
  }
  if (period === 'month') {
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const mm = String(m).padStart(2, '0');
    return { start: `${y}-${mm}-01`, end: `${y}-${mm}-${String(last).padStart(2, '0')}` };
  }
  const todayDay = toDayNumber(today);
  const weekday = (new Date(todayDay * 86400000).getUTCDay() + 6) % 7; // 0=周一
  const monday = todayDay - weekday;
  return { start: dayToDate(monday), end: dayToDate(monday + 6) };
}
