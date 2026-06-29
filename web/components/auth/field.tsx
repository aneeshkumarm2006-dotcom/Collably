import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * Labelled form field with an inline error / hint slot, used across the auth
 * forms. Pass the control (usually `<Input>`) as `children` so the field stays
 * agnostic about the input type. `action` renders inline with the label (e.g. the
 * "Forgot password?" link on the password field).
 */
export interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, error, hint, action, children, className }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={htmlFor}>{label}</Label>
        {action}
      </div>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-[13px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-faint">{hint}</p>
      ) : null}
    </div>
  );
}
