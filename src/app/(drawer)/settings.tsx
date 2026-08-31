import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'sf-symbols-typescript';
import { openDrawer } from '@/drawerControl';

/** 设置页菜单项类型 */
interface MenuItem {
  label: string;
  symbol: SFSymbol;
  to: () => void;
}

export default function SettingsScreen() {
  const router = useRouter();

  const items: MenuItem[] = [
    {
      label: 'AI 配置',
      symbol: 'snowflake',
      to: () => router.push('/settings/ai'),
    },
    {
      label: '导出笔记',
      symbol: 'square.and.arrow.up',
      to: () => router.push('/settings/export'),
    },
  ];

  return (
    <View style={styles.root}>
      {/* 顶部 nav bar：左 = 呼出侧边栏 | 中 = 设 置 | 右 = ⋯ */}
      <View style={styles.navBar}>
        <Pressable onPress={() => openDrawer()} hitSlop={8} style={styles.navBtn}>
          <Text style={styles.navIcon}>‹</Text>
        </Pressable>
        <View style={styles.navTitleLayer} pointerEvents="none">
          <Text style={styles.navTitle}>设  置</Text>
        </View>
        <Pressable hitSlop={8} style={styles.navBtn}>
          <Text style={styles.navIcon}>⋯</Text>
        </Pressable>
      </View>

      {/* 菜单卡：白底圆角，单一容器内多行 + divider */}
      <View style={styles.body}>
        <View style={styles.card}>
          {items.map((item, i) => (
            <View key={item.label}>
              <Pressable style={styles.row} onPress={item.to}>
                <SymbolView name={item.symbol} size={22} tintColor="#1a1a1a" type="monochrome" />
                <Text style={styles.rowLabel}>{item.label}</Text>
              </Pressable>
              {i < items.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F5F2' },

  // Nav bar
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    paddingHorizontal: 12,
  },
  navBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  navIcon: { fontSize: 26, color: '#1a1a1a', lineHeight: 28 },
  navTitleLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 4,
  },

  // Body
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    gap: 14,
  },
  rowLabel: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  divider: {
    height: 1,
    backgroundColor: '#E6E6E6',
    marginLeft: 36, // 跳过 icon + gap
  },
});