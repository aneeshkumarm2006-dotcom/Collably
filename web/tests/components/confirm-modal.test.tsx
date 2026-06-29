import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmModal, type ConfirmModalProps } from '@/components/shared/confirm-modal';

function setup(overrides: Partial<ConfirmModalProps> = {}) {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();
  const props: ConfirmModalProps = {
    open: true,
    onOpenChange,
    title: 'Delete campaign?',
    description: 'This action cannot be undone.',
    onConfirm,
    ...overrides,
  };
  const utils = render(<ConfirmModal {...props} />);
  return { onConfirm, onOpenChange, ...utils };
}

describe('<ConfirmModal>', () => {
  it('renders the title, description, and both buttons when open', () => {
    // Radix Dialog portals to document.body, so query the screen, not the container.
    setup();
    expect(screen.getByText('Delete campaign?')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('exposes the title as the dialog accessible name', () => {
    setup();
    expect(screen.getByRole('dialog', { name: 'Delete campaign?' })).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    setup({ open: false });
    expect(screen.queryByText('Delete campaign?')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('omits the description node entirely when not provided', () => {
    setup({ description: undefined });
    expect(screen.getByText('Delete campaign?')).toBeInTheDocument();
    expect(screen.queryByText('This action cannot be undone.')).not.toBeInTheDocument();
  });

  it('falls back to default Confirm / Cancel labels', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('honors custom confirm / cancel labels', () => {
    setup({ confirmLabel: 'Yes, delete it', cancelLabel: 'Keep it' });
    expect(screen.getByRole('button', { name: 'Yes, delete it' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep it' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument();
  });

  it('fires onConfirm when the confirm button is clicked', async () => {
    const user = userEvent.setup();
    const { onConfirm, onOpenChange } = setup();
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    // Confirm does NOT itself close the dialog (caller owns that).
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('awaits an async onConfirm without throwing', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    setup({ onConfirm });
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('requests close via onOpenChange(false) when cancel is clicked', async () => {
    const user = userEvent.setup();
    const { onOpenChange, onConfirm } = setup();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('requests close via the Radix X close button', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = setup();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('requests close when Escape is pressed', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = setup();
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('disables both buttons while loading', () => {
    setup({ loading: true });
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('does not fire onConfirm when the disabled (loading) confirm button is clicked', async () => {
    const user = userEvent.setup();
    const { onConfirm } = setup({ loading: true });
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('renders a destructive confirm button variant', () => {
    setup({ destructive: true });
    const confirm = screen.getByRole('button', { name: 'Confirm' });
    // jsdom has no CSS; assert the variant class hook, not a computed color.
    expect(confirm.className).toContain('bg-destructive');
  });

  it('renders a default (non-destructive) confirm button variant by default', () => {
    setup();
    const confirm = screen.getByRole('button', { name: 'Confirm' });
    expect(confirm.className).toContain('bg-primary');
    expect(confirm.className).not.toContain('bg-destructive');
  });

  it('accepts a ReactNode description', () => {
    setup({ description: <strong>Boom</strong> });
    expect(screen.getByText('Boom')).toBeInTheDocument();
  });

  it('renders the same content inside a dark-mode wrapper (jsdom has no CSS — structure only)', () => {
    // jsdom does not apply CSS, so "dark mode" here only asserts that the
    // component renders identical content/structure without crashing under a
    // `.dark` ancestor. That is the honest extent of jsdom dark-mode testing.
    render(
      <div className="dark">
        <ConfirmModal
          open
          onOpenChange={vi.fn()}
          title="Dark delete?"
          description="Still readable in the dark."
          onConfirm={vi.fn()}
        />
      </div>,
    );
    expect(screen.getByText('Dark delete?')).toBeInTheDocument();
    expect(screen.getByText('Still readable in the dark.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
  });
});
