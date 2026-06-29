/**
 * Single import site for toasts. The themed <Toaster /> is mounted once in the
 * root providers; trigger toasts anywhere with:
 *
 *   import { toast } from '@/lib/toast';
 *   toast.success('Application accepted: creator notified');
 *   toast.error('Something went wrong');
 */
export { toast } from 'sonner';
