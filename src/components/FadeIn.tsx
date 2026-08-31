import { useEffect, useRef } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';

interface FadeInProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  duration?: number;
  delay?: number;
}

/**
 * Fades content in on first mount. Used where a skeleton swaps to real content,
 * so the reveal is a smooth fade instead of an abrupt cut. Native-driver opacity
 * keeps the animation off the JS thread.
 */
export default function FadeIn({ children, style, duration = 240, delay = 0 }: FadeInProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration, delay, useNativeDriver: true }).start();
  }, [opacity, duration, delay]);

  return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
}
