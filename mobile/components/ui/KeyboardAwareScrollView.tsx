/**
 * A drop-in `ScrollView` that keeps the focused input above the on-screen keyboard,
 * on both platforms, without a heavy native dependency.
 *
 * Why this exists: a plain `<ScrollView>` does NOT lift or scroll a focused field
 * out from behind the keyboard, and a `<KeyboardAvoidingView behavior={undefined}>`
 * (the old Android path) is a no-op — so inputs near the bottom of a form (e.g. the
 * campaign Location step's City field) were hidden while typing.
 *
 * How it fixes it, using only built-ins:
 *  - iOS: `automaticallyAdjustKeyboardInsets` makes the ScrollView pad its content
 *    inset by the keyboard height AND scroll the focused input into view. No
 *    `KeyboardAvoidingView` needed (and no double-padding when one is present, since
 *    the inset is computed from the keyboard/scroll-frame overlap).
 *  - Android: the OS pans the window so the focused input sits above the keyboard —
 *    driven by `android.softwareKeyboardLayoutMode: "pan"` in app.json. This prop is
 *    ignored on Android, so the two mechanisms never fight.
 *
 * `keyboardShouldPersistTaps="handled"` is on by default so taps on autocomplete
 * results, chips, and buttons still register while the keyboard is open. All
 * `ScrollView` props pass through and can override the defaults; the ref forwards to
 * the underlying ScrollView.
 */
import { forwardRef } from 'react';
import { Platform, ScrollView, type ScrollViewProps } from 'react-native';

export const KeyboardAwareScrollView = forwardRef<ScrollView, ScrollViewProps>(
  function KeyboardAwareScrollView(props, ref) {
    return (
      <ScrollView
        ref={ref}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}
        // iOS: auto-inset + scroll the focused field into view. Ignored elsewhere;
        // Android relies on `softwareKeyboardLayoutMode: "pan"` (app.json).
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        showsVerticalScrollIndicator={false}
        {...props}
      />
    );
  },
);
