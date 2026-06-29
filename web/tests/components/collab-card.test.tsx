import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { CampaignReward } from '@/lib/shared';
import {
  CollabCard,
  CountdownChip,
  type CollabCardProps,
} from '@/components/shared/collab-card';

/**
 * The deadline/countdown is computed from `Date.now()` (via daysUntil), so we
 * pin "now" with fake timers to make every countdown + urgency assertion
 * deterministic: mirroring tests/unit/format.test.ts.
 */
const NOW = new Date('2026-06-29T12:00:00.000Z');

const REWARD: CampaignReward = {
  type: 'Experience',
  description: '7-course tasting',
  estimatedValue: 180,
};

function makeProps(overrides: Partial<CollabCardProps> = {}): CollabCardProps {
  return {
    title: 'Spring Tasting Menu Collab',
    counterparty: { name: 'Maple & Oak', avatar: null, role: 'Restaurant' },
    status: 'Accepted',
    reward: REWARD,
    deadline: '2026-07-12T12:00:00.000Z', // ~13 days out -> "normal" urgency
    deliverables: [
      { label: 'Post 1 Instagram Reel', done: true },
      { label: 'Tag @mapleandoak', done: false },
    ],
    ...overrides,
  };
}

function root(container: HTMLElement): HTMLElement {
  return container.firstChild as HTMLElement;
}

