import { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  Dimensions,
  findNodeHandle,
  UIManager,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getAllEntries, getAllBooks } from '@/db';
import { round2, entryHasAI } from '@/utils';
import { ReadingEntry } from '@/types';
import NoteCard from '@/components/NoteCard';
import NoteMenu from '@/components/NoteMenu';

interface Note {
  id: string;
  bookId: string;
  title: string;
  date: string;
  comment: string;
  progress: string;
  aiSummary?: string;
  entry: ReadingEntry;
}

function formatProgress(e: ReadingEntry): string {
  if (e.progressPercent != null) return `${round2(e.progressPercent)}%`;
  if (e.currentPage != null) return `第 ${e.currentPage} 页`;
  return '';
}

export default function HomeScreen() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [menuEntryId, setMenuEntryId] = useState<string | null>(null);
  const [discussionEntry, setDiscussionEntry] = useState<ReadingEntry | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [expandTextOnScreen, setExpandTextOnScreen] = useState<Record<string, boolean>>({});
  const expandTextRefs = useRef<Record<string, React.RefObject<View | null>>>({});
  const cardRefs = useRef<Record<string, React.RefObject<View | null>>>({});
  const [cardRightEdges, setCardRightEdges] = useState<Record<string, number>>({});

  const load = useCallback(() => {
    Promise.all([getAllEntries(), getAllBooks()]).then(([entries, books]) => {
      const titles = new Map(books.map((b) => [b.id, b.title]));
      setNotes(
        entries.map((e) => ({
          id: e.id,
          bookId: e.bookId,
          title: titles.get(e.bookId) ?? '未知书名',
          date: e.date,
          comment: e.comment,
          progress: formatProgress(e),
          aiSummary: e.aiSummary,
          entry: e,
        }))
      );
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function toggleExpand(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function collapseAll() {
    setExpanded({});
  }

  function openMenu(id: string, anchorRef: React.RefObject<View | null>) {
    const node = findNodeHandle(anchorRef.current);
    if (node) {
      UIManager.measure(node, (x, y, w, h, px, py) => {
        setMenuAnchor({ x: px, y: py, w, h });
        setMenuEntryId(id);
      });
    } else {
      setMenuEntryId(id);
    }
  }

  function registerExpandTextRef(id: string, ref: React.RefObject<View | null>) {
    if (expandTextRefs.current[id] !== ref) {
      expandTextRefs.current[id] = ref;
    }
  }

  function registerCardRef(id: string, ref: React.RefObject<View | null>) {
    if (cardRefs.current[id] !== ref) {
      cardRefs.current[id] = ref;
    }
    const node = findNodeHandle(ref.current);
    if (!node) return;
    UIManager.measure(node, (x, y, w, h, px, py) => {
      const right = px + w;
      setCardRightEdges((prev) => (prev[id] === right ? prev : { ...prev, [id]: right }));
    });
  }

  function remeasureExpandTexts() {
    const screenH = Dimensions.get('window').height;
    const next: Record<string, boolean> = {};
    let dirty = false;
    for (const id of Object.keys(expandTextRefs.current)) {
      const ref = expandTextRefs.current[id];
      const node = findNodeHandle(ref?.current ?? null);
      if (!node) {
        next[id] = false;
        continue;
      }
      UIManager.measure(node, (x, y, w, h, px, py) => {
        const visible = py < screenH && py + h > 0;
        if (visible !== expandTextOnScreen[id]) {
          setExpandTextOnScreen((prev) => ({ ...prev, [id]: visible }));
        }
      });
      next[id] = false; // placeholder
      dirty = true;
    }
    if (dirty) {
      // placeholder 同步刷新；实际值在 measure 回调里 set
    }
  }

  const menuEntry = menuEntryId ? notes.find((n) => n.id === menuEntryId)?.entry : null;

  // 任一卡片展开且其「收起」文字不在屏幕上 → 显示浮动「收起」
  const anyExpanded = notes.some((n) => expanded[n.id]);
  const showFloatingCollapse = anyExpanded && !Object.values(expandTextOnScreen).some(Boolean);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        onScrollEndDrag={remeasureExpandTexts}
        onMomentumScrollEnd={remeasureExpandTexts}
        scrollEventThrottle={32}>
        {notes.length === 0 ? (
          <Text style={styles.empty}>还没有笔记，点右下角 ＋ 开始记录</Text>
        ) : (
          notes.map((n) => (
            <NoteCard
              key={n.id}
              cardId={n.id}
              title={n.title}
              date={n.date}
              comment={n.comment}
              progress={n.progress}
              aiSummary={n.aiSummary}
              expanded={!!expanded[n.id]}
              hasAI={entryHasAI(n.entry)}
              onToggleExpand={() => toggleExpand(n.id)}
              onPressBook={() => router.push({ pathname: '/library/[id]', params: { id: n.bookId } })}
              onOpenMenu={(anchorRef) => openMenu(n.id, anchorRef)}
              onPressAI={() => setDiscussionEntry(n.entry)}
              registerExpandTextRef={registerExpandTextRef}
              registerCardRef={registerCardRef}
            />
          ))
        )}
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => router.push('/note/new')}>
        <Text style={styles.fabText}>＋</Text>
      </Pressable>

      {showFloatingCollapse && (
        <Pressable style={styles.collapseFloating} onPress={collapseAll}>
          <Text style={styles.collapseFloatingText}>收起</Text>
        </Pressable>
      )}

      {menuEntry && (
        <NoteMenu
          entry={menuEntry}
          visible
          anchor={menuAnchor}
          cardRight={menuEntryId ? cardRightEdges[menuEntryId] : undefined}
          onClose={() => {
            setMenuEntryId(null);
            setMenuAnchor(null);
          }}
          onChanged={load}
        />
      )}

      <Modal
        visible={!!discussionEntry}
        transparent
        animationType="fade"
        onRequestClose={() => setDiscussionEntry(null)}>
        <View style={styles.discussionOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDiscussionEntry(null)} />
          <View style={styles.discussionCard}>
            <View style={styles.discussionHeader}>
              <Text style={styles.discussionTitle}>对话记录</Text>
              <Pressable onPress={() => setDiscussionEntry(null)} hitSlop={10}>
                <Text style={styles.discussionClose}>关闭</Text>
              </Pressable>
            </View>
            <ScrollView
              style={styles.discussionScroll}
              contentContainerStyle={styles.discussionContent}
              scrollEnabled
              nestedScrollEnabled
              showsVerticalScrollIndicator>
              {discussionEntry?.discussion?.map((t, i) => (
                <View key={i} style={t.role === 'assistant' ? styles.bubbleAI : styles.bubbleUser}>
                  <Text style={t.role === 'assistant' ? styles.bubbleTextAI : styles.bubbleTextUser}>
                    {t.text}
                  </Text>
                </View>
              ))}
              {discussionEntry?.discussion && discussionEntry.discussion.length === 0 && (
                <Text style={styles.discussionEmpty}>暂无对话记录</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0f0f0' },
  content: { padding: 16, gap: 16, paddingBottom: 120 },
  empty: { color: '#999', textAlign: 'center', marginTop: 40 },
  fab: {
    position: 'absolute',
    bottom: 52,
    left: '50%',
    marginLeft: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#7CB342',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 30, lineHeight: 34 },
  collapseFloating: {
    position: 'absolute',
    left: 16,
    bottom: 52,
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  collapseFloatingText: { color: '#208AEF', fontWeight: '600', fontSize: 14 },
  discussionOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.55)' },
  discussionCard: {
    width: Math.round(Dimensions.get('window').width * 0.78),
    height: Math.round(Dimensions.get('window').height * 0.75),
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  discussionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  discussionTitle: { fontSize: 17, fontWeight: '600' },
  discussionClose: { fontSize: 15, color: '#208AEF', fontWeight: '600' },
  discussionScroll: { flex: 1 },
  discussionContent: { padding: 16, gap: 10, flexGrow: 1 },
  discussionEmpty: { color: '#999', fontSize: 14, textAlign: 'center', marginTop: 24 },
  bubbleAI: { alignSelf: 'flex-start', backgroundColor: '#f0f0f0', borderRadius: 12, padding: 10, maxWidth: '85%' },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: '#208AEF', borderRadius: 12, padding: 10, maxWidth: '85%' },
  bubbleTextAI: { fontSize: 14, lineHeight: 20, color: '#222' },
  bubbleTextUser: { fontSize: 14, lineHeight: 20, color: '#fff' },
});