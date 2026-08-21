import { useCallback, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Modal, Dimensions, findNodeHandle, UIManager } from 'react-native';
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

  const menuEntry = menuEntryId ? notes.find((n) => n.id === menuEntryId)?.entry : null;

  // 任一卡片展开 → 显示左下浮动「收起」
  const anyExpanded = notes.some((n) => expanded[n.id]);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        {notes.length === 0 ? (
          <Text style={styles.empty}>还没有笔记，点右下角 ＋ 开始记录</Text>
        ) : (
          notes.map((n) => (
            <NoteCard
              key={n.id}
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
            />
          ))
        )}
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => router.push('/note/new')}>
        <Text style={styles.fabText}>＋</Text>
      </Pressable>

      {anyExpanded && (
        <Pressable style={styles.collapseFloating} onPress={collapseAll}>
          <Text style={styles.collapseFloatingText}>收起</Text>
        </Pressable>
      )}

      {menuEntry && (
        <NoteMenu
          entry={menuEntry}
          visible
          anchor={menuAnchor}
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
        <Pressable style={styles.discussionOverlay} onPress={() => setDiscussionEntry(null)}>
          <Pressable style={styles.discussionCard} onPress={() => {}}>
            <View style={styles.discussionHeader}>
              <Text style={styles.discussionTitle}>对话记录</Text>
              <Pressable onPress={() => setDiscussionEntry(null)} hitSlop={10}>
                <Text style={styles.discussionClose}>关闭</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.discussionContent}>
              {discussionEntry?.discussion?.map((t, i) => (
                <View key={i} style={t.role === 'assistant' ? styles.bubbleAI : styles.bubbleUser}>
                  <Text style={t.role === 'assistant' ? styles.bubbleTextAI : styles.bubbleTextUser}>
                    {t.text}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0f0f0' },
  content: { padding: 16, gap: 16 },
  empty: { color: '#999', textAlign: 'center', marginTop: 40 },
  // 圆形绿色 ＋ 上移 24pt（原来 bottom: 28 → bottom: 52）
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
  // 左下角浮动「收起」，底部与绿色 ＋ 底部对齐（同 bottom: 52）
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
  // 对话原文弹窗（参考 ref-popup）：全屏暗背景 + 居中占约 78% 宽 × 90% 高
  discussionOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.55)' },
  discussionCard: {
    width: Math.round(Dimensions.get('window').width * 0.78),
    height: Math.round(Dimensions.get('window').height * 0.9),
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
  discussionContent: { padding: 16, gap: 10 },
  bubbleAI: { alignSelf: 'flex-start', backgroundColor: '#f0f0f0', borderRadius: 12, padding: 10, maxWidth: '85%' },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: '#208AEF', borderRadius: 12, padding: 10, maxWidth: '85%' },
  bubbleTextAI: { fontSize: 14, lineHeight: 20, color: '#222' },
  bubbleTextUser: { fontSize: 14, lineHeight: 20, color: '#fff' },
});