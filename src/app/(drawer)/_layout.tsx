import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, Dimensions } from 'react-native';
import { Slot, usePathname } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import Drawer, { DrawerItem } from '@/components/Drawer';
import { Pressable } from '@/components/Pressable';
import { registerOpenDrawer } from '@/drawerControl';
import { colors, spacing, typography } from '@/theme';

const PANEL_WIDTH = Math.round(Dimensions.get('window').width * 0.8);

const MENU: DrawerItem[] = [
  { label: '首页', path: '/', icon: 'home' },
  { label: '书库', path: '/library', icon: 'library' },
  { label: '统计', path: '/calendar', icon: 'stats' },
  { label: '设置', path: '/settings', icon: 'settings' },
];

export default function DrawerLayout() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // 日历 / 设置页自带 nav bar，drawer header 让位；/settings/* 子页同理
  const showHeader = pathname !== '/calendar' && !pathname.startsWith('/settings');

  // 把 setOpen 暴露给子页面（日历页左侧按钮可触发）
  useEffect(() => {
    registerOpenDrawer(() => setOpen(true));
    return () => registerOpenDrawer(() => {});
  }, []);

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
      <View style={styles.safeAreaWrapper}>
        {showHeader && (
          <View style={styles.header}>
            <Pressable onPress={() => setOpen(true)} style={styles.menuBtn} hitSlop={8}>
              <SymbolView name="line.3.horizontal" size={22} tintColor={colors.text} type="monochrome" />
            </Pressable>
            <Text style={styles.headerTitle}>读书记录</Text>
            <View style={styles.menuBtn} />
          </View>
        )}
        <View style={styles.body}>
          <Slot />
        </View>
      </View>
      <Drawer open={open} items={MENU} onClose={() => setOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  safeAreaWrapper: { flex: 1, paddingTop: 56 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.bg,
  },
  menuBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.heading, color: colors.text },
  body: { flex: 1 },
});