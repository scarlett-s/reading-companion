import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { ReadingEntry } from '@/types';
import { formatProgress, segmentTags, segmentQuotes } from '@/utils';
import { Pressable } from '@/components/Pressable';
import { colors, spacing, radius, typography, shadow } from '@/theme';

export interface NoteCardProps {
  entry: ReadingEntry;
  title: string;
  expanded: boolean;
  hasAI: boolean;
  editing: boolean;
  onToggleExpand: () => void;
  onPressBook: () => void;
  onOpenMenu: (anchorRef: React.RefObject<View | null>) => void;
  onPressAI: () => void;
  onStartEdit: () => void;
  onSaveEdit: (comment: string) => void;
  onCancelEdit: () => void;
  /** 报告卡片在滚动容器里的 y 与高度（相对 content 原点），供父页面计算是否滚出屏幕 */
  onLayoutReport?: (id: string, y: number, height: number) => void;
  cardId: string;
}

export default function NoteCard({
  entry,
  title,
  expanded,
  hasAI,
  editing,
  onToggleExpand,
  onPressBook,
  onOpenMenu,
  onPressAI,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onLayoutReport,
  cardId,
}: NoteCardProps) {
  const menuRef = useRef<View>(null);
  // 双击检测：两次点击间隔 < 300ms 视为双击（进入编辑），否则单击切换展开
  const lastTapRef = useRef(0);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 编辑态草稿（只编辑正文）
  const [draftComment, setDraftComment] = useState('');

  useEffect(() => {
    if (editing) setDraftComment(entry.comment);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
    };
  }, []);

  const comment = entry.comment;
  const progress = formatProgress(entry);
  const aiSummary = entry.aiSummary;
  const long = comment.length > 80 || comment.includes('\n');

  function handleCardPress() {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // 双击 → 编辑
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      lastTapRef.current = 0;
      onStartEdit();
    } else {
      lastTapRef.current = now;
      singleTapTimerRef.current = setTimeout(() => {
        singleTapTimerRef.current = null;
        onToggleExpand();
      }, 300);
    }
  }

  // ===== 编辑态：卡片内直接编辑正文（白底，只改评论） =====
  if (editing) {
    return (
      <View
        onLayout={(e) => onLayoutReport?.(cardId, e.nativeEvent.layout.y, e.nativeEvent.layout.height)}
        style={styles.card}>
        <View style={styles.head}>
          <View style={styles.headLeft}>
            <Text style={styles.date}>{entry.date}</Text>
            <Pressable onPress={onPressBook} hitSlop={6}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            </Pressable>
          </View>
        </View>

        {progress ? <Text style={styles.progress}>{progress}</Text> : null}

        <View style={styles.editCommentWrap}>
          {/* 高亮层：与展示态同款内联标签样式 */}
          <Text style={styles.editCommentText}>
            {segmentTags(draftComment).map((seg, i) =>
              seg.tag ? (
                <Text key={i} style={styles.tagInline}>
                  {seg.text}
                </Text>
              ) : (
                seg.text
              )
            )}
          </Text>
          {/* 输入层：透明文字，仅显示光标，保证标签高亮与文字对齐 */}
          <TextInput
            style={styles.editCommentInput}
            value={draftComment}
            onChangeText={setDraftComment}
            placeholder="现在的想法"
            placeholderTextColor="#999"
            multiline
            autoFocus
            textAlignVertical="top"
            scrollEnabled={false}
            selectionColor="#208AEF"
            cursorColor="#208AEF"
          />
        </View>

        <View style={styles.editActions}>
          <Pressable onPress={onCancelEdit} hitSlop={8} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>取消</Text>
          </Pressable>
          <Pressable
            onPress={() => onSaveEdit(draftComment.trim())}
            disabled={!draftComment.trim()}
            style={[styles.saveBtn, !draftComment.trim() && styles.saveDisabled]}>
            <Text style={styles.saveText}>保存</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ===== 展示态 =====
  return (
    <View
      onLayout={(e) => onLayoutReport?.(cardId, e.nativeEvent.layout.y, e.nativeEvent.layout.height)}
      collapsable={false}>
      <Pressable style={styles.card} onPress={handleCardPress}>
        <View style={styles.head}>
          <View style={styles.headLeft}>
            <Text style={styles.date}>{entry.date}</Text>
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
            <SymbolView name="ellipsis" size={18} tintColor={colors.textSubtle} type="monochrome" />
          </Pressable>
        </View>

        {progress ? <Text style={styles.progress}>{progress}</Text> : null}

        <Text style={styles.comment} numberOfLines={expanded ? undefined : 4}>
          {segmentTags(comment).flatMap((seg, i) =>
            seg.tag
              ? [<Text key={i} style={styles.tagInline}>{seg.text}</Text>]
              : segmentQuotes(seg.text).map((q, j) =>
                  q.quote ? (
                    <Text key={`${i}-${j}`} style={styles.quote}>
                      {q.text}
                    </Text>
                  ) : (
                    q.text
                  )
                )
          )}
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
          {/* AI 图标：绿色 = 可发起对话，灰色 = 已对话过 */}
          <Pressable onPress={onPressAI} hitSlop={6} style={styles.aiWrap}>
            <View style={[styles.aiBadge, hasAI ? styles.aiUsed : styles.aiAvailable]}>
              <Text style={styles.aiText}>AI</Text>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg + 2,
    gap: spacing.sm + 2,
    ...shadow.subtle,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headLeft: { flex: 1, marginRight: spacing.sm, gap: spacing.xs },
  title: { ...typography.bodyStrong, fontSize: 16, color: colors.accent },
  date: { ...typography.micro, color: colors.textSubtle },
  menuBtn: { paddingHorizontal: spacing.xs, paddingVertical: spacing.xs / 2 },
  progress: { fontSize: 13, color: colors.accent },
  comment: { fontSize: 15, lineHeight: 27, color: colors.text },
  quote: {
    fontStyle: 'italic',
    color: colors.textMuted,
  },
  tagInline: {
    color: '#3B6B2E',
    backgroundColor: '#EFF3E8',
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingTop: 2,
    paddingBottom: 2,
    marginHorizontal: 1,
    overflow: 'hidden',
  },
  summary: { backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  summaryLabel: { ...typography.micro, color: colors.textSubtle, fontSize: 12 },
  summaryText: { fontSize: 14, lineHeight: 21 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  expandText: { fontSize: 14, color: colors.accent, fontWeight: '500' },
  aiWrap: {},
  aiBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9 },
  aiAvailable: { backgroundColor: colors.primary },
  aiUsed: { backgroundColor: colors.borderStrong },
  aiText: { fontSize: 12, color: colors.primaryText, fontWeight: '700' },
  // 编辑态：白底，只改正文；输入层透明 + 高亮层内联标签
  editCommentWrap: { position: 'relative', minHeight: 100 },
  editCommentText: { fontSize: 15, lineHeight: 27, color: colors.text },
  editCommentInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    fontSize: 15,
    lineHeight: 27,
    color: 'transparent',
    padding: 0,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.md + 2,
  },
  cancelBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs + 2 },
  cancelText: { ...typography.body, color: colors.textMuted },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  saveDisabled: { backgroundColor: colors.borderStrong },
  saveText: { color: colors.primaryText, fontWeight: '600', fontSize: 15 },
});