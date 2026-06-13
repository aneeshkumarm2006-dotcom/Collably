/**
 * The campaign form's field primitives were lifted into `@/components/ui`
 * (`FormFields`) in Phase 11 so the onboarding flows share the exact same look.
 * This module re-exports them unchanged so the existing `from './fields'` imports
 * in the Step components keep working — single source of truth, no behaviour change.
 */
export {
  Field,
  TextField,
  TextArea,
  NumberStepper,
  SwitchRow,
  type TextFieldProps,
  type NumberStepperProps,
} from '@/components/ui';
