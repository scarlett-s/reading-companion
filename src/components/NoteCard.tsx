import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { ReadingEntry } from '@/types';
import { formatProgress } from '@/utils';

/** 内联编辑提交的字段 */
export interface EditFields {
  comment: string;
  currentPage?: number;
  progressPercent?: number;
  tags: string[];
}

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
  onSaveEdit: (fields: EditFields) => void;
  onCancelEdit: () => void;
  /** 报告卡片在滚动容器里的 y 与高度（相对 content 原点），供父页面计算是否滚出屏幕 */
  onLayoutReport?: (id: string, y: number, height: number) => void;
  cardId: string;
}

type Unit = 'page' | 'percent';

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

  // 编辑态草稿
  const [draftComment, setDraftComment] = useState('');
  const [draftUnit, setDraftUnit] = useState<Unit>('page');
  const [draftProgress, setDraftProgress] = useState('');
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (!editing) return;
    setDraftComment(entry.comment);
    if (entry.progressPercent != null) {
      setDraftUnit('percent');
      setDraftProgress(String(entry.progressPercent));
    } else if (entry.currentPage != null) {
      setDraftUnit('page');
      setDraftProgress(String(entry.currentPage));
    } else {
      setDraftUnit('page');
      setDraftProgress('');
    }
    setDraftTags(entry.tags ?? []);
    setTagInput('');
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

  function save() {
    onSaveEdit({
      comment: draftComment.trim(),
      currentPage: draftUnit === 'page' && draftProgress.trim() ? Number(draftProgress) : undefined,
      progressPercent: draftUnit === 'percent' && draftProgress.trim() ? Number(draftProgress) : undefined,
      tags: draftTags,
    });
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t) return;
    if (!draftTags.includes(t)) setDraftTags((prev) => [...prev, t]);
    setTagInput('');
  }

  function removeTag(t: string) {
    setDraftTags((prev) => prev.filter((x) => x !== t));
  }

  // ===== 编辑态：卡片内直接编辑 =====
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

        <View style={styles.progressPill}>
          <TextInput
            style={styles.progressInput}
            value={draftProgress}
            onChangeText={setDraftProgress}
            placeholder="阅读进度"
            placeholderTextColor="#999"
            keyboardType="number-pad"
          />
          <View style={styles.progressDivider} />
          <Pressable
            style={styles.unitToggle}
            onPress={() => setDraftUnit((u) => (u === 'page' ? 'percent' : 'page'))}
            hitSlop={6}>
            <Text style={styles.unitText}>{draftUnit === 'page' ? '页' : '%'}</Text>
          </Pressable>
        </View>

        <TextInput
          style={styles.editComment}
          value={draftComment}
          onChangeText={setDraftComment}
          placeholder="现在的想法"
          placeholderTextColor="#999"
          multiline
          autoFocus
          textAlignVertical="top"
        />

        <View style={styles.tagWrap}>
          {draftTags.map((t) => (
            <Pressable key={t} style={styles.tag} onPress={() => removeTag(t)} hitSlop={4}>
              <Text style={styles.tagText}>#{t}</Text>
              <Text style={styles.tagRemove}>×</Text>
            </Pressable>
          ))}
          <TextInput
            style={styles.tagInput}
            value={tagInput}
            onChangeText={setTagInput}
            onSubmitEditing={addTag}
            placeholder="添加标签"
            placeholderTextColor="#999"
            returnKeyType="done"
          />
        </View>

        <View style={styles.editActions}>
          <Pressable onPress={onCancelEdit} hitSlop={8} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>取消</Text>
          </Pressable>
          <Pressable
            onPress={save}
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
            <Text style={styles.menuIcon}>⋯</Text>
          </Pressable>
        </View>

        {progress ? <Text style={styles.progress}>{progress}</Text> : null}

        <Text style={styles.comment} numberOfLines={expanded ? undefined : 4}>
          {comment}
        </Text>

        {!!entry.tags && entry.tags.length > 0 && (
          <View style={styles.tagWrap}>
            {entry.tags.map((t) => (
              <View key={t} style={styles.tag}>
                <Text style={styles.tagText}>#{t}</Text>
              </View>
            ))}
          </View>
        )}

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
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#eef3f8',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tagText: { fontSize: 13, color: '#4a7c9a' },
  tagRemove: { fontSize: 15, color: '#999', marginLeft: 2 },
  summary: { backgroundColor: '#f4f6f8', borderRadius: 10, padding: 12, gap: 4 },
  summaryLabel: { fontSize: 12, color: '#888' },
  summaryText: { fontSize: 14, lineHeight: 21 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  expandText: { fontSize: 14, color: '#208AEF', fontWeight: '500' },
  aiWrap: {},
  aiBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 9 },
  aiAvailable: { backgroundColor: '#7CB342' },
  aiUsed: { backgroundColor: '#dcdcdc' },
  aiText: { fontSize: 12, color: '#fff', fontWeight: '700' },
  // 编辑态
  progressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f6f8',
    borderRadius: 12,
    paddingLeft: 14,
  },
  progressInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: '#222' },
  progressDivider: { width: 1, height: 20, backgroundColor: '#e0e0e0', marginHorizontal: 12 },
  unitToggle: { paddingHorizontal: 14, paddingVertical: 10 },
  unitText: { fontSize: 15, color: '#222' },
  editComment: {
    backgroundColor: '#f4f6f8',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#222',
    minHeight: 100,
  },
  tagInput: { flex: 1, minWidth: 90, paddingVertical: 6, fontSize: 14, color: '#222' },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 14,
  },
  cancelBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  cancelText: { fontSize: 15, color: '#888' },
  saveBtn: { backgroundColor: '#7CB342', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 8 },
  saveDisabled: { backgroundColor: '#c5c5c5' },
  saveText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});