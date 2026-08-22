import * as SQLite from 'expo-sqlite';
import { Book, ReadingEntry, Reflection, AISettings, DiscussionTurn, CommentMode, LinkedEntry } from './types';
import { planColumnMigrations } from './utils';

type DB = Awaited<ReturnType<typeof SQLite.openDatabaseAsync>>;

let dbPromise: Promise<DB> | null = null;

function getDb(): Promise<DB> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('reading_companion.db');
  }
  return dbPromise;
}

/** 生成本地唯一 id（时间戳 + 随机） */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** 建表（幂等）+ 轻量迁移（老库补新列） */
export async function initDatabase(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      publisher TEXT,
      publishYear INTEGER,
      isbn TEXT,
      pageCount INTEGER,
      translator TEXT,
      coverUrl TEXT,
      status TEXT NOT NULL DEFAULT 'reading',
      readCount INTEGER NOT NULL DEFAULT 0,
      rating INTEGER,
      startedAt INTEGER,
      finishedAt INTEGER,
      createdAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY NOT NULL,
      bookId TEXT NOT NULL,
      date TEXT NOT NULL,
      currentPage INTEGER,
      progressPercent REAL,
      pagesRead INTEGER,
      comment TEXT NOT NULL,
      mode TEXT NOT NULL,
      aiKeyPoints TEXT,
      aiSummary TEXT,
      discussion TEXT,
      createdAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reflections (
      id TEXT PRIMARY KEY NOT NULL,
      bookId TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS links (
      id TEXT PRIMARY KEY NOT NULL,
      fromEntryId TEXT NOT NULL,
      toEntryId TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      UNIQUE(fromEntryId, toEntryId)
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  // 迁移：老库可能缺 readCount / rating / aiSummary 列
  const bookCols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(books);');
  for (const stmt of planColumnMigrations('books', bookCols.map((c) => c.name), {
    readCount: 'INTEGER NOT NULL DEFAULT 0',
    rating: 'INTEGER',
    translator: 'TEXT',
  })) {
    await db.execAsync(stmt);
  }
  const entryCols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(entries);');
  for (const stmt of planColumnMigrations('entries', entryCols.map((c) => c.name), {
    aiSummary: 'TEXT',
  })) {
    await db.execAsync(stmt);
  }
}

// ===== 图书 =====

export async function getAllBooks(): Promise<Book[]> {
  const db = await getDb();
  return db.getAllAsync<Book>('SELECT * FROM books ORDER BY createdAt DESC;');
}

export async function getBook(id: string): Promise<Book | null> {
  const db = await getDb();
  return db.getFirstAsync<Book>('SELECT * FROM books WHERE id = ?;', id);
}

export async function addBook(book: Book): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO books
       (id, title, author, publisher, publishYear, isbn, pageCount, translator, coverUrl, status, readCount, rating, startedAt, finishedAt, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    book.id,
    book.title,
    book.author,
    book.publisher ?? null,
    book.publishYear ?? null,
    book.isbn ?? null,
    book.pageCount ?? null,
    book.translator ?? null,
    book.coverUrl ?? null,
    book.status ?? 'reading',
    book.readCount ?? 0,
    book.rating ?? null,
    book.startedAt ?? null,
    book.finishedAt ?? null,
    book.createdAt
  );
}

export async function deleteBook(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM entries WHERE bookId = ?;', id);
  await db.runAsync('DELETE FROM reflections WHERE bookId = ?;', id);
  await db.runAsync('DELETE FROM books WHERE id = ?;', id);
}

export async function updateBookStatus(
  id: string,
  status: Book['status'],
  finishedAt?: number
): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE books SET status = ?, finishedAt = ? WHERE id = ?;', status, finishedAt ?? null, id);
}

/** 标记读完：status→finished、finishedAt、readCount++（一遍读完） */
export async function markFinished(bookId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE books SET status = 'finished', finishedAt = ?, readCount = readCount + 1 WHERE id = ?;",
    Date.now(),
    bookId
  );
}

/** 设置/更新 5 星评级（0–5） */
export async function setBookRating(bookId: string, rating: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE books SET rating = ? WHERE id = ?;', rating, bookId);
}

