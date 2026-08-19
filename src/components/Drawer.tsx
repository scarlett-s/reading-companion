import { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { useRouter, type Href } from 'expo-router';

export interface DrawerItem {
  label: string;
  path: Href;
}

export default function Drawer({
  open,
  items,
  onClose,
}: {
  open: boolean;
  items: DrawerItem[];
  onClose: () => void;
}) {
  const router = useRouter();
  const slide = useRef(new Animated.Value(-300)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      slide.setValue(-300);
      fade.setValue(0);
      Animated.parallel([
        Animated.timing(slide, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [open, slide, fade]);

  if (!open) return null;

  function go(item: DrawerItem) {
    onClose();
    router.push(item.path);
  }

  return (
    <View style={styles.root} pointerEvents="auto">
      <Animated.View style={[styles.overlay, { opacity: fade }]}>
        <Pressable style={styles.overlayPress} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.panel, { transform: [{ translateX: slide }] }]}>
        <Text style={styles.title}>读书记录</Text>
        {items.map((it, i) => (
          <Pressable key={i} style={styles.item} onPress={() => go(it)}>
            <Text style={styles.itemText}>{it.label}</Text>
          </Pressable>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  overlayPress: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  panel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: '#fff',
    paddingTop: 64,
    paddingHorizontal: 20,
  },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 24 },
  item: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  itemText: { fontSize: 16, color: '#222' },
});
