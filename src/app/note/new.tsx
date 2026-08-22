import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  InputAccessoryView,
  Platform,
  Keyboard,
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { getAllBooks, addEntry, updateEntry, getEntry, getBook, generateId } from '@/db';
import { todayString } from '@/utils';
import { Book, ReadingEntry } from '@/types';
import { Icon } from '@/components/Icon';

const SUBMIT_ID = 'note-new-submit';
const PAGE_BG = '#F3F5F2';
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
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
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
      setTags(e.tags ?? []);
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

  function addTag() {
    const t = tagInput.trim();
    if (!t) return;
    if (!tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput('');
  }

  function removeTag(t: string) {
    setTags((prev) => prev.filter((x) => x !== t));
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
        tags,
      });
      Keyboard.dismiss();
      router.back();
      return;
    }
    if (!selectedBook) return;
    setSaving(true);
    await addEntry({
      id: generateId(),
      bookId: selectedBook.id,
      date: todayString(),
      currentPage: unit === 'page' && progressValue.trim() ? Number(progressValue) : undefined,
      progressPercent: unit === 'percent' && progressValue.trim() ? Number(progressValue) : undefined,
      comment: comment.trim(),
      mode: 'plain',
      tags,
      createdAt: Date.now(),
    });
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
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={submit}
          disabled={!commentFilled || saving}
          hitSlop={8}
          style={[styles.checkBtn, (!commentFilled || saving) && styles.checkDisabled]}>
          <Icon name="check" size={20} color="#fff" />
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
            placeholderTextColor="#888"
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
              placeholderTextColor="#888"
              keyboardType="number-pad"
              inputAccessoryViewID={Platform.OS === 'ios' ? SUBMIT_ID : undefined}
            />
            <View style={styles.progressDivider} />
            <Pressable style={styles.unitToggle} onPress={() => setUnitMenuOpen((v) => !v)} hitSlop={6}>
              <Text style={styles.unitText}>{unit === 'page' ? '页' : '%'}</Text>
              <Text style={styles.unitCaret}>⌄</Text>
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
          placeholderTextColor="#888"
          multiline
          textAlignVertical="top"
          inputAccessoryViewID={Platform.OS === 'ios' ? SUBMIT_ID : undefined}
        />

        <View style={styles.tagField}>
          <Text style={styles.tagLabel}>标签</Text>
          <View style={styles.tagWrap}>
            {tags.map((t) => (
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
              placeholderTextColor="#888"
              returnKeyType="done"
            />
          </View>
        </View>
      </ScrollView>

      {accessory}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: PAGE_BG },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 56,
    paddingBottom: 6,
  },
  backBtn: { paddingHorizontal: 4, paddingVertical: 4 },
  backIcon: { fontSize: 28, color: '#222', lineHeight: 28 },
  checkBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7CB342',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDisabled: { backgroundColor: '#d0d0d0' },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 28, flexGrow: 1, paddingBottom: 48 },
  field: { position: 'relative' },
  input: {
    backgroundColor: '#fff',
    borderRadius: CARD_RADIUS,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 15,
    color: '#222',
  },
  dropdown: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: '#eee',
    zIndex: 10,
  },
  dropdownItem: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  dropdownTitle: { fontSize: 15, fontWeight: '500' },
  dropdownAuthor: { fontSize: 12, color: '#888', marginTop: 1 },
  addNew: { fontSize: 14, color: '#208AEF', fontWeight: '600' },
  progressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: CARD_RADIUS,
    paddingLeft: 18,
  },
  progressInput: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#222' },
  progressDivider: { width: 1, height: 20, backgroundColor: '#e0e0e0', marginHorizontal: 12 },
  unitToggle: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unitText: { fontSize: 15, color: '#222' },
  unitCaret: { fontSize: 14, color: '#888', marginTop: -2 },
  unitMenu: {
    position: 'absolute',
    top: 60,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
    minWidth: 100,
    zIndex: 10,
  },
  unitItem: { paddingHorizontal: 18, paddingVertical: 12 },
  unitItemActive: { backgroundColor: '#f4f6f8' },
  unitItemText: { fontSize: 15, color: '#222' },
  unitItemTextActive: { color: '#7CB342', fontWeight: '600' },
  commentInput: {
    backgroundColor: '#fff',
    borderRadius: CARD_RADIUS,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: '#222',
    flex: 1,
  },
  tagField: { gap: 8 },
  tagLabel: { fontSize: 13, color: '#888' },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: CARD_RADIUS,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#eef3f8',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: { fontSize: 13, color: '#4a7c9a' },
  tagRemove: { fontSize: 15, color: '#999', marginLeft: 2 },
  tagInput: { flex: 1, minWidth: 100, paddingVertical: 6, fontSize: 14, color: '#222' },
  accessory: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
});