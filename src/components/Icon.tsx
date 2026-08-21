import { Text, TextStyle, StyleSheet } from 'react-native';

/** 轻量线框图标：unicode 几何符号 + 文本样式控制粗细/大小，零依赖 */

type IconName =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'list'
  | 'hash'
  | 'image'
  | 'send'
  | 'check';

const GLYPH: Record<IconName, string> = {
  bold: 'B',
  italic: 'I',
  underline: 'U',
  list: '☰',
  hash: '#',
  image: '🖼',
  send: '➤',
  check: '✓',
};

export function Icon({
  name,
  size = 18,
  color = '#222',
  style,
}: {
  name: IconName;
  size?: number;
  color?: string;
  style?: TextStyle;
}) {
  return (
    <Text
      style={[
        styles.base,
        {
          fontSize: size,
          color,
          lineHeight: size + 4,
        },
        style,
      ]}>
      {GLYPH[name]}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { fontWeight: '500' },
});