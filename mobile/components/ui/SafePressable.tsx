/**
 * Drop-in replacement for React Native's `Pressable`.
 *
 * NativeWind v4's `cssInterop` (auto-applied to RN core components via the
 * `jsxImportSource: 'nativewind'` babel setup) silently DROPS a function-form
 * `style` prop — `style={({ pressed }) => …}` — leaving the element completely
 * unstyled. That was the root cause of the "broken alignment": CTAs rendered as
 * bare stacked text, search bars/cards lost their backgrounds, etc.
 *
 * This wrapper tracks the pressed state itself (onPressIn/onPressOut) and resolves
 * any function-form `style`/`children` to a STATIC value BEFORE handing it to RN's
 * Pressable — which NativeWind resolves correctly. Press feedback is preserved.
 *
 * Usage: identical to `Pressable`. Swap the import:
 *   `import { Pressable } from '@/components/ui/SafePressable';`
 */
import { forwardRef, useState, type ReactNode } from 'react';
import {
  Pressable as RNPressable,
  type PressableProps,
  type PressableStateCallbackType,
  type View,
} from 'react-native';

export const Pressable = forwardRef<View, PressableProps>(function SafePressable(
  { style, children, onPressIn, onPressOut, ...rest },
  ref,
) {
  const [pressed, setPressed] = useState(false);
  const state: PressableStateCallbackType = { pressed, hovered: false };
  return (
    <RNPressable
      ref={ref}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      style={typeof style === 'function' ? style(state) : style}
      {...rest}
    >
      {typeof children === 'function' ? (children(state) as ReactNode) : children}
    </RNPressable>
  );
});
