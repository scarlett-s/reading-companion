import { View, Text, Pressable, StyleSheet } from 'react-native';

export default function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable key={i} onPress={() => onChange?.(i)} hitSlop={6}>
          <Text style={[styles.star, { color: i <= value ? '#FFC107' : '#ddd' }]}>★</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  star: { fontSize: 30 },
});
