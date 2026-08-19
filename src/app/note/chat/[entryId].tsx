import { useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

export default function ChatScreen() {
  const { entryId } = useLocalSearchParams<{ entryId: string }>();
  return (
    <View style={styles.root}>
      <Text style={styles.title}>对话</Text>
      <Text style={styles.hint}>entryId: {entryId}（T16 实现苏格拉底对话）</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff', padding: 16, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700' },
  hint: { marginTop: 8, color: '#888', textAlign: 'center' },
});
