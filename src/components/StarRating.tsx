import { View, Text, Pressable, StyleSheet } from 'react-native';

export default function StarRating({
  value,
  onChange,
  size = 30,
  activeColor = '#FFC107',
  inactiveColor = '#ddd',
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  activeColor?: string;
  inactiveColor?: string;
}) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable key={i} onPress={() => onChange?.(i)} hitSlop={6}>
          <Text style={[styles.star, { color: i <= value ? activeColor : inactiveColor, fontSize: size, lineHeight: size * 1.1 }]}>★</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  star: {},
});
