import { Image } from 'expo-image';
import { View, Text, StyleSheet } from 'react-native';

/** 书籍封面，无封面时显示占位符 */
export default function BookCover({ url, size = 56 }: { url?: string; size?: number }) {
  return (
    <View style={[styles.box, { width: size, height: Math.round(size * 1.4) }]}>
      {url ? (
        <Image source={{ uri: url }} style={styles.img} contentFit="cover" transition={100} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={{ fontSize: size * 0.4 }}>📖</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 4, overflow: 'hidden', backgroundColor: '#e8e8e8' },
  img: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
