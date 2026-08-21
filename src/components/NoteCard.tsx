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
  /** 报告卡片在滚动容器里的 y 与高度（相对 content 原点），供父页面计算是否滚出屏幕 */
  onLayoutReport?: (id: string, y: number, height: number) => void;
  cardId: string;
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
  onLayoutReport,
  cardId,
}: NoteCardProps) {
  const long = comment.length > 80 || comment.includes('\n');
  const menuRef = useRef<View>(null);

  return (
    <View
      onLayout={(e) => onLayoutReport?.(cardId, e.nativeEvent.layout.y, e.nativeEvent.layout.height)}
      collapsable={false}>
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
          {hasAI ? (
            <Pressable onPress={onPressAI} hitSlop={6} style={styles.aiWrap}>
              <View style={[styles.aiBadge, styles.aiActive]}>
                <Text style={styles.aiText}>AI</Text>
              </View>
            </Pressable>
          ) : (
            <View onStartShouldSetResponder={() => true} style={styles.aiWrap}>
              <View style={[styles.aiBadge, styles.aiInactive]}>
                <Text style={styles.aiText}>AI</Text>
              </View>
            </View>
          )}
        </View>
      </Pressable>
    </View>
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
  aiWrap: {},
  aiBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 9 },
  aiActive: { backgroundColor: '#7CB342' },
  aiInactive: { backgroundColor: '#dcdcdc' },
  aiText: { fontSize: 12, color: '#fff', fontWeight: '700' },
});