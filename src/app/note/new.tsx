import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  InputAccessoryView,
  Platform,
  Keyboard,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { getAllBooks, addEntry, updateEntry, getEntry, getBook, generateId } from '@/db';
import { onEntrySaved } from '@/embedding';
import { todayString } from '@/utils';
import { Book, ReadingEntry } from '@/types';
import { Icon } from '@/components/Icon';
import { Pressable } from '@/components/Pressable';
import { colors, spacing, radius, typography, shadow } from '@/theme';

const SUBMIT_ID = 'note-new-submit';
const CARD_RADIUS = 16;

type Unit = 'page' | 'percent';

export default function NewNoteScreen() {
  const router = useRouter();
  const { entryId } = useLocalSearchParams<{ entryId?: string }>();
  const editing = !!entryId;

  const [books, setBooks] = useState<Book[]>([]);
  const [original, setOriginal] = useState<ReadingEntry | null>(null);
  const [bookQuery, setBookQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [unit, setUnit] = useState<Unit>('page');
  const [unitMenuOpen, setUnitMenuOpen] = useState(false);
  const [progressValue, setProgressValue] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getAllBooks().then(setBooks);
    }, [])
  );

  useEffect(() => {
    if (!entryId) return;
    (async () => {
      const e = await getEntry(entryId);
      if (!e) return;
      setOriginal(e);
      const b = await getBook(e.bookId);
      if (b) {
        setSelectedBook(b);
        setBookQuery(b.title);
      }
      if (e.progressPercent != null) {
        setUnit('percent');
        setProgressValue(String(e.progressPercent));
      } else if (e.currentPage != null) {
        setUnit('page');
        setProgressValue(String(e.currentPage));
      }
      setComment(e.comment);
    })();
  }, [entryId]);

  const matches = useMemo(() => {
    const q = bookQuery.trim().toLowerCase();
    if (!q || selectedBook) return [];
    return books
      .filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q))
      .slice(0, 5);
  }, [bookQuery, books, selectedBook]);

  function selectBook(b: Book) {
    setSelectedBook(b);
    setBookQuery(b.title);
  }

  const commentFilled = comment.trim().length > 0;

  async function submit() {
    if (editing && original && selectedBook) {
      setSaving(true);
      await updateEntry(original.id, {
        bookId: selectedBook.id,
        date: original.date,
        currentPage: unit === 'page' && progressValue.trim() ? Number(progressValue) : undefined,
        progressPercent: unit === 'percent' && progressValue.trim() ? Number(progressValue) : undefined,
        comment: comment.trim(),
      });
      void onEntrySaved(original.id);
      Keyboard.dismiss();
      router.back();
      return;
    }
    if (!selectedBook) return;
    setSaving(true);
    const id = generateId();
    await addEntry({
      id,
      bookId: selectedBook.id,
      date: todayString(),
      currentPage: unit === 'page' && progressValue.trim() ? Number(progressValue) : undefined,
      progressPercent: unit === 'percent' && progressValue.trim() ? Number(progressValue) : undefined,
      comment: comment.trim(),
      mode: 'plain',
      createdAt: Date.now(),
    });
    void onEntrySaved(id);
    Keyboard.dismiss();
    router.back();
  }

  const accessory = Platform.OS === 'ios' && (
    <InputAccessoryView nativeID={SUBMIT_ID}>
      <View style={styles.accessory}>
        <View style={styles.toolbar}>
          <Icon name="bold" size={18} />
          <Icon name="italic" size={18} />
          <Icon name="underline" size={18} />
          <Icon name="list" size={18} />
          <Icon name="hash" size={18} />
          <Icon name="image" size={18} />
        </View>
      </View>
    </InputAccessoryView>
  );

  return (
    <View style={styles.page}>
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <SymbolView name="chevron.left" size={26} tintColor={colors.text} type="monochrome" />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={submit}
          disabled={!commentFilled || saving}
          hitSlop={8}
          scale={0.92}
          style={[styles.checkBtn, (!commentFilled || saving) && styles.checkDisabled]}>
          <SymbolView name="checkmark" size={20} tintColor={colors.primaryText} type="monochrome" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <TextInput
            style={styles.input}
            value={bookQuery}
            onChangeText={(t) => {
              setBookQuery(t);
              setSelectedBook(null);
            }}
            placeholder="书名"
            placeholderTextColor={colors.textSubtle}
            autoCorrect={false}
          />
          {!selectedBook && bookQuery.trim().length > 0 && (
            <View style={styles.dropdown}>
              {matches.map((b) => (
                <Pressable key={b.id} style={styles.dropdownItem} onPress={() => selectBook(b)}>
                  <Text style={styles.dropdownTitle} numberOfLines={1}>
                    {b.title}
                  </Text>
                  <Text style={styles.dropdownAuthor}>{b.author}</Text>
                </Pressable>
              ))}
              <Pressable style={styles.dropdownItem} onPress={() => router.push('/library/add')}>
                <Text style={styles.addNew}>＋ 添加新图书</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.field}>
          <View style={styles.progressPill}>
            <TextInput
              style={styles.progressInput}
              value={progressValue}
              onChangeText={setProgressValue}
              placeholder="阅读进度"
              placeholderTextColor={colors.textSubtle}
              keyboardType="number-pad"
              inputAccessoryViewID={Platform.OS === 'ios' ? SUBMIT_ID : undefined}
            />
            <View style={styles.progressDivider} />
            <Pressable style={styles.unitToggle} onPress={() => setUnitMenuOpen((v) => !v)} hitSlop={6}>
              <Text style={styles.unitText}>{unit === 'page' ? '页' : '%'}</Text>
              <SymbolView name="chevron.down" size={12} tintColor={colors.textSubtle} type="monochrome" />
            </Pressable>
          </View>
          {unitMenuOpen && (
            <View style={styles.unitMenu}>
              {(['page', 'percent'] as Unit[]).map((u) => (
                <Pressable
                  key={u}
                  style={[styles.unitItem, u === unit && styles.unitItemActive]}
                  onPress={() => {
                    setUnit(u);
                    setUnitMenuOpen(false);
                  }}>
                  <Text style={[styles.unitItemText, u === unit && styles.unitItemTextActive]}>
                    {u === 'page' ? '页' : '%'}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <TextInput
          style={styles.commentInput}
          value={comment}
          onChangeText={setComment}
          placeholder="现在的想法"
          placeholderTextColor={colors.textSubtle}
          multiline
          textAlignVertical="top"
          inputAccessoryViewID={Platform.OS === 'ios' ? SUBMIT_ID : undefined}
          selectionColor={colors.accent}
          cursorColor={colors.accent}
        />
      </ScrollView>

      {accessory}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 56,
    paddingBottom: spacing.xs + 2,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  checkBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDisabled: { backgroundColor: colors.borderStrong },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.xxl + 4, flexGrow: 1, paddingBottom: spacing.xxxxl + 8 },
  field: { position: 'relative' },
  input: {
    backgroundColor: colors.surface,
    borderRadius: CARD_RADIUS,
    paddingHorizontal: spacing.lg + 2,
    paddingVertical: spacing.md + 2,
    fontSize: 15,
    color: colors.text,
  },
  dropdown: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 10,
    ...shadow.card,
  },
  dropdownItem: {
    paddingHorizontal: spacing.lg + 2,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownTitle: { ...typography.body, fontSize: 15, fontWeight: '500', color: colors.text },
  dropdownAuthor: { fontSize: 12, color: colors.textSubtle, marginTop: 1 },
  addNew: { ...typography.body, fontSize: 14, color: colors.accent, fontWeight: '600' },
  progressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: CARD_RADIUS,
    paddingLeft: spacing.lg + 2,
  },
  progressInput: { flex: 1, paddingVertical: spacing.md + 2, fontSize: 15, color: colors.text },
  progressDivider: { width: 1, height: 20, backgroundColor: colors.borderStrong, marginHorizontal: spacing.md },
  unitToggle: {
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  unitText: { ...typography.body, fontSize: 15, color: colors.text },
  unitMenu: {
    position: 'absolute',
    top: 60,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    minWidth: 100,
    zIndex: 10,
    ...shadow.card,
  },
  unitItem: { paddingHorizontal: spacing.lg + 2, paddingVertical: spacing.md },
  unitItemActive: { backgroundColor: colors.surfaceMuted },
  unitItemText: { ...typography.body, fontSize: 15, color: colors.text },
  unitItemTextActive: { color: colors.primary, fontWeight: '600' },
  commentInput: {
    backgroundColor: colors.surface,
    borderRadius: CARD_RADIUS,
    paddingHorizontal: spacing.lg + 2,
    paddingVertical: spacing.lg,
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  accessory: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
});