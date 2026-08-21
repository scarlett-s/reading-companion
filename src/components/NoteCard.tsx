import { View, Text, Pressable, StyleSheet } from 'react-native';

export interface NoteCardProps {
  title: string;
  date: string;
  comment: string;
  progress?: string;
  expanded: boolean;
  hasAI: boolean;
  onPress: () => void;
  onPressBook: () => void;
  onToggleExpand: () => void;
  onOpenMenu: () => void;
}

export default function NoteCard({
  title,
  date,
  comment,
  progress,
  expanded,
  hasAI,
  onPress,
  onPressBook,
  onToggleExpand,
  onOpenMenu,
}: NoteCardProps) {
  const truncated = comment.length > 80 || comment.includes('\n');
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <Text style={styles.date}>{date}</Text>
          <Pressable onPress={onPressBook} hitSlop={6} style={styles.titleWrap}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </Pressable>
        </View>
        <Pressable hitSlop={10} onPress={onOpenMenu} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>⋯</Text>
        </Pressable>
      </View>

      {progress ? <Text style={styles.progress}>{progress}</Text> : null}

      <Text style={styles.comment} numberOfLines={expanded ? undefined : 4}>
        {comment}
      </Text>

      {truncated && (
        <Pressable onPress={onToggleExpand} hitSlop={6}>
          <Text style={styles.expandText}>{expanded ? '收起' : '展开'}</Text>
        </Pressable>
      )}

      <View style={styles.footer}>
        {hasAI ? (
          <View style={[styles.aiBadge, styles.aiActive]}>
            <Text style={styles.aiTextActive}>AI</Text>
          </View>
        ) : (
          <View style={[styles.aiBadge, styles.aiInactive]}>
            <Text style={styles.aiTextInactive}>AI</Text>
          </View>
        )}
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
  titleWrap: {},
  title: { fontSize: 16, fontWeight: '600', color: '#208AEF' },
  date: { fontSize: 12, color: '#999' },
  menuBtn: { paddingHorizontal: 4, paddingVertical: 2 },
  menuIcon: { fontSize: 20, color: '#888', lineHeight: 22 },
  progress: { fontSize: 13, color: '#208AEF' },
  comment: { fontSize: 15, lineHeight: 24, color: '#222' },
  expandText: { fontSize: 14, color: '#208AEF', fontWeight: '500' },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  aiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  aiActive: { backgroundColor: '#7CB342' },
  aiInactive: { backgroundColor: '#dcdcdc' },
  aiTextActive: { fontSize: 11, color: '#fff', fontWeight: '700' },
  aiTextInactive: { fontSize: 11, color: '#fff', fontWeight: '700' },
});