import { forwardRef } from 'react';
import {
  Pressable as RNPressable,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

/**
 * Drop-in replacement for RN Pressable with press feedback:
 * - Slight scale + opacity on press (default scale 0.98)
 * - Hover support for web (default opacity 0.95)
 * - Optional `pressedStyle` / `hoverStyle` overrides
 *
 * Use `scale={0.94}` for big floating buttons (FAB) for stronger feedback.
 */

type StyleFn = Exclude<PressableProps['style'], StyleProp<ViewStyle>>;

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  /** Scale factor on press. Default 0.98; FAB-sized should use 0.94. */
  scale?: number;
  /** Opacity on press. Default 0.85. */
  pressedOpacity?: number;
  /** Opacity on hover (web). Default 0.95. */
  hoverOpacity?: number;
  /** Base style — can be a function (stateful). */
  style?: StyleProp<ViewStyle> | StyleFn;
  /** Style override when pressed (applied in addition to scale + opacity). */
  pressedStyle?: StyleProp<ViewStyle>;
  /** Style override when hovered. */
  hoverStyle?: StyleProp<ViewStyle>;
}

export const Pressable = forwardRef<View, PressableScaleProps>(function Pressable(
  {
    scale = 0.98,
    pressedOpacity = 0.85,
    hoverOpacity = 0.95,
    style,
    pressedStyle,
    hoverStyle,
    children,
    ...rest
  },
  ref
) {
  return (
    <RNPressable
      ref={ref}
      {...rest}
      style={(state) => {
        const base = typeof style === 'function' ? (style as StyleFn)(state) : style;
        const arr: StyleProp<ViewStyle>[] = [base];
        if (state.hovered) {
          arr.push({ opacity: hoverOpacity });
          if (hoverStyle) arr.push(hoverStyle);
        }
        if (state.pressed) {
          arr.push({ opacity: pressedOpacity, transform: [{ scale }] });
          if (pressedStyle) arr.push(pressedStyle);
        }
        return arr;
      }}>
      {children}
    </RNPressable>
  );
});