/** 最近读过的书（有阅读记录），按最近记录时间降序，取前 limit 本 */
export async function getRecentBooks(limit: number): Promise<Book[]> {
  const db = await getDb();
  return db.getAllAsync<Book>(
    `SELECT b.*,
       (SELECT MAX(e.createdAt) FROM entries e WHERE e.bookId = b.id) AS lastEntryAt
     FROM books b
     WHERE EXISTS (SELECT 1 FROM entries e WHERE e.bookId = b.id)
     ORDER BY lastEntryAt DESC
     LIMIT ?;`,
    limit
  );
}

// ===== 阅读记录 =====

export async function addEntry(entry: ReadingEntry): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO entries
       (id, bookId, date, currentPage, progressPercent, pagesRead, comment, mode, aiKeyPoints, aiSummary, discussion, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    entry.id,
    entry.bookId,
    entry.date,
    entry.currentPage ?? null,
    entry.progressPercent ?? null,
    entry.pagesRead ?? null,
    entry.comment,
    entry.mode,
    entry.aiKeyPoints ? JSON.stringify(entry.aiKeyPoints) : null,
    entry.aiSummary ?? null,
    entry.discussion ? JSON.stringify(entry.discussion) : null,
    entry.createdAt
  );

  // 读完后再记录 → 自动进入下一遍（回翻 status 到 reading）
  await db.runAsync("UPDATE books SET status = 'reading' WHERE id = ? AND status = 'finished';", entry.bookId);
}

export async function getEntriesByBook(bookId: string): Promise<ReadingEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ReadingEntryRow>(
    'SELECT * FROM entries WHERE bookId = ? ORDER BY date ASC, createdAt ASC;',
    bookId
  );
  return rows.map(parseEntry);
}

export async function getEntriesByDate(date: string): Promise<ReadingEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ReadingEntryRow>(
    'SELECT * FROM entries WHERE date = ? ORDER BY createdAt ASC;',
    date
  );
  return rows.map(parseEntry);
}

export async function getEntriesByMonth(yearMonth: string): Promise<ReadingEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ReadingEntryRow>(
    'SELECT * FROM entries WHERE date LIKE ? ORDER BY date ASC;',
    `${yearMonth}%`
  );
  return rows.map(parseEntry);
}

/** 按日期范围（含两端，YYYY-MM-DD 字典序 = 时间序）取记录 */
export async function getEntriesByDateRange(start: string, end: string): Promise<ReadingEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ReadingEntryRow>(
    'SELECT * FROM entries WHERE date >= ? AND date <= ? ORDER BY date ASC, createdAt ASC;',
    start,
    end
  );
  return rows.map(parseEntry);
}

/** 一本书的笔记条数（判断是否 >5，触发洞察报告） */
export async function countEntriesByBook(bookId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM entries WHERE bookId = ?;', bookId);
  return row?.c ?? 0;
}

/** 苏格拉底对话结束后写回：对话记录 + AI 总结 */
export async function updateEntryDiscussion(
  entryId: string,
  discussion: DiscussionTurn[],
  aiSummary: string
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE entries SET discussion = ?, aiSummary = ? WHERE id = ?;',
    JSON.stringify(discussion),
    aiSummary,
    entryId
  );
}

// ===== 整理 =====

export async function addReflection(reflection: Reflection): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO reflections (id, bookId, content, createdAt) VALUES (?, ?, ?, ?);',
    reflection.id,
    reflection.bookId,
    reflection.content,
    reflection.createdAt
  );
}

export async function getReflections(bookId: string): Promise<Reflection[]> {
  const db = await getDb();
  return db.getAllAsync<Reflection>(
    'SELECT * FROM reflections WHERE bookId = ? ORDER BY createdAt DESC;',
    bookId
  );
}

// ===== 设置 =====

export async function getSettings(): Promise<AISettings> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT * FROM settings;');
  const settings: Record<string, string> = {};
  for (const row of rows) settings[row.key] = row.value;
  return {
    baseUrl: settings.baseUrl ?? '',
    apiKey: settings.apiKey ?? '',
    model: settings.model ?? '',
  };
}

export async function saveSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);', key, value);
}

// ===== 内部 =====

