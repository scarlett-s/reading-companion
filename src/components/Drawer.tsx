import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  PanResponder,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'sf-symbols-typescript';
import { useRouter, type Href } from 'expo-router';
import { getAllBooks, getAllEntries } from '@/db';
import { daysWithEntries } from '@/stats';
import { todayString } from '@/utils';

export interface DrawerItem {
  label: string;
  path: Href;
  icon: IconKind;
}

export type IconKind = 'home' | 'library' | 'stats' | 'calendar' | 'settings';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PANEL_WIDTH = Math.round(SCREEN_WIDTH * 0.8); // 屏幕宽度的 4/5
const SIDE_MARGIN = 16;                              // 侧边栏左右 margin
const CONTENT_WIDTH = PANEL_WIDTH - SIDE_MARGIN * 2;
const ROW_PADDING = 20;                              // 上三行之间的 padding
const HEATMAP_TO_MENU_GAP = ROW_PADDING * 2;         // 热力图到 menu 的 2 倍 padding
const HEATMAP_CELL = 12;
const HEATMAP_GAP = 4;

const COLORS = ['#ebedf0', '#c6e48b', '#7bc96f', '#239a3b', '#196127'];

function colorFor(count: number): string {
  if (count <= 0) return COLORS[0];
  if (count === 1) return COLORS[1];
  if (count === 2) return COLORS[2];
  if (count === 3) return COLORS[3];
  return COLORS[4];
}

/**
 * SF Symbols 通过 expo-symbols 的 SymbolView 渲染 — 真正的系统 SF Symbols。
 * 所有图标使用单线（outline / 非填充）变体。
 */
const SF_SYMBOLS: Record<IconKind, SFSymbol> = {
  home: 'house',
  library: 'books.vertical',
  stats: 'chart.bar',
  calendar: 'calendar',
  settings: 'gearshape',
};

function Icon({ kind, size = 24, color = '#222' }: { kind: IconKind; size?: number; color?: string }) {
  return (
    <SymbolView
      name={SF_SYMBOLS[kind]}
      size={size}
      tintColor={color}
      type="monochrome"
    />
  );
}

/** 侧边栏内的热力图 — 7 格 / 列，列数根据 CONTENT_WIDTH 自适应 */
function SidebarHeatmap({ data }: { data: Record<string, number> }) {
  const today = todayString();
  const cellPlusGap = HEATMAP_CELL + HEATMAP_GAP;
  const weeks = Math.max(7, Math.floor((CONTENT_WIDTH + HEATMAP_GAP) / cellPlusGap));

  const [y, m, d] = today.split('-').map(Number);
  const endDayNum = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  const endWeekday = (new Date(endDayNum * 86400000).getUTCDay() + 6) % 7; // 0=周一
  const endSunday = endDayNum + (6 - endWeekday);
  const alignedStart = endSunday - weeks * 7 + 1;

  const cols: { date: string; count: number }[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: { date: string; count: number }[] = [];
    for (let d2 = 0; d2 < 7; d2++) {
      const dayNum = alignedStart + w * 7 + d2;
      const dt = new Date(dayNum * 86400000);
      const dateStr =
        `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
      col.push({ date: dateStr, count: data[dateStr] ?? 0 });
    }
    cols.push(col);
  }

  return (
    <View style={hmStyles.row}>
      {cols.map((col, wi) => (
        <View key={wi} style={hmStyles.col}>
          {col.map((cell) => (
            <View
              key={cell.date}
              style={[
                hmStyles.cell,
                { backgroundColor: colorFor(cell.count) },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

export default function Drawer({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: DrawerItem[];
}) {
  const router = useRouter();
  const slide = useRef(new Animated.Value(-PANEL_WIDTH)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const [stats, setStats] = useState({ notes: 0, books: 0, days: 0 });
  const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open) {
      slide.setValue(-PANEL_WIDTH);
      fade.setValue(0);
      Animated.parallel([
        Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
      loadStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function loadStats() {
    try {
      const [entries, books] = await Promise.all([getAllEntries(), getAllBooks()]);
      const map: Record<string, number> = {};
      for (const e of entries) {
        map[e.date] = (map[e.date] ?? 0) + 1;
      }
      setStats({
        notes: entries.length,
        books: books.length,
        days: daysWithEntries(entries),
      });
      setHeatmapData(map);
    } catch (err) {
      console.error('drawer loadStats failed', err);
    }
  }

  function goTo(item: DrawerItem) {
    onClose();
    setTimeout(() => router.push(item.path), 200);
  }

  function goSettings() {
    onClose();
    setTimeout(() => router.push('/settings'), 200);
  }

  // 侧边栏打开时，左滑关闭手势
  const closePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (!open) return false;
        const isLeftSwipe = gestureState.dx < -8;
        const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2;
        return isLeftSwipe && isHorizontal;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx < -PANEL_WIDTH * 0.3 || gestureState.vx < -0.5) {
          onClose();
        }
      },
    })
  ).current;

  if (!open) return null;

  return (
    <View style={styles.root} pointerEvents="auto">
      {/* 最底层：可点关闭（透明） */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
      />
      {/* 中间层：只做视觉暗化，不拦截触摸 */}
      <Animated.View
        style={[styles.overlay, { opacity: fade }]}
        pointerEvents="none"
      />
      {/* 顶层：侧边栏本体（自带左滑关闭手势） */}
      <Animated.View
        style={[styles.panel, { transform: [{ translateX: slide }] }]}
        {...closePan.panHandlers}>
        {/* Row 1: username + settings */}
        <View style={styles.headerRow}>
          <Text style={styles.username}>我</Text>
          <Pressable onPress={goSettings} hitSlop={10}>
            <Icon kind="settings" size={22} color="#666" />
          </Pressable>
        </View>

        {/* Row 2: 3 stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{stats.notes}</Text>
            <Text style={styles.statLabel}>笔记</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{stats.books}</Text>
            <Text style={styles.statLabel}>书籍</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{stats.days}</Text>
            <Text style={styles.statLabel}>天</Text>
          </View>
        </View>

        {/* Row 3: heatmap */}
        <View style={styles.heatmapRow}>
          <SidebarHeatmap data={heatmapData} />
        </View>

        {/* Row 4: 5 vertical menu rows (gap = 2× ROW_PADDING) */}
        <View style={styles.menuList}>
          {items.map((item) => (
            <Pressable
              key={String(item.path)}
              style={styles.menuItem}
              onPress={() => goTo(item)}>
              <Icon kind={item.icon} size={20} color="#444" />
              <Text style={styles.menuLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 50,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  panel: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: PANEL_WIDTH,
    backgroundColor: '#fff',
    paddingTop: 56,
    paddingHorizontal: SIDE_MARGIN,
  },

  // Row 1
  headerRow: {
    paddingBottom: ROW_PADDING,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  username: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },

  // Row 2
  statsRow: {
    paddingBottom: ROW_PADDING,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 36,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    lineHeight: 16,
  },

  // Row 3
  heatmapRow: {
    paddingBottom: HEATMAP_TO_MENU_GAP,
  },

  // Row 4
  menuList: {
    paddingTop: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 0,
    gap: 14,
  },
  menuLabel: {
    fontSize: 15,
    color: '#222',
    fontWeight: '500',
  },
});

const hmStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: HEATMAP_GAP },
  col: { gap: HEATMAP_GAP },
  cell: { width: HEATMAP_CELL, height: HEATMAP_CELL, borderRadius: 2 },
});