import { describe, it, expect } from '@jest/globals';
import { daysWithEntries, readingSpanDays, daysSince, entryProgress, periodDelta } from '@/stats';
import { ReadingEntry } from '@/types';

function entry(date: string, opts?: { progressPercent?: number; currentPage?: number }): ReadingEntry {
  return {
    id: date,
    bookId: 'b1',
    date,
    currentPage: opts?.currentPage,
    progressPercent: opts?.progressPercent,
    comment: 'x',
    mode: 'plain',
    createdAt: 0,
  };
}

describe('daysWithEntries', () => {
  it('去重日期数 = 实际读书天数', () => {
    expect(
      daysWithEntries([entry('2026-01-01'), entry('2026-01-01'), entry('2026-01-02')])
    ).toBe(2);
  });
  it('空记录为 0', () => {
    expect(daysWithEntries([])).toBe(0);
  });
});

describe('readingSpanDays', () => {
  it('1 月 1 日读到 2 月 15 日 = 46 天（含两端）', () => {
    expect(readingSpanDays([entry('2026-01-01'), entry('2026-02-15')])).toBe(46);
  });
  it('单条记录为 1 天', () => {
    expect(readingSpanDays([entry('2026-03-03')])).toBe(1);
  });
  it('空记录为 0', () => {
    expect(readingSpanDays([])).toBe(0);
  });
});

describe('daysSince', () => {
  it('计算天数差', () => {
    expect(daysSince('2026-01-01', '2026-01-04')).toBe(3);
  });
  it('未来日期为负', () => {
    expect(daysSince('2026-01-04', '2026-01-01')).toBe(-3);
  });
});

describe('entryProgress', () => {
  it('百分比直接用', () => {
    expect(entryProgress(entry('2026-01-01', { progressPercent: 40 }))).toBe(40);
  });
  it('页数换算百分比', () => {
    expect(entryProgress(entry('2026-01-01', { currentPage: 150 }), 300)).toBe(50);
  });
  it('无法确定返回 null', () => {
    expect(entryProgress(entry('2026-01-01'))).toBeNull();
  });
});

describe('periodDelta', () => {
  const period = ['2026-02-01', '2026-02-28'];

  it('有周期前基线：20% → 40% = +20', () => {
    const entries = [
      entry('2026-01-01', { progressPercent: 20 }),
      entry('2026-02-10', { progressPercent: 40 }),
    ];
    expect(periodDelta(entries, period[0], period[1])).toBe(20);
  });

  it('无基线：0 → 30% = +30', () => {
    const entries = [entry('2026-02-10', { progressPercent: 30 })];
    expect(periodDelta(entries, period[0], period[1])).toBe(30);
  });

  it('页数换算：0 → 150/300 = +50', () => {
    const entries = [entry('2026-02-10', { currentPage: 150 })];
    expect(periodDelta(entries, period[0], period[1], 300)).toBe(50);
  });

  it('空记录为 0', () => {
    expect(periodDelta([], period[0], period[1])).toBe(0);
  });

  it('进度回退为负', () => {
    const entries = [
      entry('2026-01-01', { progressPercent: 60 }),
      entry('2026-02-10', { progressPercent: 30 }),
    ];
    expect(periodDelta(entries, period[0], period[1])).toBe(-30);
  });
});
