/**
 * Labeled text input for the auth screens (PRD §7.1). A leading icon, an optional
 * password show/hide toggle, and an inline error message under the field. Styling
 * matches the campaign form fields (`components/campaign/CampaignForm/fields`) but
 * lives here so the auth flow stays self-contained.
 *
 * Controlled: pass `value` + `onChangeText`. Set `secure` for password fields (adds
 * the eye toggle). `error` turns the border red and shows the message below.
 */
import { forwardRef, useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '@/components/ThemeProvider';
import { Icon, type IconName } from '@/components/ui';

export type AuthInputProps = {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  icon?: IconName;
  placeholder?: string;
  /** Password field — masks input and adds a show/hide toggle. */
  secure?: boolean;
  error?: string | null;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  editable?: boolean;
  maxLength?: number;
};

export const AuthInput = forwardRef<TextInput, AuthInputProps>(function AuthInput(
  {
    label,
    value,
    onChangeText,
    icon,
    placeholder,
    secure = false,
    error,
    keyboardType,
    autoCapitalize = 'none',
    autoComplete,
    textContentType,
    returnKeyType,
    onSubmitEditing,
    editable = true,
    maxLength,
  },
  ref,
) {
  const { colors } = useTheme();
  const [hidden, setHidden] = useState(secure);
  const borderColor = error ? colors.danger : colors.hair;

  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: colors.text2,
          marginBottom: 7,
          letterSpacing: -0.1,
        }}
      >
        {label}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor,
          borderRadius: 12,
          paddingHorizontal: 13,
        }}
      >
        {icon && (
          <Icon name={icon} size={18} color={colors.text3} strokeWidth={1.9} />
        )}
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.text3}
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          textContentType={textContentType}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          editable={editable}
          maxLength={maxLength}
          style={{
            flex: 1,
            paddingVertical: 13,
            paddingLeft: icon ? 10 : 0,
            fontSize: 16,
            color: colors.text,
          }}
        />
        {secure && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            style={({ pressed }) => ({ padding: 4, opacity: pressed ? 0.6 : 1 })}
          >
            <Icon name="eye" size={19} color={hidden ? colors.text3 : colors.accent} strokeWidth={1.9} />
          </Pressable>
        )}
      </View>

      {error && (
        <Text style={{ fontSize: 12.5, color: colors.danger, marginTop: 6 }}>{error}</Text>
      )}
    </View>
  );
});
