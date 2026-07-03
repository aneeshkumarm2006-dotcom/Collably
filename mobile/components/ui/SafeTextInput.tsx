/**
 * Drop-in replacement for React Native's `TextInput`.
 *
 * NativeWind v4 registers RN's `TextInput` for `cssInterop` unconditionally, and
 * the `jsxImportSource: 'nativewind'` babel setup routes EVERY `<TextInput>` (even
 * ones that only use inline `style`, never `className`) through that interop
 * wrapper. On the New Architecture (Fabric — `newArchEnabled: true`) the wrapper
 * re-applies the controlled `value` on each render, which resets the native
 * selection to index 0 — the "cursor jumps to the front on every keystroke" bug
 * that affected every text field in the app.
 *
 * react-native-css-interop's JSX runtime honours a per-element opt-out: when an
 * element carries `cssInterop={false}` it skips the swap and renders the plain RN
 * component. Since none of our inputs use `className` (color/layout come from
 * inline `style`), opting out is lossless. This wrapper bakes that flag in so no
 * call site can forget it and no future field regresses.
 *
 * Usage: identical to `TextInput`. Swap the import:
 *   `import { TextInput } from '@/components/ui/SafeTextInput';`
 * `ref` forwards to the underlying RN TextInput instance, so existing
 * `useRef<TextInput>()` focus/blur wiring keeps working unchanged.
 */
import { forwardRef, type ComponentRef } from 'react';
import { TextInput as RNTextInput, type TextInputProps } from 'react-native';

type TextInputInstance = ComponentRef<typeof RNTextInput>;

// `cssInterop` is react-native-css-interop's opt-out flag — read and stripped by
// its JSX runtime, not part of RN's public props. Typed as `object` so spreading
// it adds no TS-visible prop (avoids an "unknown prop" error) while keeping the
// runtime key that the runtime looks for.
const OPT_OUT = { cssInterop: false } as object;

export const TextInput = forwardRef<TextInputInstance, TextInputProps>(function SafeTextInput(
  props,
  ref,
) {
  return <RNTextInput ref={ref} {...props} {...OPT_OUT} />;
});
