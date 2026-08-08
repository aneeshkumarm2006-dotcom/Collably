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
import { Text, View, type TextInput as RNTextInput, type TextInputProps } from 'react-native';
import { Pressable } from '@/components/ui/SafePressable';
import { TextInput } from '@/components/ui/SafeTextInput';
import { useTheme } from '@/components/ThemeProvider';
import { Icon, type IconName, useOnDarkSurface } from '@/components/ui';
import type { Icon as PhosphorIcon } from 'phosphor-react-native';

// Blue-black "story" palette, reused from the onboarding StoryInput so the auth
// fields feel like one system when they sit on the cinematic dark ground.
const D = {
  blue: '#2D88FF',
  surface: 'rgba(255,255,255,0.055)',
  border: 'rgba(255,255,255,0.12)',
  iconIdleBg: 'rgba(255,255,255,0.06)',
  iconFocusBg: 'rgba(45,136,255,0.18)',
  text: '#FFFFFF',
  placeholder: 'rgba(255,255,255,0.36)',
  label: 'rgba(255,255,255,0.72)',
  iconIdle: 'rgba(255,255,255,0.5)',
  iconFocus: '#5AA0FF',
  danger: '#FF8B8B',
};

export type AuthInputProps = {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  /**
   * Leading glyph. Accepts either a name from the in-house set or a Phosphor
   * component — the auth fields use Phosphor because its `duotone`/weighted
   * drawing reads better at 17px than the hairline in-house glyphs, and because
   * the in-house set has no envelope (the email field was showing a SPEECH
   * BUBBLE, `message`, which is a chat icon).
   */
  icon?: IconName | PhosphorIcon;
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

export const AuthInput = forwardRef<RNTextInput, AuthInputProps>(function AuthInput(
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
  const onDark = useOnDarkSurface();
  const [hidden, setHidden] = useState(secure);
  const [focused, setFocused] = useState(false);

  // Premium focus treatment: blue ring + highlighted icon when active; red on error.
  // On the cinematic dark ground we swap to the translucent "story" glass surface.
  const dangerColor = onDark ? D.danger : colors.danger;
  const borderColor = error
    ? dangerColor
    : focused
      ? D.blue
      : onDark
        ? D.border
        : colors.hairStrong;
  const iconColor = error
    ? dangerColor
    : focused
      ? onDark ? D.iconFocus : colors.brandGreenText
      : onDark ? D.iconIdle : colors.text3;

  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: onDark ? D.label : colors.text2,
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
          backgroundColor: onDark ? D.surface : colors.cardSunk,
          // Constant 1.5px border (no width change on focus → no flicker/jump).
          borderWidth: 1.5,
          borderColor,
          borderRadius: 14,
          paddingHorizontal: 14,
          // Soft blue focus ring (iOS glow; Android falls back to the border).
          ...(focused && !error && onDark
            ? { shadowColor: D.blue, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } }
            : {}),
        }}
      >
        {icon && (
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: onDark
                ? focused && !error ? D.iconFocusBg : D.iconIdleBg
                : focused && !error ? colors.brandGreenSoft : colors.card,
            }}
          >
            {typeof icon === 'string' ? (
              <Icon name={icon} size={17} color={iconColor} strokeWidth={1.9} />
            ) : (
              // Phosphor: `bold` at 17px keeps the stroke visible inside the small
              // rounded chip, where `regular` washes out against the tinted fill.
              (() => {
                const Glyph = icon;
                return <Glyph size={17} color={iconColor} weight="bold" />;
              })()
            )}
          </View>
        )}
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={onDark ? D.placeholder : colors.text3}
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          textContentType={textContentType}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          editable={editable}
          maxLength={maxLength}
          // Kill Android's default green accent underline (the "green stripe").
          underlineColorAndroid="transparent"
          selectionColor={onDark ? D.blue : colors.brandGreen}
          cursorColor={onDark ? D.blue : colors.brandGreen}
          style={{
            flex: 1,
            paddingVertical: 14,
            paddingLeft: icon ? 11 : 0,
            fontSize: 16,
            color: onDark ? D.text : colors.text,
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
            <Icon
              name="eye"
              size={19}
              color={hidden ? (onDark ? D.iconIdle : colors.text3) : onDark ? D.iconFocus : colors.brandGreenText}
              strokeWidth={1.9}
            />
          </Pressable>
        )}
      </View>

      {error && (
        <Text style={{ fontSize: 12.5, color: dangerColor, marginTop: 6 }}>{error}</Text>
      )}
    </View>
  );
});
