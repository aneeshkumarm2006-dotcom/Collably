/**
 * Framework-agnostic toast bus (PRD §8.5 — toast on network errors).
 *
 * A tiny pub/sub so non-React code (the axios interceptor in `lib/api`) can raise
 * a toast without importing React or the navigation tree. `<ToastHost>` (mounted
 * once in the root layout) is the single subscriber and renders the toast UI.
 *
 *   showToast('Saved');                          // info
 *   showToast({ message: 'Offline', type: 'error' });
 */
export type ToastType = 'error' | 'success' | 'info';

export type ToastInput = { message: string; type?: ToastType; duration?: number };
export type ToastEvent = { id: number; message: string; type: ToastType; duration: number };

type Listener = (event: ToastEvent) => void;

let listener: Listener | null = null;
let counter = 0;

/** Subscribe the (single) host. Pass `null` on unmount. */
export function subscribeToast(fn: Listener | null): void {
  listener = fn;
}

/** Raise a toast from anywhere (React or not). No-op until a host has mounted. */
export function showToast(input: ToastInput | string): void {
  const opts = typeof input === 'string' ? { message: input } : input;
  counter += 1;
  listener?.({
    id: counter,
    message: opts.message,
    type: opts.type ?? 'info',
    duration: opts.duration ?? 3200,
  });
}
