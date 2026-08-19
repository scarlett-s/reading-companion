import { View, Text, StyleSheet } from 'react-native';

export default function NewNoteScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>新增笔记</Text>
      <Text style={styles.hint}>T15 实现（书名 / 进度 / 笔记 + 提交 / 与 AI 聊天）</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff', padding: 16, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700' },
  hint: { marginTop: 8, color: '#888', textAlign: 'center' },
});
