/**
 * Chrome for the "profile builder" onboarding redesign (Direction B). Unlike the
 * old `OnboardingShell` (title + stepper + step body), this puts a LIVE PREVIEW
 * card as the hero at the top — it stays pinned while the inputs below it change
 * step to step, so the user watches their profile assemble itself.
 *
 * Layout (top → bottom): a story-style segmented progress bar with a circular
 * Back, the pinned `preview`, a big per-step `question`, the step `children`
 * (their own ScrollView), and a pinned primary action. The question and inputs
 * slide in directionally on each step change; the preview animates in once on
 * mount and then persists.
 *
 * Like the old shell, there's no exit until the flow completes — the
 * `(onboarding)` stack disables the back gesture and there's no header back.
 */
import { useRef } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import Reanimated, { FadeInDown, FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable } from '@/components/ui/SafePressable';
import { useTheme } from '@/components/ThemeProvider';
import { Button, Icon } from '@/components/ui';
import { StepperProgress } from '@/components/shared';

export type LiveBuilderShellProps = {
  /** 1-based current step. */
  step: number;
  totalSteps: number;
  /** Big headline for the current step ("What do you create?"). */
  question: string;
  /** Optional supporting line under the question. */
  hint?: string;
  /** The live preview card — pinned hero, persists across steps. */
  preview: React.ReactNode;
  /** Gate the primary action (per-step validity). */
  canAdvance: boolean;
  /** Last step shows "Finish" and triggers submit. */
  isLast: boolean;
  /** Spinner on the action while the final submit is in flight. */
  submitting?: boolean;
  /** Omit to hide Back (step 1). */
  onBack?: () => void;
  onNext: () => void;
  /** Override the action label (defaults: "Continue", or "Go live 🎉" on the last step). */
  nextLabel?: string;
  /** Step body — brings its own ScrollView. */
  children: React.ReactNode;
};

export function LiveBuilderShell({
  step,
  totalSteps,
  question,
  hint,
  preview,
  canAdvance,
  isLast,
  submitting = false,
  onBack,
  onNext,
  nextLabel,
  children,
}: LiveBuilderShellProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const label = nextLabel ?? (isLast ? 'Go live 🎉' : 'Continue');

  // Slide forward (from the right) when advancing, back (from the left) otherwise.
  const prevStep = useRef(step);
  const forward = step >= prevStep.current;
  prevStep.current = step;
  const Enter = forward ? FadeInRight : FadeInLeft;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Story-style progress + circular Back */}
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 20, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            disabled={submitting}
            accessibilityRole="button"
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.hair,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Icon name="chevL" size={18} color={colors.text} />
          </Pressable>
        ) : (
          <View style={{ width: 36, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 18 }}>✨</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <StepperProgress current={step} total={totalSteps} showLabel={false} />
          <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.text3, marginTop: 6, letterSpacing: 0.3 }}>
            STEP {step} OF {totalSteps}
          </Text>
        </View>
      </View>

      {/* Live preview hero (animates in once, then persists) */}
      <Reanimated.View entering={FadeInDown.duration(420).springify().damping(18)} style={{ paddingHorizontal: 20, paddingTop: 2, paddingBottom: 6 }}>
        {preview}
      </Reanimated.View>

      {/* Big per-step question */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 }}>
        <Reanimated.View key={`q-${step}`} entering={Enter.duration(300)}>
          <Text style={{ fontSize: 23, fontWeight: '800', color: colors.text, letterSpacing: -0.6, lineHeight: 28 }}>{question}</Text>
          {hint ? <Text style={{ fontSize: 13.5, color: colors.text2, marginTop: 5, lineHeight: 19 }}>{hint}</Text> : null}
        </Reanimated.View>
      </View>

      {/* Step inputs (own ScrollView), slid in slightly after the question */}
      <View style={{ flex: 1 }}>
        <Reanimated.View key={`b-${step}`} entering={Enter.duration(320).delay(60)} style={{ flex: 1 }}>
          {children}
        </Reanimated.View>
      </View>

      {/* Pinned primary action */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          borderTopWidth: 1,
          borderTopColor: colors.hair,
          backgroundColor: colors.bg,
        }}
      >
        <Button block disabled={!canAdvance} loading={submitting} onPress={onNext}>
          {label}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}
