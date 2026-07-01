import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  NotificationBell,
  type NotificationItem,
} from '@/components/shared/notification-bell';

function makeItems(): NotificationItem[] {
  return [
    {
      id: 'n1',
      text: 'New application received',
      time: '2h ago',
      unread: true,
      dot: 'success',
      href: '/applications/1',
    },
    {
      id: 'n2',
      text: 'Campaign approved',
      time: '1d ago',
      unread: false,
      dot: 'brand',
      href: '/campaigns/2',
    },
    {
      id: 'n3',
      text: 'A note without a link',
      time: '3d ago',
      // no href → renders as a <div>, not an <a>
    },
  ];
}

describe('<NotificationBell> badge', () => {
  it('shows the server-authoritative unreadCount on the badge', () => {
    render(<NotificationBell notifications={makeItems()} unreadCount={5} />);
    expect(screen.getByRole('button', { name: 'Notifications, 5 unread' })).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('falls back to counting unread items when unreadCount is omitted', () => {
    // makeItems() has exactly one unread item.
    render(<NotificationBell notifications={makeItems()} />);
    expect(screen.getByRole('button', { name: 'Notifications, 1 unread' })).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('prefers unreadCount over the items count when both are available', () => {
    // Only one item is unread, but the server says 3.
    render(<NotificationBell notifications={makeItems()} unreadCount={3} />);
    expect(screen.getByRole('button', { name: 'Notifications, 3 unread' })).toBeInTheDocument();
  });

  it('caps the badge at "9+" once unread exceeds 9', () => {
    render(<NotificationBell notifications={makeItems()} unreadCount={42} />);
    expect(screen.getByText('9+')).toBeInTheDocument();
    // The aria-label still reflects the true count.
    expect(screen.getByRole('button', { name: 'Notifications, 42 unread' })).toBeInTheDocument();
  });

  it('shows the raw number (not "9+") at the boundary value of 9', () => {
    render(<NotificationBell notifications={makeItems()} unreadCount={9} />);
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.queryByText('9+')).not.toBeInTheDocument();
  });

  it('renders no badge and a plain label when there are zero unread', () => {
    render(<NotificationBell notifications={makeItems()} unreadCount={0} />);
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('renders no badge when there are no items at all', () => {
    render(<NotificationBell notifications={[]} />);
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
  });
});

describe('<NotificationBell> dropdown', () => {
  it('is closed initially: items are not in the DOM', () => {
    render(<NotificationBell notifications={makeItems()} onMarkAllRead={vi.fn()} />);
    expect(screen.queryByText('New application received')).not.toBeInTheDocument();
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
  });

  it('opens on trigger click and reveals the header + items', async () => {
    const user = userEvent.setup();
    render(<NotificationBell notifications={makeItems()} onMarkAllRead={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /Notifications/ }));

    expect(await screen.findByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('New application received')).toBeInTheDocument();
    expect(screen.getByText('Campaign approved')).toBeInTheDocument();
    expect(screen.getByText('A note without a link')).toBeInTheDocument();
    expect(screen.getByText('2h ago')).toBeInTheDocument();
  });

  it('links items that have an href and leaves linkless items as non-anchors', async () => {
    const user = userEvent.setup();
    render(<NotificationBell notifications={makeItems()} />);

    await user.click(screen.getByRole('button', { name: /Notifications/ }));

    const linked = await screen.findByText('New application received');
    expect(linked.closest('a')).toHaveAttribute('href', '/applications/1');

    const linked2 = screen.getByText('Campaign approved');
    expect(linked2.closest('a')).toHaveAttribute('href', '/campaigns/2');

    const unlinked = screen.getByText('A note without a link');
    expect(unlinked.closest('a')).toBeNull();
  });

  it('renders the "View all notifications" footer link with the default href', async () => {
    const user = userEvent.setup();
    render(<NotificationBell notifications={makeItems()} />);

    await user.click(screen.getByRole('button', { name: /Notifications/ }));

    const viewAll = await screen.findByRole('link', { name: /View all notifications/ });
    expect(viewAll).toHaveAttribute('href', '#');
  });

  it('honors a custom viewAllHref', async () => {
    const user = userEvent.setup();
    render(<NotificationBell notifications={makeItems()} viewAllHref="/notifications" />);

    await user.click(screen.getByRole('button', { name: /Notifications/ }));

    const viewAll = await screen.findByRole('link', { name: /View all notifications/ });
    expect(viewAll).toHaveAttribute('href', '/notifications');
  });

  it('shows the empty state when there are no notifications', async () => {
    const user = userEvent.setup();
    render(<NotificationBell notifications={[]} onMarkAllRead={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /Notifications/ }));

    expect(await screen.findByText(/all caught up/i)).toBeInTheDocument();
  });

  it('fires onMarkAllRead when "Mark all read" is clicked', async () => {
    const user = userEvent.setup();
    const onMarkAllRead = vi.fn();
    render(<NotificationBell notifications={makeItems()} onMarkAllRead={onMarkAllRead} />);

    await user.click(screen.getByRole('button', { name: /Notifications/ }));
    await user.click(await screen.findByRole('button', { name: 'Mark all read' }));

    expect(onMarkAllRead).toHaveBeenCalledTimes(1);
  });

  it('omits "Mark all read" when no handler is provided', async () => {
    const user = userEvent.setup();
    render(<NotificationBell notifications={makeItems()} />);

    await user.click(screen.getByRole('button', { name: /Notifications/ }));

    await screen.findByText('Notifications');
    expect(screen.queryByRole('button', { name: 'Mark all read' })).not.toBeInTheDocument();
  });

  it('renders ReactNode item text', async () => {
    const user = userEvent.setup();
    const items: NotificationItem[] = [
      { id: 'rich', text: <strong>Bold news</strong>, time: 'now', unread: true },
    ];
    render(<NotificationBell notifications={items} />);

    await user.click(screen.getByRole('button', { name: /Notifications/ }));

    expect(await screen.findByText('Bold news')).toBeInTheDocument();
  });
});

describe('<NotificationBell> dark mode', () => {
  it('renders identical content/structure inside a .dark wrapper (jsdom has no CSS: structure only)', async () => {
    // jsdom applies no CSS, so this only proves the component renders the same
    // content under a `.dark` ancestor without crashing: the honest extent of
    // jsdom dark-mode coverage.
    const user = userEvent.setup();
    render(
      <div className="dark">
        <NotificationBell notifications={makeItems()} unreadCount={2} onMarkAllRead={vi.fn()} />
      </div>,
    );

    expect(screen.getByRole('button', { name: 'Notifications, 2 unread' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Notifications/ }));
    expect(await screen.findByText('New application received')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark all read' })).toBeInTheDocument();
  });
});
