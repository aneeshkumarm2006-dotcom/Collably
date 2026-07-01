'use client';

import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, type SessionUser } from '@/components/providers/auth-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';

/**
 * Single client-side provider tree mounted once in the root layout:
 *   ThemeProvider (next-themes) → QueryProvider (TanStack) → AuthProvider,
 * with the global Tooltip context + the app-themed Sonner toaster.
 * `initialUser` is passed down from the Server Component layout in Phase 3.
 */
export function Providers({
  children,
  initialUser = null,
}: {
  children: React.ReactNode;
  initialUser?: SessionUser | null;
}) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider initialUser={initialUser}>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          <Toaster position="bottom-center" richColors closeButton />
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
