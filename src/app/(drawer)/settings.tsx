import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'sf-symbols-typescript';
import { openDrawer } from '@/drawerControl';
import { Pressable } from '@/components/Pressable';
import { colors, spacing, radius, typography } from '@/theme';

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
          <SymbolView name="line.3.horizontal" size={22} tintColor={colors.text} type="monochrome" />
        </Pressable>
        <View style={styles.navTitleLayer} pointerEvents="none">
          <Text style={styles.navTitle}>设  置</Text>
        </View>
        <Pressable hitSlop={8} style={styles.navBtn}>
          <SymbolView name="ellipsis" size={22} tintColor={colors.text} type="monochrome" />
        </Pressable>
      </View>

      {/* 菜单卡：白底圆角，单一容器内多行 + divider */}
      <View style={styles.body}>
        <View style={styles.card}>
          {items.map((item, i) => (
            <View key={item.label}>
              <Pressable style={styles.row} onPress={item.to}>
                <SymbolView name={item.symbol} size={22} tintColor={colors.text} type="monochrome" />
                <Text style={styles.rowLabel}>{item.label}</Text>
                <View style={styles.chevron}>
                  <SymbolView name="chevron.right" size={14} tintColor={colors.textSubtle} type="monochrome" />
                </View>
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
  root: { flex: 1, backgroundColor: colors.bg },

  // Nav bar
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    paddingHorizontal: spacing.sm + 2,
  },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  navTitleLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },

  // Body
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md + 2,
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg + 2,
    gap: spacing.md + 2,
  },
  rowLabel: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  chevron: { marginLeft: 'auto' },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 36, // 跳过 icon + gap
  },
});
