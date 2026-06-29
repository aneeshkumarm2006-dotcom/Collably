'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Loader2, Monitor, Moon, Sun, Trash2 } from 'lucide-react';

import { clientApi } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { toast } from '@/lib/toast';
import { useAuth } from '@/components/providers/auth-provider';
import type { PublicUser } from '@/lib/shared';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

function SettingsSection({
  title,
  description,
  children,
  danger,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <section
      className={cn(
        'rounded-xl border bg-card p-5 shadow-sm sm:p-6',
        danger ? 'border-danger/30' : 'border-hair',
      )}
    >
      <h2 className={cn('text-base font-bold', danger ? 'text-danger' : 'text-ink')}>{title}</h2>
      {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

function AppearanceSetting() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const active = mounted ? (theme ?? 'system') : undefined;

  return (
    <div className="inline-flex rounded-lg border border-hair p-1">
      {THEME_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setTheme(opt.value)}
          aria-pressed={active === opt.value}
          className={cn(
            'inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors',
            active === opt.value ? 'bg-brand text-white' : 'text-muted hover:text-ink',
          )}
        >
          <opt.icon className="h-4 w-4" /> {opt.label}
        </button>
      ))}
    </div>
  );
}

export function AccountSettings({ user }: { user: PublicUser }) {
  const router = useRouter();
  const { logout, refresh } = useAuth();

  // Email
  const [email, setEmail] = useState(user.email);
  const [emailPassword, setEmailPassword] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Notifications
  const [prefs, setPrefs] = useState({
    push: user.notificationPrefs?.push ?? true,
    email: user.notificationPrefs?.email ?? true,
  });

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function saveEmail() {
    if (email.trim() === user.email) {
      toast.info('That’s already your email.');
      return;
    }
    setSavingEmail(true);
    try {
      await clientApi.auth.changeEmail({
        email: email.trim(),
        password: emailPassword || undefined,
      });
      setEmailPassword('');
      await refresh();
      toast.success('Email updated. Verify your new address from the email we sent.');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update your email'));
    } finally {
      setSavingEmail(false);
    }
  }

  async function savePassword() {
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords don’t match.');
      return;
    }
    setSavingPassword(true);
    try {
      await clientApi.auth.changePassword({
        currentPassword: currentPassword || undefined,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not change your password'));
    } finally {
      setSavingPassword(false);
    }
  }

  async function updatePrefs(next: { push: boolean; email: boolean }) {
    const prev = prefs;
    setPrefs(next); // optimistic
    try {
      await clientApi.auth.updateMe({ notificationPrefs: next });
    } catch (err) {
      setPrefs(prev);
      toast.error(errorMessage(err, 'Could not update notification settings'));
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      await clientApi.auth.deleteAccount(deletePassword || undefined);
      toast.success('Your account has been deleted.');
      await logout();
      router.push('/');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not delete your account'));
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <SettingsSection title="Appearance" description="Choose how Collably looks on this device.">
        <AppearanceSetting />
      </SettingsSection>

      <SettingsSection title="Email address" description="Used for sign-in and important updates.">
        <div className="grid gap-4 sm:max-w-md">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email-password">
              Current password <span className="font-normal text-faint">(if you have one)</span>
            </Label>
            <Input
              id="email-password"
              type="password"
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>
          <div>
            <Button onClick={saveEmail} disabled={savingEmail || !email.trim()}>
              {savingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update email'}
            </Button>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Password" description="Set a new password for your account.">
        <div className="grid gap-4 sm:max-w-md">
          <div className="space-y-1.5">
            <Label htmlFor="current-password">
              Current password <span className="font-normal text-faint">(if you have one)</span>
            </Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Re-enter new password"
            />
          </div>
          <div>
            <Button onClick={savePassword} disabled={savingPassword || !newPassword}>
              {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Change password'}
            </Button>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Notifications"
        description="The in-app feed is always on. Control off-channel alerts here."
      >
        <div className="divide-y divide-hair">
          <label className="flex cursor-pointer items-center justify-between gap-4 py-3.5">
            <span>
              <span className="block text-sm font-semibold text-ink">Email notifications</span>
              <span className="text-[13px] text-muted">Application updates, accepted collabs, and more.</span>
            </span>
            <Switch
              checked={prefs.email}
              onCheckedChange={(c) => updatePrefs({ ...prefs, email: c })}
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-4 py-3.5">
            <span>
              <span className="block text-sm font-semibold text-ink">
                Push notifications <span className="font-normal text-faint">(mobile app)</span>
              </span>
              <span className="text-[13px] text-muted">Real-time alerts on the Collably mobile app.</span>
            </span>
            <Switch checked={prefs.push} onCheckedChange={(c) => updatePrefs({ ...prefs, push: c })} />
          </label>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Delete account"
        description="Permanently delete your account, profile, applications, and data. This can't be undone."
        danger
      >
        <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="h-4 w-4" /> Delete my account
        </Button>
      </SettingsSection>

      <Dialog open={deleteOpen} onOpenChange={(o) => !deleting && setDeleteOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This permanently removes your profile, applications, and collab history. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="delete-password">
              Confirm with your password <span className="font-normal text-faint">(if you have one)</span>
            </Label>
            <Input
              id="delete-password"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteAccount} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
