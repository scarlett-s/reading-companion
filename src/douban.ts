// 豆瓣读书搜索（中文优先源，无需 Key；走公开 subject_suggest + 详情页 HTML 解析）

import { BookSearchResult } from './types';

interface DoubanDoc {
  id?: string;
  title?: string;
  author_name?: string;
  pic?: string;
  year?: string;
  url?: string;
}

/** 纯映射：豆瓣 subject_suggest 返回 → 统一 BookSearchResult（封面 /s/ → /l/ 取大图） */
export function mapDoubanResult(d: DoubanDoc): BookSearchResult {
  const coverUrl = d.pic ? d.pic.replace('/s/', '/l/') : undefined;
  const year = d.year ? Number(d.year) : undefined;
  return {
    key: d.id ?? `${d.title ?? ''}-${d.author_name ?? ''}`,
    title: d.title ?? '',
    author: d.author_name ?? '',
    coverUrl,
    publishYear: Number.isFinite(year) ? year : undefined,
  };
}

export async function searchBooks(query: string, limit = 10): Promise<BookSearchResult[]> {
  const url = `https://book.douban.com/j/subject_suggest?q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`搜索失败：${res.status}`);
  const data = (await res.json()) as DoubanDoc[];
  return (Array.isArray(data) ? data : [])
    .map(mapDoubanResult)
    .filter((r) => r.title.length > 0)
    .slice(0, limit);
}

/** 解析详情页 HTML，提取缺失字段；已存在字段保留（部分成功也可填） */
export function parseDoubanDetailHtml(html: string): {
  publisher?: string;
  translator?: string;
  pageCount?: number;
  publishYear?: number;
} {
  // 截取 #info 块
  const infoMatch = html.match(/<div\s+id="info"[^>]*>([\s\S]*?)<\/div>/);
  if (!infoMatch) return {};
  const info = infoMatch[1];

  const labelMap: Record<string, string> = {
    作者: 'author',
    译者: 'translator',
    出版社: 'publisher',
    '出版年': 'publishYearRaw',
    ISBN: 'isbn',
    页数: 'pageCount',
  };

  const out: Record<string, string> = {};
  // 每个 <span class="pl">XXX</span> 后到 <br/> 或下一个 <span class="pl"> 之间的文本
  const re = /<span\s+class="pl"\s*>\s*([^<]+?)\s*<\/span>([\s\S]*?)(?=<span\s+class="pl"|<br\s*\/?>\s*<br|<br\s*\/>|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(info))) {
    const label = m[1].replace(/[:：]\s*$/, '').trim();
    const raw = m[2];
    if (!(label in labelMap)) continue;
    // 去掉 HTML 标签 + 注释，保留纯文本（多个翻译者用「、」连接）
    // 去掉紧跟标签后的「:」或全角「：」开头的标点
    let text = raw
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    text = text.replace(/^[:：]\s*/, '');
    if (!text) continue;
    out[labelMap[label]] = text;
  }

  const result: {
    publisher?: string;
    translator?: string;
    pageCount?: number;
    publishYear?: number;
  } = {};
  if (out.publisher) result.publisher = out.publisher;
  if (out.translator) result.translator = out.translator;
  if (out.pageCount) {
    const n = Number(out.pageCount);
    if (Number.isFinite(n)) result.pageCount = n;
  }
  if (out.publishYearRaw) {
    const m2 = out.publishYearRaw.match(/(\d{4})/);
    if (m2) {
      const n = Number(m2[1]);
      if (Number.isFinite(n)) result.publishYear = n;
    }
  }
  return result;
}

/** 详情页 fetch：合并已有字段（缺啥补啥）；失败时返回原 result */
export async function fetchDoubanDetail(id: string, base: BookSearchResult): Promise<BookSearchResult> {
  if (!id) return base;
  try {
    const res = await fetch(`https://book.douban.com/subject/${id}/`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return base;
    const html = await res.text();
    const parsed = parseDoubanDetailHtml(html);
    return {
      ...base,
      publisher: base.publisher ?? parsed.publisher,
      translator: parsed.translator ?? base.translator,
      pageCount: base.pageCount ?? parsed.pageCount,
      publishYear: base.publishYear ?? parsed.publishYear,
    };
  } catch {
    return base;
  }
}