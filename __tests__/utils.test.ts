import { describe, it, expect } from '@jest/globals';
import { todayString, normalizeProgress, parseKeyPoints, round2, entryHasAI } from '../src/utils';

describe('todayString', () => {
  it('返回 YYYY-MM-DD 格式', () => {
    expect(todayString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('normalizeProgress', () => {
  it('优先用百分比并限制在 0-100', () => {
    expect(normalizeProgress({ progressPercent: 40 })).toBe(40);
    expect(normalizeProgress({ progressPercent: 150 })).toBe(100);
    expect(normalizeProgress({ progressPercent: -5 })).toBe(0);
  });

  it('用当前页/总页数换算', () => {
    expect(normalizeProgress({ currentPage: 60, pageCount: 200 })).toBe(30);
  });

  it('百分比优先于页数', () => {
    expect(normalizeProgress({ currentPage: 60, pageCount: 200, progressPercent: 40 })).toBe(40);
  });

  it('无法确定时返回 null', () => {
    expect(normalizeProgress({})).toBeNull();
    expect(normalizeProgress({ currentPage: 60 })).toBeNull();
    expect(normalizeProgress({ pageCount: 200 })).toBeNull();
  });
});

describe('parseKeyPoints', () => {
  it('解析编号列表', () => {
    const text = '1. 第一点\n2. 第二点\n3. 第三点';
    expect(parseKeyPoints(text)).toEqual(['第一点', '第二点', '第三点']);
  });

  it('解析项目符号并过滤空行', () => {
    const text = '- 甲\n\n• 乙\n* 丙\n\n';
    expect(parseKeyPoints(text)).toEqual(['甲', '乙', '丙']);
  });

  it('兼容中文顿号与括号编号', () => {
    const text = '1、要点A\n2) 要点B';
    expect(parseKeyPoints(text)).toEqual(['要点A', '要点B']);
  });
});

describe('round2', () => {
  it('四舍五入到 2 位小数', () => {
    expect(round2(12.3456789)).toBe(12.35);
    expect(round2(3.14159)).toBe(3.14);
    expect(round2(-2.678)).toBe(-2.68);
    expect(round2(0)).toBe(0);
    expect(round2(5)).toBe(5);
  });
});

describe('entryHasAI', () => {
  it('仅 mode=chat 但无对话 → false', () => {
    expect(entryHasAI({ id: '1', bookId: 'b', date: '2026-01-01', comment: 'c', mode: 'chat', createdAt: 0 })).toBe(false);
  });
  it('discussion 有内容 → true', () => {
    expect(
      entryHasAI({
        id: '1',
        bookId: 'b',
        date: '2026-01-01',
        comment: 'c',
        mode: 'plain',
        discussion: [{ role: 'assistant', text: 'a' }],
        createdAt: 0,
      })
      ).toBe(true);
  });
  it('discussion 为空数组 → false', () => {
    expect(
      entryHasAI({
        id: '1',
        bookId: 'b',
        date: '2026-01-01',
        comment: 'c',
        mode: 'chat',
        discussion: [],
        createdAt: 0,
      })
      ).toBe(false);
  });
});
