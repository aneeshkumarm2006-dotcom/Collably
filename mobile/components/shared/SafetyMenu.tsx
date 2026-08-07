/**
 * The "⋯" overflow menu for a person: any context actions the caller passes, then
 * the safety actions (report / block) below a divider.
 *
 * Report and block are required, not optional — App Store Guideline 1.2 and Play's
 * UGC policy both demand a way to report content *and* block an abusive user, and an
 * app with chat and public profiles is rejected without them. But they should not be
 * the *entire* menu: tapping "⋯" in a chat and being offered only "Report" and "Block"
 * reads like an accusation. Pass `actions` for the ordinary things a caller can do,
 * and safety drops to the bottom where it belongs.
 *
 * Drop `<SafetyMenu userId={…} name={…} />` into any `Header`'s `right` slot. It owns
 * its own sheets, so callers only pass the target and an optional `onBlocked` to
 * refresh/pop the screen.
 *
 * Report files against the existing `POST /reports` admin queue; block hits
 * `POST /blocks`, which cuts messaging in *both* directions server-side.
 */
import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { BottomSheet, Button, Icon, type BottomSheetRef, type IconName } from '@/components/ui';
// NativeWind v4 drops the function-form `style` on RN's Pressable and mangles
// TextInput on Fabric — the app-wide wrappers are mandatory, not optional.
import { Pressable } from '@/components/ui/SafePressable';
import { TextInput } from '@/components/ui/SafeTextInput';
import { useTheme } from '@/components/ThemeProvider';
import { api, isApiError } from '@/lib/api';
import { showToast } from '@/lib/toast';

/** What the report is filed against — mirrors the backend's REPORT_TARGET_TYPES. */
export type SafetyTargetType = 'user' | 'creator' | 'business' | 'campaign';

/** An ordinary (non-safety) row shown above the divider. */
export type SafetyMenuAction = {
  icon: IconName;
  label: string;
  onPress: () => void;
};

export type SafetyMenuProps = {
  /** The **User** id being reported/blocked. */
  userId: string;
  /** Display name, used in the sheet title and confirmation copy so the action is unambiguous. */
  name?: string;
  /** Defaults to 'user'; pass 'campaign' when reporting a listing. */
  targetType?: SafetyTargetType;
  /** Hide Block when it makes no sense (e.g. reporting your own campaign's applicant list). */
  allowBlock?: boolean;
  /** Context actions listed above the safety divider (e.g. "View collab"). */
  actions?: SafetyMenuAction[];
  /** Called after a successful block — typically `router.back()` or a refetch. */
  onBlocked?: () => void;
  /** Tint for the trigger icon (defaults to the theme's secondary text). */
  color?: string;
};

export function SafetyMenu({
  userId,
  name,
  targetType = 'user',
  allowBlock = true,
  actions,
  onBlocked,
  color,
}: SafetyMenuProps) {
  const { colors } = useTheme();
  const menuRef = useRef<BottomSheetRef | null>(null);
  const reportRef = useRef<BottomSheetRef | null>(null);
  const blockRef = useRef<BottomSheetRef | null>(null);

  const who = name?.trim() || 'this account';

  return (
    <>
      <Pressable
        onPress={() => menuRef.current?.present()}
        accessibilityRole="button"
        accessibilityLabel="Safety options"
        hitSlop={10}
        style={({ pressed }) => ({ padding: 6, opacity: pressed ? 0.6 : 1 })}
      >
        <Icon name="more" size={20} color={color ?? colors.text2} strokeWidth={2.4} />
      </Pressable>

      <BottomSheet ref={menuRef} title={who}>
        <View style={{ paddingHorizontal: 12, paddingTop: 2, paddingBottom: 10 }}>
          {actions?.map((a) => (
            <MenuRow key={a.label} icon={a.icon} label={a.label} onPress={() => {
              menuRef.current?.dismiss();
              // Let the sheet finish dismissing before navigating, or the push lands
              // under a closing sheet.
              setTimeout(a.onPress, 220);
            }} />
          ))}

          {!!actions?.length && (
            <View style={{ height: 1, backgroundColor: colors.hair, marginVertical: 6, marginHorizontal: 8 }} />
          )}

          <MenuRow
            icon="flag"
            label="Report"
            onPress={() => {
              menuRef.current?.dismiss();
              // Let the first sheet finish dismissing before presenting the next,
              // otherwise the second present() is swallowed on iOS.
              setTimeout(() => reportRef.current?.present(), 220);
            }}
          />
          {allowBlock && (
            <MenuRow
              icon="ban"
              label="Block"
              danger
              onPress={() => {
                menuRef.current?.dismiss();
                setTimeout(() => blockRef.current?.present(), 220);
              }}
            />
          )}
        </View>
      </BottomSheet>

      <ReportSheet sheetRef={reportRef} userId={userId} targetType={targetType} who={who} />
      <BlockSheet sheetRef={blockRef} userId={userId} who={who} onBlocked={onBlocked} />
    </>
  );
}

