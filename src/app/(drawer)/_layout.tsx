import { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, PanResponder, Dimensions } from 'react-native';
import { Slot } from 'expo-router';
import Drawer, { DrawerItem } from '@/components/Drawer';

const PANEL_WIDTH = Math.round(Dimensions.get('window').width * 0.8);

const MENU: DrawerItem[] = [
  { label: '首页', path: '/', icon: 'home' },
  { label: '书库', path: '/library', icon: 'library' },
  { label: '统计', path: '/stats', icon: 'stats' },
  { label: '日历', path: '/calendar', icon: 'calendar' },
  { label: '设置', path: '/settings', icon: 'settings' },
];

export default function DrawerLayout() {
  const [open, setOpen] = useState(false);

  // 全局 PanResponder：左边缘向右滑 → 打开侧边栏
  // 用 onMoveShouldSetPanResponderCapture 让父级在子级之前声明响应
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        if (open) return false;
        const isLeftEdge = evt.nativeEvent.pageX < 30;
        const isRightSwipe = gestureState.dx > 8;
        const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2;
        return isLeftEdge && isRightSwipe && isHorizontal;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (
          gestureState.dx > PANEL_WIDTH * 0.3 ||
          gestureState.vx > 0.5
        ) {
          setOpen(true);
        }
      },
    })
  ).current;

  return (
    <View style={styles.root} {...panResponder.panHandlers}>
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
  root: { flex: 1, backgroundColor: '#F3F5F2' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: '#F3F5F2',
  },
  menuBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  menuIcon: { fontSize: 22, color: '#222' },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  body: { flex: 1 },
});