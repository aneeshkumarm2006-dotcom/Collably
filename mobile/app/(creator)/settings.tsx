/**
 * Settings (PRD §7.3). Account management for the signed-in creator: change email /
 * password, toggle push & email notification preferences, log out (clears the token
 * and de-registers the push token), and permanently delete the account. The two
 * credential changes use confirmation sheets; destructive actions confirm first.
 */
import { useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/SafePressable';
import { TextInput } from '@/components/ui/SafeTextInput';
import { useRouter } from 'expo-router';
import { Header, ThemeModeRow } from '@/components/shared';
import {
  Button,
  Card,
  Icon,
  SwitchRow,
  BottomSheet,
  type BottomSheetRef,
  type IconName,
} from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api, isApiError } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { unregisterPushToken } from '@/lib/notifications';
import type { PublicUser } from '@/types';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const signOut = useAuthStore((s) => s.signOut);

  const emailRef = useRef<BottomSheetRef>(null);
  const passwordRef = useRef<BottomSheetRef>(null);
  const deleteRef = useRef<BottomSheetRef>(null);

  const prefs = user?.notificationPrefs ?? { push: true, email: true };
  const [savingPref, setSavingPref] = useState(false);

  const setPref = async (key: 'push' | 'email', value: boolean) => {
    if (!user) return;
    const next = { ...prefs, [key]: value };
    setUser({ ...user, notificationPrefs: next } as PublicUser); // optimistic
    setSavingPref(true);
    try {
      await api.patch('/auth/me', { notificationPrefs: next });
    } catch {
      setUser({ ...user, notificationPrefs: prefs } as PublicUser); // revert
    } finally {
      setSavingPref(false);
    }
  };

  const logout = async () => {
    await unregisterPushToken();
    await signOut(); // the root gate routes back to welcome
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Settings" onBack={() => router.back()} variant="card" />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 18 }} showsVerticalScrollIndicator={false}>
        {/* Account */}
        <Group title="Account" colors={colors}>
          <Card padding={0}>
            <Row icon="message" label="Email" value={user?.email} onPress={() => emailRef.current?.present()} colors={colors} first />
            <Row icon="lock" label="Password" value="Change password" onPress={() => passwordRef.current?.present()} colors={colors} />
          </Card>
        </Group>

        {/* Appearance */}
        <Group title="Appearance" colors={colors}>
          <ThemeModeRow />
        </Group>

        {/* Notifications */}
        <Group title="Notifications" colors={colors}>
          <View style={{ gap: 10, opacity: savingPref ? 0.7 : 1 }}>
            <SwitchRow
              label="Push notifications"
              hint="Accept/reject, submission, and reminder alerts on your device."
              value={prefs.push}
              onValueChange={(v) => setPref('push', v)}
            />
            <SwitchRow
              label="Email notifications"
              hint="The same updates, also sent to your inbox."
              value={prefs.email}
              onValueChange={(v) => setPref('email', v)}
            />
          </View>
        </Group>

        {/* Danger zone */}
        <Group title="Account actions" colors={colors}>
          <View style={{ gap: 12 }}>
            <Button block variant="outline" icon="logout" onPress={logout}>
              Log out
            </Button>
            <Button block variant="danger" icon="trash" onPress={() => deleteRef.current?.present()}>
              Delete account
            </Button>
          </View>
        </Group>
      </ScrollView>

      <ChangeEmailSheet sheetRef={emailRef} currentEmail={user?.email ?? ''} onChanged={(u) => setUser(u)} />
      <ChangePasswordSheet sheetRef={passwordRef} />
      <DeleteAccountSheet sheetRef={deleteRef} onDeleted={signOut} />
    </View>
  );
}

// --- Change email -------------------------------------------------------------

