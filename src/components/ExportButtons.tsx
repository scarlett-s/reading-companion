import { View, Text, StyleSheet } from 'react-native';
import { shareText } from '@/share';
import { Pressable } from '@/components/Pressable';
import { colors, spacing, radius, typography } from '@/theme';

export type ExportFormat = 'txt' | 'md' | 'html';

const FORMATS: { key: ExportFormat; label: string; ext: string; mime: string }[] = [
  { key: 'txt', label: '纯文本', ext: 'txt', mime: 'text/plain' },
  { key: 'md', label: 'Markdown', ext: 'md', mime: 'text/markdown' },
  { key: 'html', label: 'HTML', ext: 'html', mime: 'text/html' },
];

export default function ExportButtons({
  filename,
  getContent,
}: {
  filename: string;
  getContent: (format: ExportFormat) => string;
}) {
  async function doExport(f: (typeof FORMATS)[number]) {
    try {
      await shareText(`${filename}.${f.ext}`, getContent(f.key), f.mime);
    } catch (e) {
      console.error('导出失败', e);
    }
  }

  return (
    <View style={styles.row}>
      {FORMATS.map((f) => (
        <Pressable key={f.key} style={styles.btn} onPress={() => doExport(f)}>
          <Text style={styles.text}>{f.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  btn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
  },
  text: { color: colors.accent, ...typography.bodyStrong, fontSize: 14 },
});
