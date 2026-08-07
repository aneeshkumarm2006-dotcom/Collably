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
 *    inset by the keyboard height AND scroll the focused input into view.
 *  - Android: the OS resizes the window to the space above the keyboard — driven by
 *    `android.softwareKeyboardLayoutMode: "resize"` in app.json — and the ScrollView
 *    brings the focused field into view inside that smaller viewport. This prop is
 *    ignored on Android, so the two mechanisms never fight.
 *
 * Never wrap this in a `KeyboardAvoidingView`. A KAV changes the scroll view's FRAME
 * while this changes its CONTENT INSET; with a `flexGrow: 1` content container the two
 * re-measure each other every frame and the screen strobes (that was the auth-screen
 * "blinking input" bug). Frame stays put, inset moves — that's the whole trick.
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
