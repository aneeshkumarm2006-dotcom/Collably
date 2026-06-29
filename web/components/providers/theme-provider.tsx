'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ComponentProps } from 'react';

/**
 * Theme provider (system / light / dark) using the `class` strategy, matching the
 * mobile app's three-way theme intent (`mobile/store/themeStore.ts`). A toggle is
 * added in Phase 1 (navbar) and Phase 7/8 (settings).
 */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
