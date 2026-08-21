import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import {
  getEntry,
  getBook,
  getLinksForEntry,
  getBacklinksForEntry,
  addLink,
  removeLink,
  deleteEntry,
  getAllEntries,
  getAllBooks,
} from '@/db';
import { round2, entryHasAI } from '@/utils';
import { ReadingEntry, Book, LinkedEntry } from '@/types';
import NoteMenu from '@/components/NoteMenu';

function formatProgress(e: ReadingEntry): string {
  if (e.progressPercent != null) return `${round2(e.progressPercent)}%`;
  if (e.currentPage != null) return `第 ${e.currentPage} 页`;
  return '';
}

export default function NoteDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [entry, setEntry] = useState<ReadingEntry | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [links, setLinks] = useState<LinkedEntry[]>([]);
  const [backlinks, setBacklinks] = useState<LinkedEntry[]>([]);
  const [others, setOthers] = useState<ReadingEntry[]>([]);
  const [bookTitles, setBookTitles] = useState<Record<string, string>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [discussionOpen, setDiscussionOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [e, ls, bl, all, books] = await Promise.all([
      getEntry(id),
      getLinksForEntry(id),
      getBacklinksForEntry(id),
      getAllEntries(),
      getAllBooks(),
    ]);
    setEntry(e);
    setLinks(ls);
    setBacklinks(bl);
    setOthers(all.filter((x) => x.id !== id));
    const titles: Record<string, string> = {};
    for (const b of books) titles[b.id] = b.title;
    setBookTitles(titles);
    if (e) setBook(await getBook(e.bookId));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const linkedIds = useMemo(() => new Set(links.map((l) => l.id)), [links]);

  function onDelete() {
    Alert.alert('删除笔记', '确定删除这条笔记吗？删除后不可恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteEntry(id!);
          router.replace('/');
        },
      },
    ]);
  }

  async function toggleLink(targetId: string) {
    if (linkedIds.has(targetId)) await removeLink(id!, targetId);
    else await addLink(id!, targetId);
    setLinks(await getLinksForEntry(id!));
  }

  function openNote(nid: string) {
    router.push({ pathname: '/note/[id]', params: { id: nid } });
  }

  if (!entry) {
    return (
      <View style={styles.center}>
        <Text>加载中…</Text>
      </View>
    );
  }

  const hasDiscussion = !!entry.discussion && entry.discussion.length > 0;

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.head}>
          <View style={styles.headLeft}>
            <Text style={styles.date}>{entry.date}</Text>
            <Pressable
              onPress={() => router.push({ pathname: '/library/[id]', params: { id: entry.bookId } })}
              hitSlop={6}>
              <Text style={styles.bookTitle}>{book?.title ?? '未知书名'}</Text>
            </Pressable>
          </View>
          <Pressable hitSlop={10} onPress={() => setMenuOpen(true)} style={styles.menuBtn}>
            <Text style={styles.menuIcon}>⋯</Text>
          </Pressable>
        </View>

        {formatProgress(entry) ? <Text style={styles.progress}>{formatProgress(entry)}</Text> : null}
        <Text style={styles.comment}>{entry.comment}</Text>

        {!!entry.aiSummary && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>AI 总结</Text>
            <Text style={styles.summaryText}>{entry.aiSummary}</Text>
          </View>
        )}

        {hasDiscussion && (
          <Pressable onPress={() => setDiscussionOpen(true)} hitSlop={6}>
            <Text style={styles.viewDiscussion}>查看对话</Text>
          </Pressable>
        )}

        <View style={styles.actions}>
          <Pressable style={styles.actionBtn} onPress={() => router.push({ pathname: '/note/new', params: { entryId: id } })}>
            <Text style={styles.actionText}>编辑</Text>
          </Pressable>
          <Pressable style={[styles.actionBtn, styles.actionDanger]} onPress={onDelete}>
            <Text style={styles.actionText}>删除</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => setPickerOpen((v) => !v)}>
            <Text style={styles.actionText}>{pickerOpen ? '收起' : '关联其他笔记'}</Text>
          </Pressable>
        </View>

        {pickerOpen && (
          <View style={styles.picker}>
            <Text style={styles.sectionLabel}>选择要关联的笔记</Text>
            {others.length === 0 ? (
              <Text style={styles.empty}>还没有其他笔记可关联</Text>
            ) : (
              others.map((o) => (
                <Pressable key={o.id} style={styles.pickerItem} onPress={() => toggleLink(o.id)}>
                  <View style={styles.pickerText}>
                    <Text style={styles.pickerTitle} numberOfLines={1}>
                      {bookTitles[o.bookId] ?? '未知书名'} · {o.date}
                    </Text>
                    <Text style={styles.pickerComment} numberOfLines={1}>
                      {o.comment}
                    </Text>
                  </View>
                  <Text style={[styles.pickerStatus, linkedIds.has(o.id) && styles.pickerLinked]}>
                    {linkedIds.has(o.id) ? '已关联' : '＋ 关联'}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        )}

        {links.length > 0 && (
          <View style={styles.linksSection}>
            <Text style={styles.sectionLabel}>关联的笔记</Text>
            {links.map((l) => (
              <View key={l.id} style={styles.linkRow}>
                <Pressable style={styles.linkMain} onPress={() => openNote(l.id)}>
                  <Text style={styles.linkTitle} numberOfLines={1}>
                    {l.bookTitle} · {l.date}
                  </Text>
                  <Text style={styles.linkComment} numberOfLines={1}>
                    {l.comment}
                  </Text>
                </Pressable>
                <Pressable onPress={() => toggleLink(l.id)} hitSlop={8}>
                  <Text style={styles.removeText}>移除</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {backlinks.length > 0 && (
          <View style={styles.linksSection}>
            <Text style={styles.sectionLabel}>反向链接（哪些笔记关联了这条）</Text>
            {backlinks.map((l) => (
              <Pressable key={l.id} style={styles.linkRow} onPress={() => openNote(l.id)}>
                <View style={styles.linkMain}>
                  <Text style={styles.linkTitle} numberOfLines={1}>
                    {l.bookTitle} · {l.date}
                  </Text>
                  <Text style={styles.linkComment} numberOfLines={1}>
                    {l.comment}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {menuOpen && (
        <NoteMenu
          entry={entry}
          onChat={() => {
            setMenuOpen(false);
            router.push({ pathname: '/note/chat/[entryId]', params: { entryId: id! } });
          }}
          onEdit={() => {
            setMenuOpen(false);
            router.push({ pathname: '/note/new', params: { entryId: id! } });
          }}
          onDelete={() => {
            setMenuOpen(false);
            onDelete();
          }}
          onClose={() => setMenuOpen(false)}
        />
      )}

      <Modal visible={discussionOpen} animationType="slide" onRequestClose={() => setDiscussionOpen(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>对话记录</Text>
            <Pressable onPress={() => setDiscussionOpen(false)} hitSlop={10}>
              <Text style={styles.modalClose}>关闭</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {entry.discussion?.map((t, i) => (
              <View key={i} style={t.role === 'assistant' ? styles.bubbleAI : styles.bubbleUser}>
                <Text style={t.role === 'assistant' ? styles.bubbleTextAI : styles.bubbleTextUser}>
                  {t.text}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headLeft: { flex: 1, gap: 4 },
  bookTitle: { fontSize: 18, fontWeight: '700', color: '#208AEF' },
  date: { fontSize: 13, color: '#999' },
  menuBtn: { paddingHorizontal: 4, paddingVertical: 2 },
  menuIcon: { fontSize: 20, color: '#888', lineHeight: 22 },
  progress: { fontSize: 14, color: '#208AEF' },
  comment: { fontSize: 15, lineHeight: 24, color: '#222' },
  summaryBox: { backgroundColor: '#f4f6f8', borderRadius: 10, padding: 12, gap: 4 },
  summaryLabel: { fontSize: 12, color: '#888' },
  summaryText: { fontSize: 14, lineHeight: 21 },
  viewDiscussion: { fontSize: 15, color: '#208AEF', fontWeight: '500' },
  sectionLabel: { fontSize: 13, color: '#888', fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#208AEF', alignItems: 'center' },
  actionDanger: { backgroundColor: '#e74c3c' },
  actionText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  picker: { gap: 8, marginTop: 4 },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerText: { flex: 1 },
  pickerTitle: { fontSize: 14, fontWeight: '500' },
  pickerComment: { fontSize: 12, color: '#999', marginTop: 2 },
  pickerStatus: { fontSize: 13, color: '#208AEF', fontWeight: '600' },
  pickerLinked: { color: '#7CB342' },
  linksSection: { gap: 8, marginTop: 4 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  linkMain: { flex: 1 },
  linkTitle: { fontSize: 14, fontWeight: '500' },
  linkComment: { fontSize: 12, color: '#999', marginTop: 2 },
  removeText: { fontSize: 13, color: '#e74c3c', fontWeight: '600' },
  empty: { color: '#999', fontSize: 13 },
  modalRoot: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  modalClose: { fontSize: 15, color: '#208AEF', fontWeight: '600' },
  modalContent: { padding: 16, gap: 10 },
  bubbleAI: { alignSelf: 'flex-start', backgroundColor: '#f0f0f0', borderRadius: 12, padding: 10, maxWidth: '85%' },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: '#208AEF', borderRadius: 12, padding: 10, maxWidth: '85%' },
  bubbleTextAI: { fontSize: 14, lineHeight: 20, color: '#222' },
  bubbleTextUser: { fontSize: 14, lineHeight: 20, color: '#fff' },
});