function ChangeEmailSheet({
  sheetRef,
  currentEmail,
  onChanged,
}: {
  sheetRef: React.RefObject<BottomSheetRef | null>;
  currentEmail: string;
  onChanged: (user: PublicUser) => void;
}) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const { data } = await api.patch<{ user: PublicUser }>('/auth/email', {
        email: email.trim(),
        ...(password ? { password } : {}),
      });
      onChanged(data.user);
      sheetRef.current?.dismiss();
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not change your email.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet ref={sheetRef} title="Change email" snapPoints={['58%']}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 14 }}>
        <Text style={{ fontSize: 13.5, color: colors.text2 }}>Current: {currentEmail}</Text>
        <SheetInput value={email} onChangeText={setEmail} placeholder="New email" keyboardType="email-address" autoCapitalize="none" colors={colors} />
        <SheetInput value={password} onChangeText={setPassword} placeholder="Current password" secureTextEntry colors={colors} />
        {error && <Text style={{ fontSize: 13, color: colors.danger }}>{error}</Text>}
        <Button block loading={busy} disabled={!email.trim()} onPress={submit}>
          Update email
        </Button>
      </View>
    </BottomSheet>
  );
}

// --- Change password ----------------------------------------------------------

function ChangePasswordSheet({ sheetRef }: { sheetRef: React.RefObject<BottomSheetRef | null> }) {
  const { colors } = useTheme();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (next.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (next !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await api.patch('/auth/password', { ...(current ? { currentPassword: current } : {}), newPassword: next });
      setDone(true);
      setCurrent('');
      setNext('');
      setConfirm('');
      setTimeout(() => {
        setDone(false);
        sheetRef.current?.dismiss();
      }, 900);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not change your password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet ref={sheetRef} title="Change password" snapPoints={['66%']}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 14 }}>
        <SheetInput value={current} onChangeText={setCurrent} placeholder="Current password" secureTextEntry colors={colors} />
        <SheetInput value={next} onChangeText={setNext} placeholder="New password" secureTextEntry colors={colors} />
        <SheetInput value={confirm} onChangeText={setConfirm} placeholder="Confirm new password" secureTextEntry colors={colors} />
        {error && <Text style={{ fontSize: 13, color: colors.danger }}>{error}</Text>}
        {done && <Text style={{ fontSize: 13, color: colors.success }}>Password updated.</Text>}
        <Button block loading={busy} disabled={!next || !confirm} onPress={submit}>
          Update password
        </Button>
      </View>
    </BottomSheet>
  );
}

// --- Delete account -----------------------------------------------------------

function DeleteAccountSheet({ sheetRef, onDeleted }: { sheetRef: React.RefObject<BottomSheetRef | null>; onDeleted: () => Promise<void> }) {
  const { colors } = useTheme();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      await api.delete('/auth/me', { data: password ? { password } : {} });
      sheetRef.current?.dismiss();
      await onDeleted();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not delete your account.');
      setBusy(false);
    }
  };

  return (
    <BottomSheet ref={sheetRef} title="Delete account" snapPoints={['52%']}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 14 }}>
        <Text style={{ fontSize: 14, color: colors.text2, lineHeight: 20 }}>
          This permanently deletes your account and all associated data. Enter your password to confirm.
        </Text>
        <SheetInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry colors={colors} />
        {error && <Text style={{ fontSize: 13, color: colors.danger }}>{error}</Text>}
        <Button block variant="danger" loading={busy} icon="trash" onPress={() => void submit()}>
          Delete my account
        </Button>
      </View>
    </BottomSheet>
  );
}

// --- Local primitives ---------------------------------------------------------

function SheetInput({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  colors,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'email-address';
  autoCapitalize?: 'none';
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.text3}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize ?? (secureTextEntry ? 'none' : 'sentences')}
      autoCorrect={false}
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

function Group({ title, colors, children }: { title: string; colors: ReturnType<typeof useTheme>['colors']; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text2, letterSpacing: 0.2, textTransform: 'uppercase' }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
  colors,
  first,
}: {
  icon: IconName;
  label: string;
  value?: string;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  first?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.hair,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon name={icon} size={19} color={colors.text2} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{label}</Text>
        {value ? <Text numberOfLines={1} style={{ fontSize: 12.5, color: colors.text3, marginTop: 1 }}>{value}</Text> : null}
      </View>
      <Icon name="chevR" size={18} color={colors.text3} />
    </Pressable>
  );
}
