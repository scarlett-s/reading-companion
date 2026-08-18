import { View, Text, StyleSheet } from 'react-native';

export default function NewEntryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>记录进度</Text>
      <Text style={styles.subtitle}>页数/百分比 + 评论（待实现）</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  title: { fontSize: 22, fontWeight: '600' },
  subtitle: { fontSize: 14, color: '#666' },
});
