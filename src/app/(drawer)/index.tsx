import { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getAllEntries, getAllBooks, updateEntry } from '@/db';
import { entryHasAI } from '@/utils';
import { ReadingEntry } from '@/types';
import NoteCard from '@/components/NoteCard';
import NoteMenu from '@/components/NoteMenu';

interface Note {
  id: string;
  bookId: string;
  title: string;
  entry: ReadingEntry;
}

export default function HomeScreen() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuEntryId, setMenuEntryId] = useState<string | null>(null);
  const [discussionEntry, setDiscussionEntry] = useState<ReadingEntry | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  // 卡片在滚动容器里的布局（相对 content 原点）
  const [cardLayouts, setCardLayouts] = useState<Record<string, { y: number; height: number }>>({});
  // 当前滚动偏移 + 视口高度（纯计算，不依赖 measure）
  const [scrollOffset, setScrollOffset] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  const load = useCallback(() => {
    Promise.all([getAllEntries(), getAllBooks()]).then(([entries, books]) => {
      const titles = new Map(books.map((b) => [b.id, b.title]));
      setNotes(
        entries.map((e) => ({
          id: e.id,
          bookId: e.bookId,
          title: titles.get(e.bookId) ?? '未知书名',
          entry: e,
        }))
      );
    });
  }, []);

  async function saveEdit(id: string, comment: string) {
    const n = notes.find((x) => x.id === id);
    if (!n) return;
    await updateEntry(id, {
      bookId: n.bookId,
      date: n.entry.date,
      currentPage: n.entry.currentPage,
      progressPercent: n.entry.progressPercent,
      comment,
      tags: n.entry.tags,
    });
    setEditingId(null);
    load();
  }

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
    anchorRef.current?.measureInWindow((x, y, w, h) => {
      setMenuAnchor({ x, y, w, h });
    });
    setMenuEntryId(id);
  }

  function onCardLayout(id: string, y: number, height: number) {
    setCardLayouts((prev) => {
      const cur = prev[id];
      if (cur && cur.y === y && cur.height === height) return prev;
      return { ...prev, [id]: { y, height } };
    });
  }

  const menuEntry = menuEntryId ? notes.find((n) => n.id === menuEntryId)?.entry : null;

  // 浮动「收起」：有展开的卡片，且其底部（「收起」所在）已滚出视口下边沿（或在上边沿之上）
  let anyExpanded = false;
  let anyCollapseOffScreen = false;
  for (const n of notes) {
    if (!expanded[n.id]) continue;
    anyExpanded = true;
    const l = cardLayouts[n.id];
    if (!l) continue;
    const bottom = l.y + l.height;
    if (bottom > scrollOffset + viewportHeight || bottom < scrollOffset) {
      anyCollapseOffScreen = true;
    }
  }
  const showFloatingCollapse = anyExpanded && anyCollapseOffScreen;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
        onScroll={(e) => setScrollOffset(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}>
        {notes.length === 0 ? (
          <Text style={styles.empty}>还没有笔记，点右下角 ＋ 开始记录</Text>
        ) : (
          notes.map((n) => (
            <NoteCard
              key={n.id}
              cardId={n.id}
              entry={n.entry}
              title={n.title}
              expanded={!!expanded[n.id]}
              hasAI={entryHasAI(n.entry)}
              editing={editingId === n.id}
              onToggleExpand={() => toggleExpand(n.id)}
              onPressBook={() => router.push({ pathname: '/library/[id]', params: { id: n.bookId } })}
              onOpenMenu={(anchorRef) => openMenu(n.id, anchorRef)}
              onPressAI={() => {
                if (entryHasAI(n.entry)) {
                  setDiscussionEntry(n.entry);
                } else {
                  router.push({ pathname: '/note/chat/[entryId]', params: { entryId: n.id } });
                }
              }}
              onStartEdit={() => setEditingId(n.id)}
              onSaveEdit={(comment) => saveEdit(n.id, comment)}
              onCancelEdit={() => setEditingId(null)}
              onLayoutReport={onCardLayout}
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
          cardRight={Dimensions.get('window').width - 16}
          onClose={() => {
            setMenuEntryId(null);
            setMenuAnchor(null);
          }}
          onChanged={load}
          onEdit={() => setEditingId(menuEntry.id)}
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
  root: { flex: 1, backgroundColor: '#F3F5F2' },
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