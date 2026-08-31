import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { colors, spacing, typography } from '@/theme';

type SFSymbolName = React.ComponentProps<typeof SymbolView>['name'];

interface EmptyStateProps {
  symbol: SFSymbolName;
  title: string;
  hint?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Centered icon + title + optional hint for empty lists and search no-results.
 * Gives an otherwise bare screen a quiet editorial presence.
 */
export default function EmptyState({ symbol, title, hint, style }: EmptyStateProps) {
  return (
    <View style={[styles.root, style]}>
      <SymbolView name={symbol} size={40} tintColor={colors.textSubtle} type="monochrome" />
      <Text style={styles.title}>{title}</Text>
      {!!hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  title: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  hint: { ...typography.caption, color: colors.textSubtle, textAlign: 'center', lineHeight: 20 },
});
