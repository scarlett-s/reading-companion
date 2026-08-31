import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { getSettings, saveSetting } from '@/db';
import { AISettings } from '@/types';
import { Pressable } from '@/components/Pressable';
import { colors, spacing, radius, typography } from '@/theme';

const DEEPSEEK: AISettings = { baseUrl: 'https://api.deepseek.com', apiKey: '', model: 'deepseek-chat', embeddingModel: '' };
const OLLAMA: AISettings = { baseUrl: 'http://localhost:11434/v1', apiKey: '', model: 'llama3', embeddingModel: 'nomic-embed-text' };

export default function AIConfigScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<AISettings>({ baseUrl: '', apiKey: '', model: '', embeddingModel: '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then((s) => setSettings((prev) => ({ ...prev, ...s })));
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
    <View style={styles.root}>
      {/* 顶部 nav bar：< | AI 配置 | 占位 */}
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.navBtn}>
          <SymbolView name="chevron.left" size={24} tintColor={colors.text} type="monochrome" />
        </Pressable>
        <View style={styles.navTitleLayer} pointerEvents="none">
          <Text style={styles.navTitle}>AI 配置</Text>
        </View>
        <View style={styles.navBtn} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
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
            <Text style={styles.saveText}>{saved ? '已保存' : '保存'}</Text>
          </Pressable>
          {saved && (
            <Text style={styles.savedHint}>已保存到本地，立即生效</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
        placeholderTextColor={colors.textSubtle}
        autoCapitalize="none"
        autoCorrect={false}
        selectionColor={colors.accent}
        cursorColor={colors.accent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  // Nav bar
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    paddingHorizontal: spacing.sm + 2,
  },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  navTitleLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },

  // Form
  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
  hint: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  presetRow: { flexDirection: 'row', gap: spacing.md },
  presetBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md - 2,
    borderRadius: radius.md - 2,
    backgroundColor: colors.surface,
  },
  presetText: { fontSize: 14, color: colors.text },
  field: { gap: spacing.xs + 2 },
  fieldLabel: { ...typography.caption, fontSize: 13, color: colors.textMuted },
  input: {
    borderRadius: radius.md - 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    fontSize: 15,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md - 2,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  saveText: { color: colors.primaryText, fontSize: 16, fontWeight: '600' },
  savedHint: { color: colors.primary, fontSize: 13, textAlign: 'center' },
});
