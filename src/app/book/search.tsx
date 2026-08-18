import { View, Text, StyleSheet } from 'react-native';

export default function BookSearchScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>添加图书</Text>
      <Text style={styles.subtitle}>按书名搜索（待实现）</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  title: { fontSize: 22, fontWeight: '600' },
  subtitle: { fontSize: 14, color: '#666' },
});
