import { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Modal, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getBook,
  getEntriesByBook,
  getReflections,
  countEntriesByBook,
  addReflection,
  setBookRating,
  deleteBook,
  generateId,
  getSettings,
} from '@/db';
import { synthesizeBook } from '@/ai';
import { daysWithEntries, daysSince, entryProgress } from '@/stats';
import { todayString } from '@/utils';
import { Book, ReadingEntry, Reflection } from '@/types';
import BookCover from '@/components/BookCover';
import StarRating from '@/components/StarRating';
import BookStats from '@/components/BookStats';
import InsightTabs from '@/components/InsightTabs';
import ReadingTimeline from '@/components/ReadingTimeline';
import AIInsightCard from '@/components/AIInsightCard';

type Tab = 'notes' | 'reflections';

const COVER_W = 106;
const COVER_H = 148;
const COVER_INFO_GAP = 20;
const HERO_H_PAD = 12;
const HERO_TO_STATS_GAP = 40;
const STATS_TO_NOTES_GAP = 40;

/** 用斜杠拼接非空字段：author / publisher / translator / publishYear出版 / pageCount页 */
function buildMetadata(book: Book): string {
  const parts: string[] = [];
  if (book.author) parts.push(book.author);
  if (book.publisher) parts.push(book.publisher);
  if (book.translator) parts.push(book.translator);
  if (book.publishYear) parts.push(`${book.publishYear}出版`);
  if (book.pageCount) parts.push(`${book.pageCount}页`);
  return parts.join(' / ');
}

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [book, setBook] = useState<Book | null>(null);
  const [entries, setEntries] = useState<ReadingEntry[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [noteCount, setNoteCount] = useState(0);
  const [tab, setTab] = useState<Tab>('notes');
  const [organizing, setOrganizing] = useState(false);
  const [organizeError, setOrganizeError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const reflectionsSorted = useMemo(
    () => [...reflections].sort((a, b) => b.createdAt - a.createdAt),
    [reflections]
  );

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      Promise.all([getBook(id), getEntriesByBook(id), getReflections(id), countEntriesByBook(id)]).then(
        ([b, e, r, c]) => {
          setBook(b);
          setEntries(e);
          setReflections(r);
          setNoteCount(c);
        }
      );
    }, [id])
  );

  if (!book) {
    return (
      <View style={styles.center}>
        <Text>加载中…</Text>
      </View>
    );
  }

  const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null;
  const lastDate = lastEntry ? lastEntry.date : null;
  const lastOpenDays = lastDate ? daysSince(lastDate, todayString()) : null;
  const readDays = daysWithEntries(entries);
  const readTimes = book.readCount ?? 0;
  const currentRound = book.status === 'reading' ? readTimes + 1 : readTimes;
  const progressPct = lastEntry ? entryProgress(lastEntry, book.pageCount) : null;

  const statusLabel = book.status === 'finished' ? `已读 ${readTimes} 遍` : `在读 · 第 ${currentRound} 遍`;
  const canInsight = !organizing && noteCount > 5;
  const metadata = buildMetadata(book);
  const subtitle = (book as Book & { subtitle?: string }).subtitle;

  async function rate(v: number) {
    await setBookRating(book!.id, v);
    setBook(await getBook(book!.id));
  }

  function goExport() {
    setMenuOpen(false);
    router.push({ pathname: '/library/[id]/export', params: { id: book!.id } });
  }

  function onDelete() {
    setMenuOpen(false);
    Alert.alert(
      '删除本书',
      '删除书籍将同时删除书籍笔记',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认',
          style: 'destructive',
          onPress: async () => {
            await deleteBook(book!.id);
            router.replace('/library');
          },
        },
      ]
    );
  }

  async function generateInsight() {
    setOrganizing(true);
    setOrganizeError('');
    try {
      const settings = await getSettings();
      const content = await synthesizeBook(
        settings,
        book!.title,
        entries.map((e) => ({ comment: e.comment, aiKeyPoints: e.aiKeyPoints, aiSummary: e.aiSummary }))
      );
      await addReflection({ id: generateId(), bookId: book!.id, content, createdAt: Date.now() });
      setReflections(await getReflections(book!.id));
      setTab('reflections');
    } catch (e) {
      setOrganizeError(e instanceof Error ? e.message : '生成失败');
    } finally {
      setOrganizing(false);
    }
  }

  return (
    <View style={styles.root}>
      {/* 顶部 Hero — 白色背景 */}
      <View style={[styles.hero, { paddingTop: insets.top }]}>
        {/* 导航栏：back | 占位 | ♡ | ⋯ */}
        <View style={styles.navBar}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.navBtn}>
            <Text style={styles.navIcon}>‹</Text>
          </Pressable>
          <View style={styles.navSpacer} />
          <View style={styles.navRight}>
            <Pressable onPress={() => {}} hitSlop={8} style={styles.navBtn}>
              <Text style={styles.navIcon}>♡</Text>
            </Pressable>
            <Pressable onPress={() => setMenuOpen(true)} hitSlop={8} style={styles.navBtn}>
              <Text style={styles.navIcon}>⋯</Text>
            </Pressable>
          </View>
        </View>

        {/* 屏幕标题 — 绝对居中于整个页面宽度 */}
        <View style={[styles.navTitleLayer, { top: insets.top }]} pointerEvents="none">
          <Text style={styles.navTitle} numberOfLines={1}>图书详情</Text>
        </View>

        {/* Book overview section */}
        <View style={styles.bookOverview}>
          {/* 顶部行：cover | info stack */}
          <View style={styles.topRow}>
            <View style={styles.coverWrap}>
              <BookCover url={book.coverUrl} size={COVER_W} />
            </View>

            <View style={styles.infoCol}>
              <Text style={styles.title} numberOfLines={3}>{book.title}</Text>
              {!!subtitle && <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>}
              {!!metadata && <Text style={styles.metadata} numberOfLines={3}>{metadata}</Text>}
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>{statusLabel}</Text>
              </View>
              <StarRating value={book.rating ?? 0} onChange={rate} size={16} activeColor="#F5B400" inactiveColor="#D8D5CF" />
            </View>
          </View>

          {/* 三个统计 — cover 正下方 */}
          <View style={styles.statsRow}>
            <BookStats lastOpenDays={lastOpenDays} readDays={readDays} progressPct={progressPct} />
          </View>
        </View>
      </View>

      {/* 内容区 */}
      <View style={styles.contentWrap}>
        <InsightTabs
          activeTab={tab}
          onTabChange={setTab}
          noteCount={entries.length}
          reflectionCount={reflections.length}
          onNewInsight={generateInsight}
          insightDisabled={!canInsight}
          loading={organizing}
        />

        {!!organizeError && <Text style={styles.error}>{organizeError}</Text>}

        <ScrollView style={styles.listScroll} contentContainerStyle={styles.listContent}>
          {tab === 'notes' ? (
            entries.length === 0 ? (
              <Text style={styles.empty}>还没有笔记</Text>
            ) : (
              <ReadingTimeline
                entries={entries}
                onEntryPress={(entryId) => router.push({ pathname: '/note/chat/[entryId]', params: { entryId } })}
              />
            )
          ) : reflectionsSorted.length === 0 ? (
            <Text style={styles.empty}>还没有 AI 洞察</Text>
          ) : (
            <View>
              {reflectionsSorted.map((r) => (
                <AIInsightCard key={r.id} reflection={r} />
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      {/* 「…」菜单 */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.menuPanel} onPress={() => {}}>
            <Pressable style={styles.menuItem} onPress={goExport}>
              <Text style={styles.menuItemText}>导出笔记</Text>
            </Pressable>
            <View style={styles.menuDivider} />
            <Pressable style={styles.menuItem} onPress={onDelete}>
              <Text style={[styles.menuItemText, styles.menuItemDanger]}>删除本书</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Hero
  hero: { backgroundColor: '#FFFFFF' },

  // Nav bar: back | 占位 | fav | more
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: HERO_H_PAD,
  },
  navBtn: { padding: 4 },
  navIcon: { color: '#1a1a1a', fontSize: 26, fontWeight: '400', lineHeight: 28 },
  navSpacer: { flex: 1 },
  navRight: { flexDirection: 'row', gap: 14 },
  // 屏幕标题 — 绝对居中于整个页面宽度
  navTitleLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '600',
  },

  // Book overview
  bookOverview: {
    paddingHorizontal: HERO_H_PAD,
    paddingTop: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: COVER_INFO_GAP,
  },
  coverWrap: {
    width: COVER_W,
    height: COVER_H,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  infoCol: {
    flex: 1,
    height: COVER_H,
    justifyContent: 'space-between',
  },
  title: { color: '#1a1a1a', fontSize: 22, fontWeight: '700', lineHeight: 28 },
  subtitle: { color: '#5a5a5a', fontSize: 14, lineHeight: 19 },
  metadata: { color: '#9C9C9C', fontSize: 12, lineHeight: 17 },
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusPillText: { color: '#1a1a1a', fontSize: 12 },

  // 三个统计 — cover 正下方，gap = HERO_TO_STATS_GAP
  statsRow: {
    marginTop: HERO_TO_STATS_GAP,
  },

  // Content area — 上方与 stats 留 STATS_TO_NOTES_GAP
  contentWrap: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: STATS_TO_NOTES_GAP,
  },
  listScroll: { flex: 1 },
  listContent: { paddingTop: 8, paddingBottom: 32 },

  error: { paddingHorizontal: 12, color: '#c0392b', fontSize: 13, marginTop: 4 },
  empty: { color: '#999', fontSize: 14, padding: 20, textAlign: 'center' },

  // Menu
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  menuPanel: {
    width: 240,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  menuItem: { paddingVertical: 14, paddingHorizontal: 20 },
  menuItemText: { fontSize: 16, color: '#222', textAlign: 'center' },
  menuItemDanger: { color: '#e74c3c' },
  menuDivider: { height: 1, backgroundColor: '#f0f0f0', marginHorizontal: 10 },
});