interface ReadingEntryRow {
  id: string;
  bookId: string;
  date: string;
  currentPage: number | null;
  progressPercent: number | null;
  pagesRead: number | null;
  comment: string;
  mode: CommentMode;
  aiKeyPoints: string | null;
  aiSummary: string | null;
  discussion: string | null;
  createdAt: number;
}

interface LinkedEntryRow extends ReadingEntryRow {
  bookTitle: string;
}

function parseEntry(row: ReadingEntryRow): ReadingEntry {
  return {
    id: row.id,
    bookId: row.bookId,
    date: row.date,
    currentPage: row.currentPage ?? undefined,
    progressPercent: row.progressPercent ?? undefined,
    pagesRead: row.pagesRead ?? undefined,
    comment: row.comment,
    mode: row.mode,
    aiKeyPoints: row.aiKeyPoints ? JSON.parse(row.aiKeyPoints) : undefined,
    aiSummary: row.aiSummary ?? undefined,
    discussion: row.discussion ? JSON.parse(row.discussion) : undefined,
    createdAt: row.createdAt,
  };
}

/** 全部笔记，按日期 + 创建时间倒序（首页瀑布流用） */
export async function getAllEntries(): Promise<ReadingEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ReadingEntryRow>(
    'SELECT * FROM entries ORDER BY date DESC, createdAt DESC;'
  );
  return rows.map(parseEntry);
}

/** 按 id 取单条笔记 */
export async function getEntry(id: string): Promise<ReadingEntry | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ReadingEntryRow>('SELECT * FROM entries WHERE id = ?;', id);
  return row ? parseEntry(row) : null;
}

/** 编辑笔记：更新书名 / 日期 / 页数 / 百分比 / 正文 */
export async function updateEntry(
  id: string,
  fields: {
    bookId: string;
    date: string;
    currentPage?: number;
    progressPercent?: number;
    comment: string;
  }
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE entries SET bookId = ?, date = ?, currentPage = ?, progressPercent = ?, comment = ? WHERE id = ?;',
    fields.bookId,
    fields.date,
    fields.currentPage ?? null,
    fields.progressPercent ?? null,
    fields.comment,
    id
  );
}

/** 删除笔记，并删除它作为源或目标的所有链接 */
export async function deleteEntry(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM links WHERE fromEntryId = ? OR toEntryId = ?;', id, id);
  await db.runAsync('DELETE FROM entries WHERE id = ?;', id);
}

// ===== 笔记链接（双链） =====

/** 建立一条笔记链接（from → to）；已存在则忽略 */
export async function addLink(fromEntryId: string, toEntryId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR IGNORE INTO links (id, fromEntryId, toEntryId, createdAt) VALUES (?, ?, ?, ?);',
    generateId(),
    fromEntryId,
    toEntryId,
    Date.now()
  );
}

/** 移除一条笔记链接 */
export async function removeLink(fromEntryId: string, toEntryId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM links WHERE fromEntryId = ? AND toEntryId = ?;', fromEntryId, toEntryId);
}

/** 出链：当前笔记关联到的其它笔记 */
export async function getLinksForEntry(entryId: string): Promise<LinkedEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<LinkedEntryRow>(
    `SELECT e.*, b.title AS bookTitle
     FROM links l
     JOIN entries e ON e.id = l.toEntryId
     JOIN books b ON b.id = e.bookId
     WHERE l.fromEntryId = ?
     ORDER BY e.date DESC, e.createdAt DESC;`,
    entryId
  );
  return rows.map((r) => ({ ...parseEntry(r), bookTitle: r.bookTitle }));
}

/** 入链（反向链接）：哪些笔记关联到了当前笔记 */
export async function getBacklinksForEntry(entryId: string): Promise<LinkedEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<LinkedEntryRow>(
    `SELECT e.*, b.title AS bookTitle
     FROM links l
     JOIN entries e ON e.id = l.fromEntryId
     JOIN books b ON b.id = e.bookId
     WHERE l.toEntryId = ?
     ORDER BY e.date DESC, e.createdAt DESC;`,
    entryId
  );
  return rows.map((r) => ({ ...parseEntry(r), bookTitle: r.bookTitle }));
}
