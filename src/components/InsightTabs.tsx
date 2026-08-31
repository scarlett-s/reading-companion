import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Pressable } from '@/components/Pressable';
import { colors, spacing, radius, typography } from '@/theme';

interface InsightTabsProps {
  activeTab: 'notes' | 'reflections';
  onTabChange: (tab: 'notes' | 'reflections') => void;
  noteCount: number;
  reflectionCount: number;
  onNewInsight: () => void;
  insightDisabled: boolean;
  loading: boolean;
}

export default function InsightTabs({
  activeTab,
  onTabChange,
  noteCount,
  reflectionCount,
  onNewInsight,
  insightDisabled,
  loading,
}: InsightTabsProps) {
  return (
    <View style={styles.bar}>
      <View style={styles.tabs}>
        <TabItem
          label="全部笔记"
          count={noteCount}
          active={activeTab === 'notes'}
          onPress={() => onTabChange('notes')}
        />
        <TabItem
          label="AI 洞察"
          count={reflectionCount}
          active={activeTab === 'reflections'}
          onPress={() => onTabChange('reflections')}
        />
      </View>
      <Pressable
        style={[styles.insightBtn, insightDisabled && styles.insightBtnDisabled]}
        onPress={onNewInsight}
        disabled={insightDisabled || loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.primaryText} size="small" />
        ) : (
          <Text style={styles.insightBtnText}>新 AI 洞察</Text>
        )}
      </Pressable>
    </View>
  );
}

function TabItem({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <View>
        <Text style={[styles.tabText, active && styles.tabTextActive]}>
          {label} <Text style={styles.tabCount}>{count}</Text>
        </Text>
        {active && <View style={styles.underline} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  tabs: { flexDirection: 'row', gap: spacing.xxl, alignItems: 'flex-end' },
  tabText: { color: colors.textSubtle, fontSize: 16, lineHeight: 23 },
  tabTextActive: { color: colors.text, fontWeight: '600' },
  tabCount: { color: colors.textSubtle, fontSize: 14 },
  underline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -4,
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
  insightBtn: {
    backgroundColor: colors.text,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
  },
  insightBtnDisabled: { opacity: 0.4 },
  insightBtnText: { color: colors.primaryText, ...typography.bodyStrong, fontSize: 16, lineHeight: 22 },
});
