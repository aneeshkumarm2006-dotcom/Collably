/**
 * Type-ahead text field with an inline suggestion dropdown (PRD §7.2 onboarding
 * location pickers). Matches the look of `FormFields.TextField` but, as the user
 * types, shows matching `options` below the input; tapping one fills the value.
 *
 * The dropdown renders INLINE (pushes content down) rather than as an absolute
 * overlay, so it never gets clipped by the onboarding ScrollView / card.
 */
import { useState } from 'react';
import { Text, View } from 'react-native';
import { TextInput } from '@/components/ui/SafeTextInput';
import { Pressable } from '@/components/ui/SafePressable';
import { useTheme } from '@/components/ThemeProvider';
import { Icon, type IconName } from './Icon';

export type AutocompleteFieldProps = {
  value: string;
  onChangeText: (t: string) => void;
  /** Called when a suggestion is tapped (value is also set via onChangeText). */
  onSelect?: (value: string) => void;
  /** Suggestion source. */
  options: string[];
  placeholder?: string;
  icon?: IconName;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  maxLength?: number;
  maxSuggestions?: number;
};

export function AutocompleteField({
  value,
  onChangeText,
  onSelect,
  options,
  placeholder,
  icon = 'mappin',
  autoCapitalize = 'words',
  maxLength,
  maxSuggestions = 6,
}: AutocompleteFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const q = value.trim().toLowerCase();
  const exact = options.some((o) => o.toLowerCase() === q);
  // Prefix matches first, then any substring match — both deduped, capped.
  const matches =
    focused && q.length > 0 && !exact
      ? Array.from(
          new Set([
            ...options.filter((o) => o.toLowerCase().startsWith(q)),
            ...options.filter((o) => o.toLowerCase().includes(q)),
          ]),
        ).slice(0, maxSuggestions)
      : [];

  const pick = (o: string) => {
    onChangeText(o);
    onSelect?.(o);
    setFocused(false);
  };

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: focused ? colors.accent : colors.hair,
          borderRadius: 12,
          paddingHorizontal: 13,
        }}
      >
        {icon ? <Icon name={icon} size={18} color={colors.text3} /> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          // Delay so a suggestion tap registers before the list hides.
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          placeholder={placeholder}
          placeholderTextColor={colors.text3}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          maxLength={maxLength}
          style={{ flex: 1, paddingVertical: 13, paddingLeft: icon ? 9 : 0, fontSize: 16, color: colors.text }}
        />
      </View>

      {matches.length > 0 ? (
        <View
          style={{
            marginTop: 6,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.hair,
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          {matches.map((o, i) => (
            <Pressable
              key={o}
              onPress={() => pick(o)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 9,
                paddingHorizontal: 13,
                paddingVertical: 12,
                borderTopWidth: i ? 1 : 0,
                borderTopColor: colors.hair,
              }}
            >
              <Icon name={icon} size={15} color={colors.text3} />
              <Text style={{ fontSize: 15, color: colors.text }}>{o}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
