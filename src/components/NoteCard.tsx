import { useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

export interface NoteCardProps {
  title: string;
  date: string;
  comment: string;
  progress?: string;
  aiSummary?: string;
  expanded: boolean;
  hasAI: boolean;
  onToggleExpand: () => void;
  onPressBook: () => void;
  onOpenMenu: (anchorRef: React.RefObject<View | null>) => void;
  onPressAI: () => void;
}

export default function NoteCard({
  title,
  date,
  comment,
  progress,
  aiSummary,
  expanded,
  hasAI,
  onToggleExpand,
  onPressBook,
  onOpenMenu,
  onPressAI,
}: NoteCardProps) {
  const long = comment.length > 80 || comment.includes('\n');
  const menuRef = useRef<View>(null);
  return (
    <Pressable style={styles.card} onPress={onToggleExpand}>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <Text style={styles.date}>{date}</Text>
          <Pressable onPress={onPressBook} hitSlop={6}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </Pressable>
        </View>
        <Pressable
          ref={menuRef}
          hitSlop={10}
          onPress={() => onOpenMenu(menuRef)}
          style={styles.menuBtn}>
          <Text style={styles.menuIcon}>⋯</Text>
        </Pressable>
      </View>

      {progress ? <Text style={styles.progress}>{progress}</Text> : null}

      <Text style={styles.comment} numberOfLines={expanded ? undefined : 4}>
        {comment}
      </Text>

      {expanded && !!aiSummary && (
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>AI 总结</Text>
          <Text style={styles.summaryText}>{aiSummary}</Text>
        </View>
      )}

      <View style={styles.footerRow}>
        {long ? (
          <Pressable onPress={onToggleExpand} hitSlop={6}>
            <Text style={styles.expandText}>{expanded ? '收起' : '展开'}</Text>
          </Pressable>
        ) : (
          <View />
        )}
        <Pressable onPress={onPressAI} disabled={!hasAI} hitSlop={6}>
          <View style={[styles.aiBadge, hasAI ? styles.aiActive : styles.aiInactive]}>
            <Text style={styles.aiText}>AI</Text>
          </View>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headLeft: { flex: 1, marginRight: 8, gap: 4 },
  title: { fontSize: 16, fontWeight: '600', color: '#208AEF' },
  date: { fontSize: 12, color: '#999' },
  menuBtn: { paddingHorizontal: 4, paddingVertical: 2 },
  menuIcon: { fontSize: 20, color: '#888', lineHeight: 22 },
  progress: { fontSize: 13, color: '#208AEF' },
  comment: { fontSize: 15, lineHeight: 27, color: '#222' },
  summary: { backgroundColor: '#f4f6f8', borderRadius: 10, padding: 12, gap: 4 },
  summaryLabel: { fontSize: 12, color: '#888' },
  summaryText: { fontSize: 14, lineHeight: 21 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  expandText: { fontSize: 14, color: '#208AEF', fontWeight: '500' },
  aiBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 9 },
  aiActive: { backgroundColor: '#7CB342' },
  aiInactive: { backgroundColor: '#dcdcdc' },
  aiText: { fontSize: 12, color: '#fff', fontWeight: '700' },
});