import * as SQLite from 'expo-sqlite';
import { Book, ReadingEntry, Reflection, AISettings } from './types';

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

/** 建表（幂等） */
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
      coverUrl TEXT,
      status TEXT NOT NULL DEFAULT 'reading',
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
      discussion TEXT,
      createdAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reflections (
      id TEXT PRIMARY KEY NOT NULL,
      bookId TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
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
       (id, title, author, publisher, publishYear, isbn, pageCount, coverUrl, status, startedAt, finishedAt, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    book.id,
    book.title,
    book.author,
    book.publisher ?? null,
    book.publishYear ?? null,
    book.isbn ?? null,
    book.pageCount ?? null,
    book.coverUrl ?? null,
    book.status ?? 'reading',
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
       (id, bookId, date, currentPage, progressPercent, pagesRead, comment, mode, aiKeyPoints, discussion, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    entry.id,
    entry.bookId,
    entry.date,
    entry.currentPage ?? null,
    entry.progressPercent ?? null,
    entry.pagesRead ?? null,
    entry.comment,
    entry.mode,
    entry.aiKeyPoints ? JSON.stringify(entry.aiKeyPoints) : null,
    entry.discussion ? JSON.stringify(entry.discussion) : null,
    entry.createdAt
  );
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
  mode: 'plain' | 'discuss';
  aiKeyPoints: string | null;
  discussion: string | null;
  createdAt: number;
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
    discussion: row.discussion ? JSON.parse(row.discussion) : undefined,
    createdAt: row.createdAt,
  };
}
