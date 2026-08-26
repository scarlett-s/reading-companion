import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getSettings, saveSetting, getAllBooks, getAllEntries } from '@/db';
import { allBooksToMarkdown, markdownToPlainText, markdownToHtml } from '@/export';
import { AISettings, Book, ReadingEntry } from '@/types';
import ExportButtons from '@/components/ExportButtons';

const DEEPSEEK: AISettings = { baseUrl: 'https://api.deepseek.com', apiKey: '', model: 'deepseek-chat', embeddingModel: '' };
const OLLAMA: AISettings = { baseUrl: 'http://localhost:11434/v1', apiKey: '', model: 'llama3', embeddingModel: 'nomic-embed-text' };

export default function SettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<AISettings>({ baseUrl: '', apiKey: '', model: '', embeddingModel: '' });
  const [saved, setSaved] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [entriesByBook, setEntriesByBook] = useState<Record<string, ReadingEntry[]>>({});

  useEffect(() => {
    getSettings().then((s) => setSettings((prev) => ({ ...prev, ...s })));
    Promise.all([getAllBooks(), getAllEntries()]).then(([bs, es]) => {
      setBooks(bs);
      const map: Record<string, ReadingEntry[]> = {};
      for (const e of es) (map[e.bookId] ??= []).push(e);
      setEntriesByBook(map);
    });
  }, []);

  function set<K extends keyof AISettings>(key: K, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function applyPreset(preset: AISettings) {
    setSettings((prev) => ({ ...preset, apiKey: prev.apiKey }));
  }

  async function save() {
    await saveSetting('baseUrl', settings.baseUrl.trim());
    await saveSetting('apiKey', settings.apiKey.trim());
    await saveSetting('model', settings.model.trim());
    await saveSetting('embeddingModel', settings.embeddingModel.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>AI 配置</Text>
      <Text style={styles.hint}>
        「与 AI 聊天」与「洞察报告」需要 AI。DeepSeek 需填 API Key；Ollama 本地可离线、无需 Key。
      </Text>

      <View style={styles.presetRow}>
        <PresetButton label="DeepSeek" onPress={() => applyPreset(DEEPSEEK)} />
        <PresetButton label="Ollama（本地）" onPress={() => applyPreset(OLLAMA)} />
      </View>

      <Field
        label="接口地址 baseUrl"
        value={settings.baseUrl}
        onChange={(v) => set('baseUrl', v)}
        placeholder="https://api.deepseek.com"
      />
      <Field
        label="API Key"
        value={settings.apiKey}
        onChange={(v) => set('apiKey', v)}
        placeholder="sk-...（Ollama 可留空）"
      />
      <Field
        label="模型 model"
        value={settings.model}
        onChange={(v) => set('model', v)}
        placeholder="deepseek-chat"
      />
      <Field
        label="Embedding 模型"
        value={settings.embeddingModel}
        onChange={(v) => set('embeddingModel', v)}
        placeholder="nomic-embed-text / text-embedding-3-small（留空自动判断）"
      />
      <Text style={styles.hint}>
        Embedding 用于「跟 AI 聊聊」时检索相关历史笔记。Ollama 可用 nomic-embed-text（离线免费）；OpenAI 用 text-embedding-3-small；DeepSeek 暂无 embedding 接口，留空即可（自动跳过）。
      </Text>

      <Pressable style={styles.saveBtn} onPress={save}>
        <Text style={styles.saveText}>{saved ? '已保存 ✓' : '保存'}</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>导出全部笔记</Text>
      <ExportButtons
        filename="全部笔记"
        getContent={(format) => {
          const md = allBooksToMarkdown(books, entriesByBook);
          if (format === 'md') return md;
          if (format === 'html') return markdownToHtml(md);
          return markdownToPlainText(md);
        }}
      />

      {__DEV__ && (
        <>
          <Text style={styles.sectionTitle}>开发者</Text>
          <Pressable style={styles.diagBtn} onPress={() => router.push('/diagnostics')}>
            <Text style={styles.diagText}>🔬 诊断 / 测试（Embedding & RAG）</Text>
          </Pressable>
        </>
      )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PresetButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.presetBtn} onPress={onPress}>
      <Text style={styles.presetText}>{label}</Text>
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 16 },
  title: { fontSize: 22, fontWeight: '600' },
  hint: { fontSize: 13, color: '#666', lineHeight: 19 },
  presetRow: { flexDirection: 'row', gap: 12 },
  presetBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f7f7f7',
  },
  presetText: { fontSize: 14 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, color: '#555' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  saveBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  diagBtn: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
  },
  diagText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
