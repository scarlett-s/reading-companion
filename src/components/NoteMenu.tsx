import { View, Text, Pressable, StyleSheet } from 'react-native';
import { entryHasAI } from '@/utils';
import { ReadingEntry } from '@/types';

export interface NoteMenuProps {
  entry: ReadingEntry;
  onChat: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

/** 卡片右上「…」打开的白卡菜单（ref-editcard 风格） */
export default function NoteMenu({ entry, onChat, onEdit, onDelete, onClose }: NoteMenuProps) {
  const hasAI = entryHasAI(entry);
  return (
    <View style={styles.root} pointerEvents="auto">
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.panel}>
        <Pressable
          style={[styles.item, hasAI && styles.itemDisabled]}
          disabled={hasAI}
          onPress={onChat}>
          <Text style={[styles.itemText, hasAI ? styles.textDisabled : styles.textChat]}>AI 对话</Text>
        </Pressable>
        <Pressable style={styles.item} onPress={onEdit}>
          <Text style={styles.itemText}>编辑</Text>
        </Pressable>
        <Pressable style={styles.item} onPress={onDelete}>
          <Text style={[styles.itemText, styles.textDanger]}>删除</Text>
        </Pressable>
        <View style={styles.meta}>
          <Text style={styles.metaText}>字数统计：{entry.comment?.length ?? 0}</Text>
          <Text style={styles.metaText}>最后编辑：{formatTs(entry.createdAt)}</Text>
        </View>
      </View>
    </View>
  );
}

function formatTs(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  panel: {
    position: 'absolute',
    right: 16,
    top: 60,
    minWidth: 180,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  item: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
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
});