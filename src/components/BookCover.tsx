import { Image, type ImageSource } from 'expo-image';
import { View, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { colors, radius } from '@/theme';

/** 书籍封面，无封面时显示 SF Symbol 占位符；豆瓣图床需要带 Referer 防盗链头 */
export default function BookCover({ url, size = 56 }: { url?: string; size?: number }) {
  let source: ImageSource | undefined;
  if (url) {
    source = url.includes('doubanio.com')
      ? { uri: url, headers: { Referer: 'https://book.douban.com/' } }
      : { uri: url };
  }
  return (
    <View style={[styles.box, { width: size, height: Math.round(size * 1.4) }]}>
      {source ? (
        <Image source={source} style={styles.img} contentFit="cover" transition={100} />
      ) : (
        <View style={styles.placeholder}>
          <SymbolView
            name="book.closed"
            size={Math.round(size * 0.45)}
            tintColor={colors.textSubtle}
            type="monochrome"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceMuted },
  img: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});