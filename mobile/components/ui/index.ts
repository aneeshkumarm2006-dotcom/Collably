/**
 * Barrel for the shared UI primitive library (PRD §16 `/components/ui`).
 * Import from `@/components/ui` so screens stay decoupled from file layout.
 */
export { Icon, type IconName, type IconProps } from './Icon';
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './Button';
export { Card, type CardProps } from './Card';
export { Badge, type BadgeProps, type BadgeTone } from './Badge';
export { TagChip, type TagChipProps } from './TagChip';
export { Avatar, type AvatarProps } from './Avatar';
export { RemoteImage, BLURHASH } from './RemoteImage';
export { ToastHost } from './Toast';
export { Confetti } from './Confetti';
export { BottomSheet, type BottomSheetProps, type BottomSheetRef } from './BottomSheet';
export { StatCard, type StatCardProps, type StatCardTone } from './StatCard';
export { EmptyState, type EmptyStateProps } from './EmptyState';
export { ErrorState, type ErrorStateProps } from './ErrorState';
export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonListItem,
  type SkeletonProps,
} from './SkeletonLoader';
export {
  Field,
  TextField,
  TextArea,
  NumberStepper,
  SwitchRow,
  type TextFieldProps,
  type NumberStepperProps,
} from './FormFields';
export { AutocompleteField, type AutocompleteFieldProps } from './AutocompleteField';
