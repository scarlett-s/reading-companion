import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { getSettings, saveSetting } from '@/db';
import { AISettings } from '@/types';

const DEEPSEEK: AISettings = { baseUrl: 'https://api.deepseek.com', apiKey: '', model: 'deepseek-chat' };
const OLLAMA: AISettings = { baseUrl: 'http://localhost:11434/v1', apiKey: '', model: 'llama3' };

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AISettings>({ baseUrl: '', apiKey: '', model: '' });
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
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>AI 配置</Text>
      <Text style={styles.hint}>
        Discuss 与「整理」需要 AI。DeepSeek 需填 API Key；Ollama 本地可离线、无需 Key。
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

      <Pressable style={styles.saveBtn} onPress={save}>
        <Text style={styles.saveText}>{saved ? '已保存 ✓' : '保存'}</Text>
      </Pressable>
    </ScrollView>
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
});
