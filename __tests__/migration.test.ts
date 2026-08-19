import { describe, it, expect } from '@jest/globals';
import { planColumnMigrations } from '@/utils';

describe('planColumnMigrations', () => {
  it('生成缺失列的 ALTER TABLE 语句', () => {
    const out = planColumnMigrations('books', ['id', 'title', 'status'], {
      readCount: 'INTEGER NOT NULL DEFAULT 0',
      rating: 'INTEGER',
    });
    expect(out).toEqual([
      'ALTER TABLE books ADD COLUMN readCount INTEGER NOT NULL DEFAULT 0;',
      'ALTER TABLE books ADD COLUMN rating INTEGER;',
    ]);
  });

  it('已存在的列不重复生成', () => {
    const out = planColumnMigrations('entries', ['aiSummary', 'discussion'], {
      aiSummary: 'TEXT',
    });
    expect(out).toEqual([]);
  });

  it('空 desired 不产出任何语句', () => {
    expect(planColumnMigrations('books', ['id'], {})).toEqual([]);
  });
});