describe('<CollabCard>', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('counterparty + title + status', () => {
    it('renders the title, counterparty name and role', () => {
      render(<CollabCard {...makeProps()} />);
      expect(screen.getByRole('heading', { name: 'Spring Tasting Menu Collab' })).toBeInTheDocument();
      expect(screen.getByText('Maple & Oak')).toBeInTheDocument();
      expect(screen.getByText('Restaurant')).toBeInTheDocument();
    });

    it('renders the status badge when a status is provided', () => {
      render(<CollabCard {...makeProps({ status: 'Accepted' })} />);
      expect(screen.getByText('Accepted')).toBeInTheDocument();
    });

    it('omits the status badge and counterparty role when not provided', () => {
      render(
        <CollabCard
          {...makeProps({ status: undefined, counterparty: { name: 'No Role Co' } })} />,
      );
      expect(screen.getByText('No Role Co')).toBeInTheDocument();
      expect(screen.queryByText('Accepted')).toBeNull();
      expect(screen.queryByText('Restaurant')).toBeNull();
    });
  });

  describe('deadline countdown + urgency treatment', () => {
    it('shows a future countdown with the NORMAL urgency treatment', () => {
      render(<CollabCard {...makeProps({ deadline: '2026-07-12T12:00:00.000Z' })} />);
      const chip = screen.getByText('13 days left');
      expect(chip).toBeInTheDocument();
      // urgency class reflects deadlineUrgency('normal') -> bg-secondary.
      // (asserting the class token, NOT a computed color: jsdom has no CSS.)
      expect(chip).toHaveClass('bg-secondary');
      expect(chip.querySelector('svg')).not.toBeNull(); // the Clock icon
    });

    it('shows the WARN urgency treatment when the deadline is within 2 days', () => {
      render(<CollabCard {...makeProps({ deadline: '2026-06-30T12:00:00.000Z' })} />);
      const chip = screen.getByText('1 day left');
      expect(chip).toHaveClass('bg-warn-soft');
    });

    it('treats a same-day deadline as "Due today" with WARN urgency', () => {
      render(<CollabCard {...makeProps({ deadline: '2026-06-29T12:00:00.000Z' })} />);
      const chip = screen.getByText('Due today');
      expect(chip).toHaveClass('bg-warn-soft');
    });

    it('shows the DANGER urgency treatment and overdue phrasing for a past deadline', () => {
      const { container } = render(
        <CollabCard {...makeProps({ status: 'Accepted', deadline: '2026-06-27T12:00:00.000Z' })} />,
      );
      const chip = screen.getByText('Overdue by 2 days');
      expect(chip).toHaveClass('bg-danger-soft');
      // a past deadline also flips the whole card into its overdue treatment.
      expect(root(container)).toHaveClass('bg-danger-soft');
      expect(root(container)).toHaveClass('border-l-danger');
    });

    it('flips the card into the overdue treatment when status is "Overdue" (no deadline needed)', () => {
      const { container } = render(
        <CollabCard {...makeProps({ status: 'Overdue', deadline: undefined })} />,
      );
      expect(root(container)).toHaveClass('bg-danger-soft');
      expect(screen.getByText('Overdue')).toBeInTheDocument();
    });

    it('does NOT apply the overdue treatment for a healthy future deadline', () => {
      const { container } = render(
        <CollabCard {...makeProps({ status: 'Accepted', deadline: '2026-07-12T12:00:00.000Z' })} />,
      );
      expect(root(container)).not.toHaveClass('bg-danger-soft');
    });

    it('renders no countdown chip when there is no deadline', () => {
      render(<CollabCard {...makeProps({ deadline: undefined })} />);
      expect(screen.queryByText(/left|Due today|Overdue/)).toBeNull();
    });
  });

  describe('reward', () => {
    it('renders the reward label, icon and money value', () => {
      const { container } = render(<CollabCard {...makeProps({ reward: REWARD })} />);
      expect(screen.getByText('7-course tasting')).toBeInTheDocument();
      expect(container.querySelector('.lucide-sparkles')).toBeTruthy(); // Experience icon
      // formatCurrency(180) -> "$180" (CAD, no fraction digits).
      expect(screen.getByText(/\$180/)).toBeInTheDocument();
    });

    it('renders a reward with no money value, falling back to the type label', () => {
      render(
        <CollabCard
          {...makeProps({ reward: { type: 'Service', description: '', estimatedValue: 0 } })} />,
      );
      expect(screen.getByText('Service')).toBeInTheDocument();
      expect(screen.queryByText(/\$/)).toBeNull();
    });

    it('renders no reward pill when no reward is provided', () => {
      render(<CollabCard {...makeProps({ reward: undefined })} />);
      expect(screen.queryByText('7-course tasting')).toBeNull();
    });
  });

  describe('deliverables checklist', () => {
    it('renders each deliverable, checking done items and striking their labels', () => {
      const { container } = render(<CollabCard {...makeProps()} />);
      const list = screen.getByRole('list');
      const items = within(list).getAllByRole('listitem');
      expect(items).toHaveLength(2);

      // a done deliverable shows the check marker and a struck-through label.
      expect(container.querySelector('.lucide-check')).toBeTruthy();
      expect(screen.getByText('Post 1 Instagram Reel')).toHaveClass('line-through');
      // a not-done deliverable label is not struck through.
      expect(screen.getByText('Tag @mapleandoak')).not.toHaveClass('line-through');
    });

    it('renders no list for an empty or absent deliverables array', () => {
      const { container: empty } = render(
        <CollabCard {...makeProps({ deliverables: [] })} />,
      );
      expect(within(empty).queryByRole('list')).toBeNull();

      const { container: none } = render(
        <CollabCard {...makeProps({ deliverables: undefined })} />,
      );
      expect(within(none).queryByRole('list')).toBeNull();
    });
  });

  describe('actions / Message affordance', () => {
    // NOTE: the SHARED CollabCard has no `conversationId` prop of its own: it
    // renders whatever the caller passes via the generic `actions` ReactNode.
    // The conversationId -> "Message" gating lives in the caller
    // (components/creator/creator-collab-card.tsx). These tests mirror that
    // pattern: the caller only mounts a Message link when a conversation exists.
    function actionsFor(conversationId?: string) {
      return conversationId ? (
        <a href={`/dashboard/creator/messages/${conversationId}`}>Message</a>
      ) : undefined;
    }

    it('renders the Message affordance when the caller supplies one (conversation present)', () => {
      render(<CollabCard {...makeProps({ actions: actionsFor('conv-123') })} />);
      const link = screen.getByRole('link', { name: 'Message' });
      expect(link).toHaveAttribute('href', '/dashboard/creator/messages/conv-123');
    });

    it('renders NO Message affordance when the caller supplies none (no conversation)', () => {
      render(<CollabCard {...makeProps({ actions: actionsFor(undefined) })} />);
      expect(screen.queryByRole('link', { name: 'Message' })).toBeNull();
    });
  });

  describe('dark mode', () => {
    it('renders the same content/structure inside a .dark wrapper (jsdom has no CSS, so this only asserts a stable render, not colors)', () => {
      const { container } = render(
        <div className="dark">
          <CollabCard {...makeProps({ deadline: '2026-07-12T12:00:00.000Z' })} />
        </div>,
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('dark');
      expect(
        within(wrapper).getByRole('heading', { name: 'Spring Tasting Menu Collab' }),
      ).toBeInTheDocument();
      expect(within(wrapper).getByText('Maple & Oak')).toBeInTheDocument();
      expect(within(wrapper).getByText('13 days left')).toBeInTheDocument();
      expect(within(wrapper).getByText('7-course tasting')).toBeInTheDocument();
    });
  });
});

describe('<CountdownChip> (exported helper)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders standalone with the countdown text and urgency class', () => {
    render(<CountdownChip deadline="2026-06-27T12:00:00.000Z" />);
    const chip = screen.getByText('Overdue by 2 days');
    expect(chip).toHaveClass('bg-danger-soft');
  });

  it('forwards a custom className', () => {
    render(<CountdownChip deadline="2026-07-12T12:00:00.000Z" className="extra-chip" />);
    expect(screen.getByText('13 days left')).toHaveClass('extra-chip');
  });
});
