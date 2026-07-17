/**
 * Phone entry field with a country picker — shared by both phone-verify screens.
 *
 * Renders the bordered row: a tappable country chip (flag + dial code) on the
 * left, then the national-number input. Tapping the chip opens a small sheet to
 * switch country. Switching clears the typed digits, because a half-typed Canadian
 * number isn't a valid Indian one (and vice-versa) — carrying it over would let a
 * user submit a number that passes length but not the new country's rule.
 *
 * The parent owns `country` + `digits` (so it can build the E.164 string and check
 * validity via `country.valid`); this component is purely the input surface.
 */
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { TextInput } from '@/components/ui/SafeTextInput';
import { Icon } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { PHONE_COUNTRIES, type PhoneCountry } from '@/lib/phoneCountries';

export type PhoneNumberFieldProps = {
  country: PhoneCountry;
  onCountryChange: (c: PhoneCountry) => void;
  digits: string;
  onDigitsChange: (d: string) => void;
  error?: boolean;
  autoFocus?: boolean;
  editable?: boolean;
};

export function PhoneNumberField({
  country,
  onCountryChange,
  digits,
  onDigitsChange,
  error,
  autoFocus,
  editable = true,
}: PhoneNumberFieldProps) {
  const { colors } = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);

  const pick = (c: PhoneCountry) => {
    setPickerOpen(false);
    if (c.iso !== country.iso) {
      onCountryChange(c);
      onDigitsChange(''); // a number valid for one country isn't for another
    }
  };

  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1.5,
          borderColor: error ? colors.danger : colors.hair,
          borderRadius: 14,
          backgroundColor: colors.card,
          paddingHorizontal: 14,
          height: 56,
        }}
      >
        <Pressable
          onPress={() => editable && setPickerOpen(true)}
          hitSlop={8}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ fontSize: 18 }}>{country.flag}</Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{country.dial}</Text>
          <Icon name="chevD" size={15} color={colors.text3} strokeWidth={2.4} />
        </Pressable>

        <View style={{ width: 1, height: 24, backgroundColor: colors.hair, marginHorizontal: 12 }} />

        <TextInput
          value={digits}
          onChangeText={(t) => onDigitsChange(t.replace(/\D/g, '').slice(0, country.length))}
          placeholder={country.placeholder}
          placeholderTextColor={colors.text3}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          maxLength={country.length}
          autoFocus={autoFocus}
          editable={editable}
          style={{ flex: 1, fontSize: 16, fontWeight: '600', color: colors.text }}
        />
      </View>

      {/* Country sheet — small enough to be a bottom card rather than a full screen. */}
      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable
          onPress={() => setPickerOpen(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              paddingTop: 10,
              paddingBottom: 34,
              paddingHorizontal: 16,
            }}
          >
            <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.hairStrong, marginBottom: 14 }} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text2, marginBottom: 8, paddingHorizontal: 6 }}>
              Select country
            </Text>
            {PHONE_COUNTRIES.map((c) => {
              const selected = c.iso === country.iso;
              return (
                <Pressable
                  key={c.iso}
                  onPress={() => pick(c)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 14,
                    paddingHorizontal: 6,
                    borderRadius: 12,
                    backgroundColor: pressed ? colors.cardSunk : 'transparent',
                  })}
                >
                  <Text style={{ fontSize: 22 }}>{c.flag}</Text>
                  <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: colors.text }}>{c.name}</Text>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text2 }}>{c.dial}</Text>
                  {selected ? <Icon name="check" size={18} color={colors.accent} strokeWidth={2.6} /> : <View style={{ width: 18 }} />}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
