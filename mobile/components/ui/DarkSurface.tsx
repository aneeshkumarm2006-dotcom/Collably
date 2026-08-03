/**
 * "Am I rendered on a dark cinematic ground?" signal.
 *
 * Some shared building blocks (auth inputs, the primary Button, the auth footer)
 * are used both on the app's light card sheets AND on the blue-black cinematic
 * auth ground. Their default styling assumes a light surface. Wrapping a subtree
 * in `DarkSurfaceProvider` lets those components opt into a light-on-dark,
 * translucent-glass treatment that matches the onboarding "story" system, WITHOUT
 * changing their props/API or breaking the light-background screens (which never
 * mount the provider, so `useOnDarkSurface()` stays `false`).
 */
import { createContext, useContext, type ReactNode } from 'react';

const DarkSurfaceContext = createContext(false);

export function DarkSurfaceProvider({ children }: { children: ReactNode }) {
  return <DarkSurfaceContext.Provider value={true}>{children}</DarkSurfaceContext.Provider>;
}

/** True when the caller is inside a `DarkSurfaceProvider` (a dark cinematic ground). */
export function useOnDarkSurface(): boolean {
  return useContext(DarkSurfaceContext);
}
