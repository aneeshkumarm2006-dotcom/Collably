/**
 * Centered zero-data placeholder (PRD §8.5 — empty-state illustrations). An icon
 * bubble, a title, supporting copy, and an optional CTA. Used on explore, collabs,
 * notifications, etc. when a list comes back empty.
 */
import { Text, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/components/ThemeProvider';
import { Icon, type IconName } from './Icon';
import { Button } from './Button';

export type EmptyStateProps = {
  icon?: IconName;
  title: string;
  body?: string;
  /** CTA label — renders a button when both this and `onAction` are set. */
  action?: string;
  onAction?: () => void;
  style?: ViewStyle;
};

export function EmptyState({ icon = 'inbox', title, body, action, onAction, style }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 36, ...style }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          backgroundColor: colors.cardSunk,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 18,
        }}
      >
        <Icon name={icon} size={34} color={colors.text3} strokeWidth={1.6} />
      </View>
      <Text style={{ fontSize: 19, fontWeight: '700', color: colors.text, letterSpacing: -0.3, textAlign: 'center' }}>
        {title}
      </Text>
      {body && (
        <Text style={{ fontSize: 14.5, color: colors.text2, marginTop: 7, lineHeight: 21, maxWidth: 260, textAlign: 'center' }}>
          {body}
        </Text>
      )}
      {action && onAction && (
        <View style={{ marginTop: 20 }}>
          <Button onPress={onAction}>{action}</Button>
        </View>
      )}
    </View>
  );
}
