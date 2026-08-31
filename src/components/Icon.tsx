import { SymbolView } from 'expo-symbols';
import { colors } from '@/theme';

/** 工具栏图标：SF Symbols 单色符号，替代 unicode/emoji 字符，跨端渲染一致 */

type IconName =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'list'
  | 'hash'
  | 'image'
  | 'send'
  | 'check';

const SYMBOL: Record<IconName, React.ComponentProps<typeof SymbolView>['name']> = {
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
  list: 'list.bullet',
  hash: 'number',
  image: 'photo',
  send: 'paperplane',
  check: 'checkmark',
};

export function Icon({
  name,
  size = 18,
  color = colors.text,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <SymbolView name={SYMBOL[name]} size={size} tintColor={color} type="monochrome" />;
}
