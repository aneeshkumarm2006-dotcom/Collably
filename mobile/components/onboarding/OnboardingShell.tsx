/**
 * Chrome for the role onboarding flows (PRD §7.2). One screen per role owns its
 * step state and renders the current step's body as `children`; this shell wraps
 * it with the safe-area page, a title + `StepperProgress`, and a pinned footer
 * with Back / Continue (Finish on the last step) actions.
 *
 * There is intentionally no way to exit until the flow completes — the
 * `(onboarding)` stack disables the swipe gesture and there is no header back; the
 * only "back" affordance is the in-footer button, which is hidden on step 1.
 *
 * Each step body is expected to bring its own `ScrollView` (like the campaign form
 * steps), so the shell keeps the header pinned at the top and the actions pinned
 * at the bottom while only the step content scrolls.
 */
import { useRef } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/components/ThemeProvider';
import { Button } from '@/components/ui';
import { StepperProgress } from '@/components/shared';

export type OnboardingShellProps = {
  title: string;
  /** 1-based current step. */
  step: number;
  totalSteps: number;
  /** Short caption shown beside "Step N of M". */
  stepTitle?: string;
  /** Gate the Continue/Finish button (per-step validity). */
  canAdvance: boolean;
  /** Last step shows "Finish" and triggers submit. */
  isLast: boolean;
  /** Spinner on the action button while the final submit is in flight. */
  submitting?: boolean;
  /** Omit to hide the Back button (step 1). */
  onBack?: () => void;
  onNext: () => void;
  /** Override the action label (defaults: "Continue", or "Finish setup" on the last step). */
  nextLabel?: string;
  children: React.ReactNode;
};

export function OnboardingShell({
  title,
  step,
  totalSteps,
  stepTitle,
  canAdvance,
  isLast,
  submitting = false,
  onBack,
  onNext,
  nextLabel,
  children,
}: OnboardingShellProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const label = nextLabel ?? (isLast ? 'Finish setup' : 'Continue');

  // Slide the step body in from the right when advancing, from the left when going
  // back. The `key={step}` remounts the body each step so the entrance replays
  // (and conveniently resets the inner ScrollView to the top of the new step).
  const prevStep = useRef(step);
  const forward = step >= prevStep.current;
  prevStep.current = step;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header — title + progress */}
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.5, marginBottom: 14 }}>
          {title}
        </Text>
        <StepperProgress current={step} total={totalSteps} stepTitle={stepTitle} />
      </View>

      {/* Step body (brings its own ScrollView) */}
      <View style={{ flex: 1 }}>
        <Animated.View
          key={step}
          entering={(forward ? FadeInRight : FadeInLeft).duration(260)}
          style={{ flex: 1 }}
        >
          {children}
        </Animated.View>
      </View>

      {/* Pinned actions */}
      <View
        style={{
          flexDirection: 'row',
          gap: 12,
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          borderTopWidth: 1,
          borderTopColor: colors.hair,
          backgroundColor: colors.bg,
        }}
      >
        {onBack && (
          <View style={{ flexShrink: 0 }}>
            <Button variant="outline" icon="chevL" onPress={onBack} disabled={submitting}>
              Back
            </Button>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Button block disabled={!canAdvance} loading={submitting} onPress={onNext}>
            {label}
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
