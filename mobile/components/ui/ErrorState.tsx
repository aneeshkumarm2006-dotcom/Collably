/**
 * Centered error placeholder with a Retry CTA (PRD §8.5 — error states + retry on
 * failed fetches). Same silhouette as `EmptyState` but danger-toned, for when a
 * request fails rather than returns empty.
 */
import { Text, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/components/ThemeProvider';
import { Icon, type IconName } from './Icon';
import { Button } from './Button';

export type ErrorStateProps = {
  icon?: IconName;
  title?: string;
  /** Error detail / message — keep it human (the api layer normalizes these). */
  body?: string;
  /** Retry handler — renders a "Try again" button when set. */
  onRetry?: () => void;
  retryLabel?: string;
  style?: ViewStyle;
};

export function ErrorState({
  icon = 'alert',
  title = 'Something went wrong',
  body = 'Please check your connection and try again.',
  onRetry,
  retryLabel = 'Try again',
  style,
}: ErrorStateProps) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 36, ...style }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          backgroundColor: `${colors.danger}1A`,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 18,
        }}
      >
        <Icon name={icon} size={34} color={colors.danger} strokeWidth={1.7} />
      </View>
      <Text style={{ fontSize: 19, fontWeight: '700', color: colors.text, letterSpacing: -0.3, textAlign: 'center' }}>
        {title}
      </Text>
      {body && (
        <Text style={{ fontSize: 14.5, color: colors.text2, marginTop: 7, lineHeight: 21, maxWidth: 280, textAlign: 'center' }}>
          {body}
        </Text>
      )}
      {onRetry && (
        <View style={{ marginTop: 20 }}>
          <Button variant="outline" icon="refresh" onPress={onRetry}>
            {retryLabel}
          </Button>
        </View>
      )}
    </View>
  );
}
