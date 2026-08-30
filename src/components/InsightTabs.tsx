import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';

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
          <ActivityIndicator color="#fff" size="small" />
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
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  tabs: { flexDirection: 'row', gap: 24, alignItems: 'flex-end' },
  tabText: { color: '#9C9C9C', fontSize: 16, fontWeight: '400', lineHeight: 23 },
  tabTextActive: { color: '#1a1a1a', fontWeight: '600' },
  tabCount: { color: '#9C9C9C', fontSize: 14, fontWeight: '400' },
  underline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -4,
    height: 2,
    backgroundColor: '#7CB342',
    borderRadius: 1,
    display: 'none',
  },
  insightBtn: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  insightBtnDisabled: { opacity: 0.4 },
  insightBtnText: { color: '#fff', fontSize: 16, fontWeight: '600', lineHeight: 22 },
});
