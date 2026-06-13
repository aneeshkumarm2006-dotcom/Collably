/**
 * Themed wrapper around `@gorhom/bottom-sheet`'s modal. Centralizes the brand
 * sheet styling (rounded top, themed handle, tap-to-dismiss scrim) so every sheet
 * in the app — filter, sort, action menus — looks identical and screens only
 * supply content.
 *
 * Usage:
 *   const ref = useRef<BottomSheetRef>(null);
 *   <BottomSheet ref={ref} title="Filters">…</BottomSheet>
 *   ref.current?.present();   // open
 *   ref.current?.dismiss();   // close
 */
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useTheme } from '@/components/ThemeProvider';

export type BottomSheetRef = {
  present: () => void;
  dismiss: () => void;
};

export type BottomSheetProps = {
  children: React.ReactNode;
  /** Optional title shown in a header row. */
  title?: string;
  /** Explicit snap points (e.g. ['50%']). Defaults to dynamic content sizing. */
  snapPoints?: (string | number)[];
  onDismiss?: () => void;
};

export const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(function BottomSheet(
  { children, title, snapPoints, onDismiss },
  ref,
) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const modalRef = useRef<BottomSheetModal>(null);

  useImperativeHandle(ref, () => ({
    present: () => modalRef.current?.present(),
    dismiss: () => modalRef.current?.dismiss(),
  }));

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} pressBehavior="close" />
    ),
    [],
  );

  // Memoize so the modal doesn't re-resolve snap points each render.
  const points = useMemo(() => snapPoints, [snapPoints]);

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={points}
      enableDynamicSizing={!points}
      onDismiss={onDismiss}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.sheet }}
      handleIndicatorStyle={{ backgroundColor: colors.hairStrong }}
    >
      <BottomSheetView style={{ paddingBottom: insets.bottom + 12 }}>
        {title && (
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 4,
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: colors.hair,
              marginBottom: 6,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, letterSpacing: -0.3 }}>{title}</Text>
          </View>
        )}
        {children}
      </BottomSheetView>
    </BottomSheetModal>
  );
});
