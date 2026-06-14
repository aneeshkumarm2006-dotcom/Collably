/**
 * A row that reveals contextual actions when swiped left (PRD §8.5 swipe gestures).
 * Wraps `react-native-gesture-handler`'s Swipeable with themed, icon+label action
 * buttons. Used by the business campaigns list (edit / pause / close) and anywhere
 * a list row needs swipe affordances. Each action closes the row when tapped.
 *
 * Swipe is an enhancement, not the only path — callers should also expose the same
 * actions via tap/long-press so the feature is reachable without discovering the
 * gesture.
 */
import { useRef } from 'react';
import { Text, View } from 'react-native';
import { Pressable } from '@/components/ui/SafePressable';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Icon, type IconName } from '@/components/ui';

export type SwipeAction = {
  key: string;
  label: string;
  icon: IconName;
  /** Background color of the action button. */
  color: string;
  onPress: () => void;
};

export type SwipeableRowProps = {
  actions: SwipeAction[];
  children: React.ReactNode;
};

export function SwipeableRow({ actions, children }: SwipeableRowProps) {
  const ref = useRef<Swipeable>(null);

  const renderActions = () => (
    <View style={{ flexDirection: 'row' }}>
      {actions.map((a) => (
        <ActionButton
          key={a.key}
          action={a}
          onPress={() => {
            ref.current?.close();
            a.onPress();
          }}
        />
      ))}
    </View>
  );

  return (
    <Swipeable
      ref={ref}
      renderRightActions={renderActions}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
    >
      {children}
    </Swipeable>
  );
}

function ActionButton({ action, onPress }: { action: SwipeAction; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 78,
        backgroundColor: action.color,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        opacity: pressed ? 0.85 : 1,
        marginLeft: 8,
        borderRadius: 16,
      })}
    >
      <Icon name={action.icon} size={20} color="#fff" strokeWidth={1.9} />
      <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>{action.label}</Text>
    </Pressable>
  );
}
