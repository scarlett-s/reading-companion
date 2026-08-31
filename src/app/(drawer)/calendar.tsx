import { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Modal, Dimensions } from 'react-native';
import { Image, type ImageSource } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { getEntriesByMonth, getAllBooks, getAllEntries } from '@/db';
import { shareText } from '@/share';
import { openDrawer } from '@/drawerControl';
import { Book, ReadingEntry } from '@/types';
import { formatProgress, tsToDate } from '@/utils';
import { entryProgress } from '@/stats';

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// 日历格子尺寸：横屏等比换算、严格 7 列、aspectRatio 3:4（宽:高 = 3:4）
const SCREEN_W = Dimensions.get('window').width;
const GRID_H_PAD = 16; // 内容区左右 padding
const CELL_GAP = 4; // 格子间隙（原约 2pt → ×2）
const CELL_W = (SCREEN_W - GRID_H_PAD * 2 - CELL_GAP * 6) / 7;
const CELL_H = CELL_W * (4 / 3); // 长宽比 3:4 → 高 = 4/3 × 宽

type CellType = 'prev' | 'curr' | 'next';
interface DayCell {
  day: number;
  type: CellType;
}

/** 生成日历网格（含上/下月补位），按 ref 用 SUN..SAT 排序；
 * 严格按 7 个一组切行，渲染时每行一个 flex row，避免 flexWrap 算成 6 格 */
function buildGrid(year: number, month: number): DayCell[][] {
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const nextCount = totalCells - startOffset - daysInMonth;

  const cells: DayCell[] = [];
  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, type: 'prev' });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, type: 'curr' });
  }
  for (let d = 1; d <= nextCount; d++) {
    cells.push({ day: d, type: 'next' });
  }

  const rows: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

function coverSource(url?: string): ImageSource | undefined {
  if (!url) return undefined;
  return url.includes('doubanio.com')
    ? { uri: url, headers: { Referer: 'https://book.douban.com/' } }
    : { uri: url };
}

interface ProgressRow {
  book: Book;
  progress: number;
}

