import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { entryHasAI, tsToDateTime } from '@/utils';
import { ReadingEntry } from '@/types';
import { getAllEntries, getAllBooks, getLinksForEntry, addLink, removeLink, deleteEntry } from '@/db';

export interface NoteMenuProps {
  entry: ReadingEntry;
  visible: boolean;
  /** 「…」图标在屏幕上的位置（由父页面 measure 得到） */
  anchor?: { x: number; y: number; w: number; h: number } | null;
  onClose: () => void;
  onChanged?: () => void;
}

const PANEL_WIDTH = Math.round(Dimensions.get('window').width * (2 / 3));
const GAP = 6;

/**
 * 笔记「…」菜单弹窗：靠近图标（默认向左下展开），宽度 ≈ 屏幕 2/3，与卡片右对齐；
 * 若图标靠下空间不足则向左上展开；保证弹窗在屏幕内完整可见。
 */
export default function NoteMenu({ entry, visible, anchor, onClose, onChanged }: NoteMenuProps) {
  const router = useRouter();
  const [view, setView] = useState<'menu' | 'links'>('menu');
  const [others, setOthers] = useState<ReadingEntry[]>([]);
  const [bookTitles, setBookTitles] = useState<Record<string, string>>({});
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());

  const hasAI = entryHasAI(entry);

  useEffect(() => {
    if (visible) setView('menu');
  }, [visible]);

  async function openLinks() {
    setView('links');
    const [all, books, links] = await Promise.all([
      getAllEntries(),
      getAllBooks(),
      getLinksForEntry(entry.id),
    ]);
    setOthers(all.filter((x) => x.id !== entry.id));
    const t: Record<string, string> = {};
    for (const b of books) t[b.id] = b.title;
    setBookTitles(t);
    setLinkedIds(new Set(links.map((l) => l.id)));
  }

  async function toggleLink(id: string) {
    const next = new Set(linkedIds);
    if (next.has(id)) {
      await removeLink(entry.id, id);
      next.delete(id);
    } else {
      await addLink(entry.id, id);
      next.add(id);
    }
    setLinkedIds(next);
  }

  function goChat() {
    onClose();
    router.push({ pathname: '/note/chat/[entryId]', params: { entryId: entry.id } });
  }

  function goEdit() {
    onClose();
    router.push({ pathname: '/note/new', params: { entryId: entry.id } });
  }

  function onDelete() {
    Alert.alert('删除笔记', '确定删除这条笔记吗？删除后不可恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteEntry(entry.id);
          onClose();
          onChanged?.();
        },
      },
    ]);
  }

  // 计算弹窗位置：默认向左下，否则向左上
  const win = Dimensions.get('window');
  const safeTop = 56;
  const safeBottom = 40;
  const MENU_HEIGHT = 220;
  const LINKS_HEIGHT = 320;

  let top = 0;
  if (anchor) {
    const below = anchor.y + anchor.h + GAP + (view === 'menu' ? MENU_HEIGHT : LINKS_HEIGHT);
    const fitsBelow = below <= win.height - safeBottom;
    if (fitsBelow) {
      top = anchor.y + anchor.h + GAP;
    } else {
      const aboveTop = anchor.y - GAP - (view === 'menu' ? MENU_HEIGHT : LINKS_HEIGHT);
      top = Math.max(safeTop, aboveTop);
    }
  } else {
    top = safeTop + 40;
  }
  // 与笔记卡片右对齐：弹窗右边对齐卡片右边 = anchor.x + anchor.w - PANEL_WIDTH
  const left = anchor ? anchor.x + anchor.w - PANEL_WIDTH : win.width - PANEL_WIDTH - 16;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.panel, { top, left, width: PANEL_WIDTH }]}
          onPress={() => {}}>
          {view === 'menu' ? (
            <>
              <Pressable style={[styles.item, hasAI && styles.itemDisabled]} disabled={hasAI} onPress={goChat}>
                <Text style={[styles.itemText, hasAI ? styles.textDisabled : styles.textChat]}>与 AI 对话</Text>
              </Pressable>
              <Pressable style={styles.item} onPress={goEdit}>
                <Text style={styles.itemText}>编辑</Text>
              </Pressable>
              <Pressable style={styles.item} onPress={openLinks}>
                <Text style={styles.itemText}>关联笔记</Text>
              </Pressable>
              <Pressable style={styles.item} onPress={onDelete}>
                <Text style={[styles.itemText, styles.textDanger]}>删除</Text>
              </Pressable>
              <View style={styles.meta}>
                <Text style={styles.metaText}>字数统计：{entry.comment?.length ?? 0}</Text>
                <Text style={styles.metaText}>最后编辑：{tsToDateTime(entry.createdAt)}</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.header}>
                <Pressable onPress={() => setView('menu')} hitSlop={8}>
                  <Text style={styles.backText}>‹ 返回</Text>
                </Pressable>
                <Text style={styles.headerTitle}>关联笔记</Text>
                <View style={{ width: 40 }} />
              </View>
              <ScrollView style={styles.linkList}>
                {others.length === 0 ? (
                  <Text style={styles.empty}>还没有其他笔记可关联</Text>
                ) : (
                  others.map((o) => (
                    <Pressable key={o.id} style={styles.linkItem} onPress={() => toggleLink(o.id)}>
                      <View style={styles.linkText}>
                        <Text style={styles.linkTitle} numberOfLines={1}>
                          {bookTitles[o.bookId] ?? '未知书名'} · {o.date}
                        </Text>
                        <Text style={styles.linkComment} numberOfLines={1}>
                          {o.comment}
                        </Text>
                      </View>
                      <Text style={[styles.linkStatus, linkedIds.has(o.id) && styles.linkLinked]}>
                        {linkedIds.has(o.id) ? '已关联' : '＋ 关联'}
                      </Text>
                    </Pressable>
                  ))
                )}
              </ScrollView>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  panel: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  item: { paddingVertical: 14, paddingHorizontal: 20 },
  itemDisabled: { opacity: 0.5 },
  itemText: { fontSize: 16, color: '#222' },
  textChat: { color: '#7CB342', fontWeight: '600' },
  textDisabled: { color: '#c8c8c8' },
  textDanger: { color: '#e74c3c' },
  meta: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 4,
  },
  metaText: { fontSize: 12, color: '#999' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '600', color: '#222' },
  backText: { fontSize: 15, color: '#208AEF' },
  linkList: { maxHeight: 260 },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  linkText: { flex: 1 },
  linkTitle: { fontSize: 14, fontWeight: '500' },
  linkComment: { fontSize: 12, color: '#999', marginTop: 2 },
  linkStatus: { fontSize: 13, color: '#208AEF', fontWeight: '600' },
  linkLinked: { color: '#7CB342' },
  empty: { color: '#999', fontSize: 13, padding: 20, textAlign: 'center' },
});