import { View, Text, StyleSheet } from 'react-native';

export default function DiscussScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Discuss</Text>
      <Text style={styles.subtitle}>AI 追问（待实现）</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  title: { fontSize: 22, fontWeight: '600' },
  subtitle: { fontSize: 14, color: '#666' },
});
