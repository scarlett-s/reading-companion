// Open Library 图书搜索（免费，无需 Key）

export interface BookSearchResult {
  key: string;
  title: string;
  author: string;
  coverUrl?: string;
  publishYear?: number;
  publisher?: string;
  isbn?: string;
  pageCount?: number;
}

interface OLDoc {
  title?: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  publisher?: string[];
  isbn?: string[];
  number_of_pages_median?: number;
}

export async function searchBooks(query: string, limit = 10): Promise<BookSearchResult[]> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`搜索失败：${res.status}`);
  const data = (await res.json()) as { docs?: OLDoc[] };
  return (data.docs ?? [])
    .map((d) => ({
      key: d.cover_i ? `c${d.cover_i}` : `${d.title ?? ''}-${d.author_name?.[0] ?? ''}`,
      title: d.title ?? '',
      author: d.author_name?.[0] ?? '',
      coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : undefined,
      publishYear: d.first_publish_year,
      publisher: d.publisher?.[0],
      isbn: d.isbn?.[0],
      pageCount: d.number_of_pages_median,
    }))
    .filter((r) => r.title.length > 0);
}
