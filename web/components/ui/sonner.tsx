'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

/**
 * App-themed Sonner toaster. Mounted once (root providers). Uses our tokens so
 * toasts match light/dark. Trigger with `import { toast } from 'sonner'`.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-card group-[.toaster]:text-ink group-[.toaster]:border-hair group-[.toaster]:shadow-dropdown group-[.toaster]:rounded-lg',
          description: 'group-[.toast]:text-muted',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-secondary group-[.toast]:text-secondary-foreground',
          success: 'group-[.toaster]:[&_svg]:text-money',
          error: 'group-[.toaster]:[&_svg]:text-danger',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
