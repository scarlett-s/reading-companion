import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Slot } from 'expo-router';
import Drawer, { DrawerItem } from '@/components/Drawer';

const MENU: DrawerItem[] = [
  { label: '首页', path: '/' },
  { label: '书库', path: '/library' },
  { label: '统计', path: '/stats' },
  { label: '日历', path: '/calendar' },
  { label: '设置', path: '/settings' },
];

export default function DrawerLayout() {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => setOpen(true)} style={styles.menuBtn} hitSlop={8}>
          <Text style={styles.menuIcon}>☰</Text>
        </Pressable>
        <Text style={styles.headerTitle}>读书记录</Text>
        <View style={styles.menuBtn} />
      </View>
      <View style={styles.body}>
        <Slot />
      </View>
      <Drawer open={open} items={MENU} onClose={() => setOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0f0f0' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  menuIcon: { fontSize: 22, color: '#222' },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  body: { flex: 1 },
});
