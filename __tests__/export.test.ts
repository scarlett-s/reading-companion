import { describe, it, expect } from '@jest/globals';
import { bookToMarkdown, markdownToPlainText, markdownToHtml } from '@/export';
import { Book, ReadingEntry } from '@/types';

const book: Book = {
  id: 'b1',
  title: '三体',
  author: '刘慈欣',
  status: 'reading',
  readCount: 0,
  createdAt: 0,
};

const entry: ReadingEntry = {
  id: 'e1',
  bookId: 'b1',
  date: '2026-01-15',
  progressPercent: 30,
  comment: '很好看',
  mode: 'chat',
  aiSummary: '对文明的思考',
  discussion: [
    { role: 'assistant', text: '为什么震撼？' },
    { role: 'user', text: '格局大' },
  ],
  createdAt: 0,
};

describe('bookToMarkdown', () => {
  it('含书名/作者/进度/对话/总结', () => {
    const md = bookToMarkdown(book, [entry]);
    expect(md).toContain('# 《三体》');
    expect(md).toContain('作者：刘慈欣');
    expect(md).toContain('### 2026-01-15（30%）');
    expect(md).toContain('很好看');
    expect(md).toContain('问：为什么震撼？');
    expect(md).toContain('总结：对文明的思考');
  });
});

describe('markdownToPlainText', () => {
  it('去掉标题/列表标记', () => {
    expect(markdownToPlainText('# 标题\n\n- 项目\n\n正文')).toBe('标题\n\n项目\n\n正文');
  });
});

describe('markdownToHtml', () => {
  it('标题转 h1，段落转 p，转义特殊字符', () => {
    const html = markdownToHtml('# 你好\n\n<测试>');
    expect(html).toContain('<h1>你好</h1>');
    expect(html).toContain('<p>&lt;测试&gt;</p>');
  });
});