// --- Report -------------------------------------------------------------------

/** Preset reasons keep most reports one tap; free text stays available below. */
const REPORT_REASONS = [
  'Spam or scam',
  'Harassment or hate',
  'Nudity or sexual content',
  'Impersonation',
  'Something else',
] as const;

function ReportSheet({
  sheetRef,
  userId,
  targetType,
  who,
}: {
  sheetRef: React.RefObject<BottomSheetRef | null>;
  userId: string;
  targetType: SafetyTargetType;
  who: string;
}) {
  const { colors } = useTheme();
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!reason) return;
    setError(null);
    setBusy(true);
    try {
      // The backend takes a single free-text `reason`; fold the preset and the
      // optional detail into one string so admins see both.
      const body = details.trim() ? `${reason} — ${details.trim()}` : reason;
      await api.post('/reports', { targetType, targetId: userId, reason: body });
      sheetRef.current?.dismiss();
      setReason(null);
      setDetails('');
      showToast({ message: 'Report sent. Thanks for flagging it.', type: 'success' });
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not send that report.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet ref={sheetRef} title={`Report ${who}`} snapPoints={['72%']}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 12 }}>
        <Text style={{ fontSize: 14, color: colors.text2, lineHeight: 20 }}>
          Tell us what's wrong. Reports are reviewed by our moderation team and are not shared with{' '}
          {who}.
        </Text>

        <View style={{ gap: 8 }}>
          {REPORT_REASONS.map((r) => {
            const selected = reason === r;
            return (
              <Pressable
                key={r}
                onPress={() => setReason(r)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: selected ? colors.accent : colors.hair,
                  backgroundColor: selected ? `${colors.accent}12` : 'transparent',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                {/* No `circle` glyph in the icon set — draw the unselected
                    radio as a plain ring so the row still reads as a choice. */}
                {selected ? (
                  <Icon name="checkcircle" size={18} color={colors.accent} />
                ) : (
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      borderWidth: 1.6,
                      borderColor: colors.text3,
                    }}
                  />
                )}
                <Text style={{ fontSize: 15, color: colors.text, fontWeight: selected ? '700' : '500' }}>
                  {r}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          value={details}
          onChangeText={setDetails}
          placeholder="Add details (optional)"
          placeholderTextColor={colors.text2}
          multiline
          maxLength={1800}
          style={{
            minHeight: 76,
            borderWidth: 1,
            borderColor: colors.hair,
            borderRadius: 12,
            padding: 12,
            fontSize: 15,
            color: colors.text,
            textAlignVertical: 'top',
          }}
        />

        {error && <Text style={{ fontSize: 13, color: colors.danger }}>{error}</Text>}

        <Button block loading={busy} disabled={!reason} icon="flag" onPress={() => void submit()}>
          Send report
        </Button>
      </View>
    </BottomSheet>
  );
}

// --- Block --------------------------------------------------------------------

function BlockSheet({
  sheetRef,
  userId,
  who,
  onBlocked,
}: {
  sheetRef: React.RefObject<BottomSheetRef | null>;
  userId: string;
  who: string;
  onBlocked?: () => void;
}) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      await api.post('/blocks', { userId });
      sheetRef.current?.dismiss();
      showToast({ message: `${who} is blocked.`, type: 'success' });
      onBlocked?.();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not block that account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet ref={sheetRef} title={`Block ${who}?`} snapPoints={['44%']}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 14 }}>
        <Text style={{ fontSize: 14, color: colors.text2, lineHeight: 20 }}>
          Neither of you will be able to send new messages. Your existing conversation stays
          readable. You can undo this any time from Settings → Blocked accounts.
        </Text>
        {error && <Text style={{ fontSize: 13, color: colors.danger }}>{error}</Text>}
        <Button block variant="danger" loading={busy} icon="ban" onPress={() => void submit()}>
          {`Block ${who}`}
        </Button>
      </View>
    </BottomSheet>
  );
}

// --- Local primitives ---------------------------------------------------------

/**
 * One overflow row. Single line on purpose: the two-line rows this used to have made
 * a two-item sheet as tall as a settings screen. 48dp tall so it clears the Material
 * touch-target floor, with a pressed background rather than an opacity dip so the
 * feedback reads on both themes.
 */
function MenuRow({
  icon,
  label,
  danger,
  onPress,
}: {
  icon: IconName;
  label: string;
  danger?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const tint = danger ? colors.danger : colors.text;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        minHeight: 48,
        paddingHorizontal: 8,
        borderRadius: 12,
        backgroundColor: pressed ? colors.cardSunk : 'transparent',
      })}
    >
      <Icon name={icon} size={20} color={danger ? colors.danger : colors.text2} strokeWidth={2.2} />
      <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: tint }}>{label}</Text>
    </Pressable>
  );
}