export default function CalendarScreen() {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0 起
  const [entriesByDate, setEntriesByDate] = useState<Record<string, ReadingEntry[]>>({});
  const [booksById, setBooksById] = useState<Record<string, Book>>({});
  const [allEntries, setAllEntries] = useState<ReadingEntry[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const yearMonth = `${year}-${String(month + 1).padStart(2, '0')}`;

  useFocusEffect(
    useCallback(() => {
      Promise.all([getEntriesByMonth(yearMonth), getAllBooks(), getAllEntries()]).then(
        ([rows, books, allE]) => {
          const map: Record<string, ReadingEntry[]> = {};
          for (const e of rows) (map[e.date] ??= []).push(e);
          setEntriesByDate(map);
          setAllEntries(allE);
          const bm: Record<string, Book> = {};
          for (const b of books) bm[b.id] = b;
          setBooksById(bm);
        }
      );
    }, [yearMonth])
  );

  const grid = useMemo(() => buildGrid(year, month), [year, month]);

  function shiftMonth(delta: number) {
    const m = month + delta;
    if (m < 0) {
      setMonth(11);
      setYear(year - 1);
    } else if (m > 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(m);
    }
  }

  function goToday() {
    const n = new Date();
    setYear(n.getFullYear());
    setMonth(n.getMonth());
    setMenuOpen(false);
  }

  async function shareMonth() {
    setMenuOpen(false);
    const lines: string[] = [`# ${yearMonth} 阅读记录`];
    const dates = Object.keys(entriesByDate).sort();
    for (const date of dates) {
      const entries = entriesByDate[date];
      if (!entries || entries.length === 0) continue;
      lines.push('');
      lines.push(`## ${date}`);
      for (const e of entries) {
        const title = booksById[e.bookId]?.title ?? '未知书';
        const progress = formatProgress(e);
        lines.push(`- **${title}**${progress ? `（${progress}）` : ''}`);
        if (e.comment) lines.push(`  ${e.comment}`);
      }
    }
    if (lines.length === 1) lines.push('（本月没有记录）');
    await shareText(`reading-${yearMonth}.md`, lines.join('\n'), 'text/markdown');
  }

  // 本月全部条目（用于统计 & 笔记列表）
  const monthEntries = useMemo(
    () => allEntries.filter((e) => e.date.startsWith(yearMonth)),
    [allEntries, yearMonth]
  );

  // 本月有记录的书 id 集合
  const booksWithMonthEntries = useMemo(() => {
    const set = new Set<string>();
    for (const e of monthEntries) set.add(e.bookId);
    return set;
  }, [monthEntries]);

  // 本月读完：finishedAt 落在本月
  const finishedCount = useMemo(() => {
    let n = 0;
    for (const b of Object.values(booksById)) {
      if (b.status === 'finished' && b.finishedAt != null && tsToDate(b.finishedAt).startsWith(yearMonth)) {
        n++;
      }
    }
    return n;
  }, [booksById, yearMonth]);

  // 本月在读：status='reading' 且本月有记录
  const readingCount = useMemo(() => {
    let n = 0;
    for (const b of Object.values(booksById)) {
      if (b.status === 'reading' && booksWithMonthEntries.has(b.id)) n++;
    }
    return n;
  }, [booksById, booksWithMonthEntries]);

  // 本月进度：当前进度倒序（取本月最后一条）
  const progressRows = useMemo<ProgressRow[]>(() => {
    const rows: ProgressRow[] = [];
    for (const b of Object.values(booksById)) {
      if (!(b.status === 'reading' && booksWithMonthEntries.has(b.id))) continue;
      const monthEs = monthEntries.filter((e) => e.bookId === b.id);
      const last = monthEs[monthEs.length - 1];
      if (!last) continue;
      const p = entryProgress(last, b.pageCount);
      if (p == null) continue;
      rows.push({ book: b, progress: p });
    }
    rows.sort((a, b) => b.progress - a.progress);
    return rows.slice(0, 5);
  }, [booksById, booksWithMonthEntries, monthEntries]);

  // 本月笔记：按日期倒序
  const sortedNotes = useMemo(
    () =>
      [...monthEntries].sort((a, b) =>
        a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt
      ),
    [monthEntries]
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 顶栏：☰ | 日 历 | ⋯（左按钮呼出侧边栏） */}
      <View style={styles.navBar}>
        <Pressable onPress={openDrawer} hitSlop={8} style={styles.navBtnLeft}>
          <Text style={styles.navIcon}>☰</Text>
        </Pressable>
        <Text style={styles.navTitle}>日  历</Text>
        <Pressable onPress={() => setMenuOpen(true)} hitSlop={8} style={styles.navBtnRight}>
          <Text style={styles.navIcon}>⋯</Text>
        </Pressable>
      </View>

      {/* 月份导航 */}
      <View style={styles.monthNav}>
        <Pressable onPress={() => shiftMonth(-1)} hitSlop={8} style={styles.monthNavBtn}>
          <Text style={styles.monthNavIcon}>‹</Text>
        </Pressable>
        <Text style={styles.monthTitle}>{yearMonth}</Text>
        <Pressable onPress={() => shiftMonth(1)} hitSlop={8} style={styles.monthNavBtn}>
          <Text style={styles.monthNavIcon}>›</Text>
        </Pressable>
      </View>

      {/* 周次行 */}
      <View style={styles.weekRow}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={styles.weekday}>
            {w}
          </Text>
        ))}
      </View>

      {/* 日历 grid：每行独立 flex row，强制 7 格，避免 flexWrap 算成 6 格 */}
      <View style={styles.grid}>
        {grid.map((row, ri) => (
          <View key={ri} style={styles.gridRow}>
            {row.map((cell, ci) => {
              const date = cell.type === 'curr'
                ? `${yearMonth}-${String(cell.day).padStart(2, '0')}`
                : null;
              const entries = date ? entriesByDate[date] ?? [] : [];
              const firstBook = entries.length > 0 ? booksById[entries[0].bookId] : null;
              const src = coverSource(firstBook?.coverUrl);
              const isCurr = cell.type === 'curr';

              return (
                <Pressable
                  key={ci}
                  style={[styles.cell, isCurr && styles.cellCurr]}
                  onPress={() => {
                    if (firstBook) {
                      router.push({ pathname: '/library/[id]', params: { id: firstBook.id } });
                    }
                  }}>
                  {src ? (
                    <Image source={src} style={styles.cellImg} contentFit="cover" />
                  ) : (
                    <Text style={[styles.day, !isCurr && styles.dayMuted]}>{cell.day}</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {/* 两个统计卡 */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>本月读完</Text>
          <Text style={styles.statValue}>{finishedCount}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>本月在读</Text>
          <Text style={styles.statValue}>{readingCount}</Text>
        </View>
      </View>

      {/* 本月进度 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>本月进度</Text>
          <Pressable hitSlop={8}>
            <Text style={styles.cardHeaderIcon}>⇅</Text>
          </Pressable>
        </View>
        {progressRows.length === 0 ? (
          <Text style={styles.empty}>本月暂无在读进度</Text>
        ) : (
          progressRows.map((row) => {
            const pct = Math.round(row.progress);
            const high = pct >= 50;
            const mid = pct >= 20 && pct < 50;
            return (
              <View key={row.book.id} style={styles.progressRow}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressBar,
                      { width: `${Math.max(pct, 18)}%` },
                      high ? styles.progressBarHigh : mid ? styles.progressBarMid : styles.progressBarLow,
                    ]}>
                    <Text
                      style={[
                        styles.progressBarText,
                        !high && !mid && styles.progressBarTextLow,
                      ]}>
                      {pct}%
                    </Text>
                  </View>
                </View>
                <Text style={styles.progressTitle} numberOfLines={1}>
                  {row.book.title}
                </Text>
              </View>
            );
          })
        )}
      </View>

      {/* 本月笔记 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>本月笔记</Text>
        {sortedNotes.length === 0 ? (
          <Text style={styles.empty}>本月还没有笔记</Text>
        ) : (
          <View style={styles.notesList}>
            {sortedNotes.map((e) => {
              const book = booksById[e.bookId];
              const src = coverSource(book?.coverUrl);
              return (
                <Pressable
                  key={e.id}
                  style={styles.noteRow}
                  onPress={() =>
                    router.push({ pathname: '/note/chat/[entryId]', params: { entryId: e.id } })
                  }>
                  {src ? (
                    <Image source={src} style={styles.noteCover} contentFit="cover" />
                  ) : (
                    <View style={styles.noteCoverPlaceholder}>
                      <Text style={styles.noteCoverIcon}>📖</Text>
                    </View>
                  )}
                  <View style={styles.noteBody}>
                    <Text style={styles.noteDate}>{e.date}</Text>
                    {!!formatProgress(e) && (
                      <Text style={styles.noteProgress}>{formatProgress(e)}</Text>
                    )}
                    {!!e.comment && (
                      <Text style={styles.noteComment} numberOfLines={3}>
                        {e.comment}
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* ⋯ 菜单 */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.menuPanel} onPress={() => {}}>
            <Pressable style={styles.menuItem} onPress={goToday}>
              <Text style={styles.menuItemText}>回到今天</Text>
            </Pressable>
            <View style={styles.menuDivider} />
            <Pressable style={styles.menuItem} onPress={shareMonth}>
              <Text style={styles.menuItemText}>分享本月</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const CARD_RADIUS = 16;
const PROGRESS_TRACK_W = 120;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F5F2' },
  content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 },

  // 顶栏
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  navBtnLeft: { width: 36, alignItems: 'flex-start' },
  navBtnRight: { width: 36, alignItems: 'flex-end' },
  navIcon: { fontSize: 24, fontWeight: '300', color: '#1a1a1a', lineHeight: 28 },
  navTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
    letterSpacing: 6,
  },

  // 月份导航
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  monthNavBtn: { paddingHorizontal: 14, paddingVertical: 4 },
  monthNavIcon: { fontSize: 24, fontWeight: '300', color: '#1a1a1a' },
  monthTitle: { fontSize: 19, fontWeight: '700', color: '#1a1a1a' },

  // 周次
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    color: '#aaa',
    letterSpacing: 1.2,
    fontWeight: '600',
  },

  // 日历 grid：每行 gridRow 独立 flex，强制 7 格
  grid: {
    marginBottom: 16,
  },
  gridRow: {
    flexDirection: 'row',
    gap: CELL_GAP,
    marginBottom: CELL_GAP,
  },
  cell: {
    width: CELL_W,
    height: CELL_H,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    overflow: 'hidden',
  },
  cellCurr: {
    backgroundColor: '#FFFFFF',
  },
  cellImg: { width: '100%', height: '100%' },
  day: { fontSize: 14, color: '#1a1a1a', fontWeight: '500' },
  dayMuted: { color: '#cfcfcf', fontWeight: '400' },

  // 统计卡
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: CARD_RADIUS,
    paddingVertical: 18,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // 标签跟本月进度 cardTitle 同款（16 / 700）
  statLabel: { fontSize: 16, color: '#1a1a1a', fontWeight: '700' },
  statValue: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },

  // 通用卡片
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: CARD_RADIUS,
    padding: 18,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  cardHeaderIcon: { fontSize: 18, color: '#888', fontWeight: '500' },

  // 进度条
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  progressTrack: {
    width: PROGRESS_TRACK_W,
    height: 20,
    justifyContent: 'center',
  },
  progressBar: {
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  progressBarHigh: { backgroundColor: '#9CC76F' },
  progressBarMid: { backgroundColor: '#1f1f1f' },
  progressBarLow: { backgroundColor: '#C8E2A8' },
  progressBarText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  progressBarTextLow: { color: '#3B6B2E' },
  progressTitle: { flex: 1, fontSize: 14, color: '#1a1a1a' },

  // 笔记列表
  notesList: { marginTop: 10 },
  noteRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f2f2f2',
  },
  noteCover: {
    width: 44,
    height: 60,
    borderRadius: 4,
    backgroundColor: '#e8e8e8',
  },
  noteCoverPlaceholder: {
    width: 44,
    height: 60,
    borderRadius: 4,
    backgroundColor: '#e8e8e8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteCoverIcon: { fontSize: 18 },
  noteBody: { flex: 1, gap: 4 },
  noteDate: { fontSize: 12, color: '#888' },
  noteProgress: { fontSize: 14, color: '#1a1a1a', fontWeight: '600' },
  noteComment: { fontSize: 13, color: '#555', lineHeight: 19 },

  empty: { fontSize: 13, color: '#999', marginTop: 4 },

  // 菜单
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuPanel: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '70%',
    overflow: 'hidden',
  },
  menuItem: { paddingVertical: 14, alignItems: 'center' },
  menuItemText: { fontSize: 15, color: '#222' },
  menuDivider: { height: 1, backgroundColor: '#f0f0f0' },
});
