/**
 * Shared form-field primitives (PRD §7.2 onboarding, §7.4 campaign form). A
 * label/hint wrapper plus the controlled inputs the multi-step flows assemble
 * from: a single-line text field, a multi-line text area, a − / value / + number
 * stepper, and a labeled toggle row.
 *
 * Originally local to the campaign form (Phase 8); lifted here in Phase 11 so the
 * onboarding flows reuse the exact same look. The campaign form's `fields.tsx`
 * now re-exports these for backward compatibility.
 *
 * Convention (matches the rest of the library): NativeWind handles layout; color
 * comes from `useTheme().colors` inline so light/dark stay in sync.
 */
import { Pressable, Switch, Text, TextInput, View } from 'react-native';
import { useTheme } from '@/components/ThemeProvider';
import { Icon } from './Icon';

export function Field({ label, hint, children }: { label?: string; hint?: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: 16 }}>
      {label && (
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text2, marginBottom: 7, letterSpacing: -0.1 }}>
          {label}
        </Text>
      )}
      {children}
      {hint && <Text style={{ fontSize: 12, color: colors.text3, marginTop: 6 }}>{hint}</Text>}
    </View>
  );
}

export type TextFieldProps = {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'url' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  maxLength?: number;
};

export function TextField({ value, onChangeText, placeholder, keyboardType, autoCapitalize, maxLength }: TextFieldProps) {
  const { colors } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.text3}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      maxLength={maxLength}
      style={{
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.hair,
        borderRadius: 12,
        paddingHorizontal: 13,
        paddingVertical: 13,
        fontSize: 16,
        color: colors.text,
      }}
    />
  );
}

export function TextArea({ value, onChangeText, placeholder, maxLength }: TextFieldProps) {
  const { colors } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.text3}
      multiline
      maxLength={maxLength}
      textAlignVertical="top"
      style={{
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.hair,
        borderRadius: 12,
        paddingHorizontal: 13,
        paddingVertical: 13,
        fontSize: 16,
        color: colors.text,
        minHeight: 110,
      }}
    />
  );
}

export type NumberStepperProps = {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
};

export function NumberStepper({ value, onChange, min = 0, max = 9999, step = 1 }: NumberStepperProps) {
  const { colors } = useTheme();
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));

  const btn = (icon: 'minus' | 'plus', onPress: () => void, disabled: boolean) => (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.cardSunk,
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
      })}
    >
      <Icon name={icon} size={18} color={colors.text} strokeWidth={2.2} />
    </Pressable>
  );

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      {btn('minus', dec, value <= min)}
      <Text style={{ minWidth: 36, textAlign: 'center', fontSize: 18, fontWeight: '700', color: colors.text }}>{value}</Text>
      {btn('plus', inc, value >= max)}
    </View>
  );
}

export function SwitchRow({ label, hint, value, onValueChange }: { label: string; hint?: string; value: boolean; onValueChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.hair,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{label}</Text>
        {hint && <Text style={{ fontSize: 12.5, color: colors.text3, marginTop: 2 }}>{hint}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.accent, false: colors.hairStrong }}
        thumbColor="#fff"
      />
    </View>
  );
}
