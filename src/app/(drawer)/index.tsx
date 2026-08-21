import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getAllEntries, getAllBooks, deleteEntry } from '@/db';
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

  function openMenu(id: string) {
    setMenuEntryId(id);
  }

  function closeMenu() {
    setMenuEntryId(null);
  }

  async function onDelete(entryId: string) {
    Alert.alert('删除笔记', '确定删除这条笔记吗？删除后不可恢复。', [
      { text: '取消', style: 'cancel', onPress: closeMenu },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteEntry(entryId);
          closeMenu();
          load();
        },
      },
    ]);
  }

  const menuEntry = menuEntryId ? notes.find((n) => n.id === menuEntryId)?.entry : null;

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
              expanded={!!expanded[n.id]}
              hasAI={entryHasAI(n.entry)}
              onPress={() => router.push({ pathname: '/note/[id]', params: { id: n.id } })}
              onPressBook={() => router.push({ pathname: '/library/[id]', params: { id: n.bookId } })}
              onToggleExpand={() => toggleExpand(n.id)}
              onOpenMenu={() => openMenu(n.id)}
            />
          ))
        )}
      </ScrollView>
      <Pressable style={styles.fab} onPress={() => router.push('/note/new')}>
        <Text style={styles.fabText}>＋</Text>
      </Pressable>
      {menuEntry && (
        <NoteMenu
          entry={menuEntry}
          onChat={() => {
            closeMenu();
            router.push({ pathname: '/note/chat/[entryId]', params: { entryId: menuEntry.id } });
          }}
          onEdit={() => {
            closeMenu();
            router.push({ pathname: '/note/new', params: { entryId: menuEntry.id } });
          }}
          onDelete={() => onDelete(menuEntry.id)}
          onClose={closeMenu}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0f0f0' },
  content: { padding: 16, gap: 16 },
  empty: { color: '#999', textAlign: 'center', marginTop: 40 },
  fab: {
    position: 'absolute',
    bottom: 28,
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
});