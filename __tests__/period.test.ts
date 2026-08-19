import { describe, it, expect } from '@jest/globals';
import { tsToDate } from '@/utils';
import { periodRange } from '@/stats';

describe('tsToDate', () => {
  it('时间戳转本地日期', () => {
    expect(tsToDate(new Date(2026, 0, 15).getTime())).toBe('2026-01-15');
  });
});

describe('periodRange', () => {
  it('周：周一到周日', () => {
    expect(periodRange('week', '2026-01-31')).toEqual({ start: '2026-01-26', end: '2026-02-01' });
  });
  it('月：1 号到月末', () => {
    expect(periodRange('month', '2026-02-15')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
  });
  it('年：1 月 1 日到 12 月 31 日', () => {
    expect(periodRange('year', '2026-06-01')).toEqual({ start: '2026-01-01', end: '2026-12-31' });
  });
});
