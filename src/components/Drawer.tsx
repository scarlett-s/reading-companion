import { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, StyleSheet, Dimensions } from 'react-native';
import { useRouter, type Href } from 'expo-router';

export interface DrawerItem {
  label: string;
  path: Href;
  icon?: string;
}

const PANEL_WIDTH = Math.max(320, Math.round(Dimensions.get('window').width * 0.85));

const ICONS: Record<string, string> = {
  '/': '🏠',
  '/library': '📚',
  '/stats': '📊',
  '/calendar': '📅',
  '/settings': '⚙️',
};

export default function Drawer({
  open,
  items,
  onClose,
  currentPath,
}: {
  open: boolean;
  items: DrawerItem[];
  onClose: () => void;
  currentPath?: string;
}) {
  const router = useRouter();
  const slide = useRef(new Animated.Value(-PANEL_WIDTH)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      slide.setValue(-PANEL_WIDTH);
      fade.setValue(0);
      Animated.parallel([
        Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
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
        <View style={styles.brand}>
          <Text style={styles.brandTitle}>读书记录</Text>
          <Text style={styles.brandSubtitle}>个人版 · 本地存储</Text>
        </View>
        <View style={styles.menuList}>
          {items.map((it) => {
            const active = currentPath === it.path;
            return (
              <Pressable
                key={String(it.path)}
                style={[styles.item, active && styles.itemActive]}
                onPress={() => go(it)}>
                {active && <View style={styles.activeBar} />}
                <Text style={styles.itemIcon}>{ICONS[String(it.path)] ?? '•'}</Text>
                <Text style={[styles.itemText, active && styles.itemTextActive]}>{it.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  overlayPress: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  panel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: PANEL_WIDTH,
    backgroundColor: '#fff',
    paddingTop: 56,
  },
  brand: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  brandTitle: { fontSize: 22, fontWeight: '700', color: '#222' },
  brandSubtitle: { fontSize: 13, color: '#999', marginTop: 4 },
  menuList: { paddingTop: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 20,
  },
  itemActive: { backgroundColor: '#f4f6f8' },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 4,
    borderRadius: 2,
    backgroundColor: '#7CB342',
  },
  itemIcon: { fontSize: 18, marginRight: 12, width: 22, textAlign: 'center' },
  itemText: { fontSize: 16, color: '#222' },
  itemTextActive: { color: '#7CB342', fontWeight: '600' },
});