import { Book, ReadingEntry } from './types';

function formatProgress(e: ReadingEntry): string {
  if (e.progressPercent != null) return `${e.progressPercent}%`;
  if (e.currentPage != null) return `第 ${e.currentPage} 页`;
  return '';
}

/** 一本书的笔记 → Markdown
 *  includeAi=false 时不写对话/总结，只保留正文与进度。 */
export function bookToMarkdown(book: Book, entries: ReadingEntry[], opts: { includeAi?: boolean } = {}): string {
  const includeAi = opts.includeAi !== false;
  const lines: string[] = [];
  lines.push(`# 《${book.title}》`);
  lines.push('');
  if (book.author) lines.push(`作者：${book.author}`);
  if (book.publisher) lines.push(`出版社：${book.publisher}`);
  lines.push('');
  lines.push(`## 笔记（${entries.length}）`);
  lines.push('');
  for (const e of entries) {
    const prog = formatProgress(e);
    lines.push(`### ${e.date}${prog ? `（${prog}）` : ''}`);
    lines.push('');
    lines.push(e.comment);
    if (includeAi) {
      if (e.discussion && e.discussion.length > 0) {
        lines.push('');
        lines.push('对话：');
        for (const t of e.discussion) {
          lines.push(`- ${t.role === 'assistant' ? '问' : '答'}：${t.text}`);
        }
      }
      if (e.aiSummary) {
        lines.push('');
        lines.push(`总结：${e.aiSummary}`);
      }
    }
    lines.push('');
  }
  return lines.join('\n').trim() + '\n';
}

/** 多本书 → Markdown（全部导出） */
export function allBooksToMarkdown(books: Book[], entriesByBook: Record<string, ReadingEntry[]>): string {
  return books
    .map((b) => bookToMarkdown(b, entriesByBook[b.id] ?? []))
    .join('\n---\n\n');
}

/** Markdown → 纯文本（去标题/加粗/列表标记） */
export function markdownToPlainText(md: string): string {
  return md
    .split('\n')
    .map((line) => line.replace(/^#{1,6}\s+/, '').replace(/\*\*/g, '').replace(/^- /, ''))
    .join('\n');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Markdown → HTML（简单模板） */
export function markdownToHtml(md: string): string {
  const out: string[] = [
    '<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8"><title>读书笔记</title></head><body>',
  ];
  for (const line of md.split('\n')) {
    if (/^### /.test(line)) out.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
    else if (/^## /.test(line)) out.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
    else if (/^# /.test(line)) out.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
    else if (/^- /.test(line)) out.push(`<li>${escapeHtml(line.slice(2))}</li>`);
    else if (line.trim() === '') out.push('<br>');
    else out.push(`<p>${escapeHtml(line)}</p>`);
  }
  out.push('</body></html>');
  return out.join('\n');
}
