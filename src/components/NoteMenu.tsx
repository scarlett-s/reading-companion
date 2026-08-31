import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { tsToDateTime } from '@/utils';
import { ReadingEntry } from '@/types';
import { getAllEntries, getAllBooks, getLinksForEntry, addLink, removeLink, deleteEntry } from '@/db';
import { Pressable } from '@/components/Pressable';
import { colors, spacing, radius, typography, shadow } from '@/theme';

export interface NoteMenuProps {
  entry: ReadingEntry;
  visible: boolean;
  /** 「…」图标在屏幕上的位置（由父页面 measure 得到） */
  anchor?: { x: number; y: number; w: number; h: number } | null;
  /** 笔记卡片屏幕右边缘位置（用卡片容器 measure 得到）；用于菜单右对齐到卡片 */
  cardRight?: number;
  onClose: () => void;
  onChanged?: () => void;
  /** 点「编辑」→ 直接在卡片内编辑（父页面接管，不再跳页） */
  onEdit?: () => void;
}

const PANEL_WIDTH = Math.round(Dimensions.get('window').width * (2 / 3));
const GAP = 6;

/**
 * 笔记「…」菜单弹窗：靠近图标（默认向左下展开），宽度 ≈ 屏幕 2/3，与卡片右对齐；
 * 若图标靠下空间不足则向左上展开；保证弹窗在屏幕内完整可见。
 */
export default function NoteMenu({ entry, visible, anchor, cardRight, onClose, onChanged, onEdit }: NoteMenuProps) {
  const [view, setView] = useState<'menu' | 'links'>('menu');
  const [others, setOthers] = useState<ReadingEntry[]>([]);
  const [bookTitles, setBookTitles] = useState<Record<string, string>>({});
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());
  const [linkQuery, setLinkQuery] = useState('');

  useEffect(() => {
    if (visible) setView('menu');
  }, [visible]);

  async function openLinks() {
    setView('links');
    setLinkQuery('');
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

  function goEdit() {
    onClose();
    onEdit?.();
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
  const MENU_HEIGHT = 175;
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
  // 与笔记卡片右对齐：弹窗右边对齐卡片右边
  const rightEdge = cardRight ?? (anchor ? anchor.x + anchor.w : win.width - 16);
  const left = rightEdge - PANEL_WIDTH;

  const q = linkQuery.trim().toLowerCase();
  const visibleOthers = q
    ? others.filter((o) => {
        const t = bookTitles[o.bookId] ?? '';
        return t.toLowerCase().includes(q) || o.comment.toLowerCase().includes(q) || o.date.includes(q);
      })
    : others;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.panel, { top, left, width: PANEL_WIDTH }]}
          onPress={() => {}}>
          {view === 'menu' ? (
            <>
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
              <View style={styles.searchWrap}>
                <TextInput
                  style={styles.searchInput}
                  value={linkQuery}
                  onChangeText={setLinkQuery}
                  placeholder="搜索笔记 / 书名"
                  placeholderTextColor="#999"
                  autoCorrect={false}
                />
              </View>
              <ScrollView style={styles.linkList} keyboardShouldPersistTaps="handled">
                {visibleOthers.length === 0 ? (
                  <Text style={styles.empty}>
                    {others.length === 0 ? '还没有其他笔记可关联' : '没有匹配的笔记'}
                  </Text>
                ) : (
                  visibleOthers.map((o) => (
                    <Pressable
                      key={o.id}
                      style={[styles.linkItem, linkedIds.has(o.id) && styles.linkItemLinked]}
                      onPress={() => toggleLink(o.id)}>
                      <View style={styles.linkText}>
                        <Text style={styles.linkTitle} numberOfLines={1}>
                          {bookTitles[o.bookId] ?? '未知书名'} · {o.date}
                        </Text>
                        <Text style={styles.linkComment} numberOfLines={2}>
                          {o.comment}
                        </Text>
                      </View>
                      {linkedIds.has(o.id) && <Text style={styles.linkCheck}>✓</Text>}
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
  backdrop: { flex: 1, backgroundColor: colors.backdrop },
  panel: {
    position: 'absolute',
    backgroundColor: colors.surface,
    borderRadius: radius.md + 2,
    paddingVertical: spacing.xs + 2,
    ...shadow.floating,
  },
  item: { paddingVertical: spacing.md + 2, paddingHorizontal: spacing.xl },
  itemText: { ...typography.body, fontSize: 16 },
  textDanger: { color: colors.danger },
  meta: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  metaText: { ...typography.micro, fontSize: 12, color: colors.textSubtle },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { flex: 1, textAlign: 'center', ...typography.bodyStrong, color: colors.text },
  backText: { ...typography.body, color: colors.accent },
  searchWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  searchInput: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md - 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
  },
  linkList: { maxHeight: 300 },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  linkItemLinked: { backgroundColor: '#F4FAF1' },
  linkText: { flex: 1 },
  linkTitle: { ...typography.body, fontSize: 14, fontWeight: '500' },
  linkComment: { ...typography.micro, fontSize: 12, color: colors.textSubtle, marginTop: 2, lineHeight: 17 },
  linkCheck: { fontSize: 16, color: colors.primary, fontWeight: '700' },
  empty: { color: colors.textSubtle, fontSize: 13, padding: spacing.xl, textAlign: 'center' },
});