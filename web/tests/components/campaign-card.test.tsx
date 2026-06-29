import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { CampaignCard, type CampaignCardData } from '@/components/shared/campaign-card';

function makeCampaign(overrides: Partial<CampaignCardData> = {}): CampaignCardData {
  return {
    id: 'cmp1',
    title: 'Tasting Menu for Two',
    category: 'Restaurant',
    coverImage: null,
    business: { name: 'Maple & Oak', city: 'Toronto', avatar: null },
    reward: { type: 'Experience', description: '7-course tasting', estimatedValue: 180 },
    platform: 'Instagram',
    contentType: 'Reel',
    quantity: 1,
    deadline: '2026-07-21T12:00:00.000Z',
    applicationsCount: 4,
    ...overrides,
  };
}

describe('<CampaignCard> (full variant)', () => {
  it('links to the campaign detail by default', () => {
    render(<CampaignCard campaign={makeCampaign()} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/campaign/cmp1');
  });

  it('renders title, business, reward value, and applicant count', () => {
    render(<CampaignCard campaign={makeCampaign()} />);
    expect(screen.getByText('Tasting Menu for Two')).toBeInTheDocument();
    expect(screen.getByText('Maple & Oak')).toBeInTheDocument();
    expect(screen.getByText(/\$180/)).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('shows the category emoji fallback when there is no cover image', () => {
    render(<CampaignCard campaign={makeCampaign({ coverImage: null })} />);
    // Restaurant → 🍽️ appears (emoji fallback inside the cover)
    expect(screen.getAllByText('🍽️', { exact: false }).length).toBeGreaterThan(0);
  });

  it('renders the cover <img> when a cover image is provided', () => {
    // The cover is decorative (alt="") so it has no "img" a11y role — query the DOM node.
    const { container } = render(
      <CampaignCard campaign={makeCampaign({ coverImage: 'https://img/x.jpg' })} />,
    );
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://img/x.jpg');
  });

  it('paints the application-status overlay', () => {
    render(<CampaignCard campaign={makeCampaign({ applicationStatus: 'accepted' })} />);
    expect(screen.getByText('✓ Accepted')).toBeInTheDocument();
  });

  it('shows the "Campaign Closed" badge when closed', () => {
    render(<CampaignCard campaign={makeCampaign({ closed: true })} />);
    expect(screen.getByText('Campaign Closed')).toBeInTheDocument();
  });

  it('honors an explicit href override', () => {
    render(<CampaignCard campaign={makeCampaign()} href="/dashboard/creator/explore" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/dashboard/creator/explore');
  });
});

describe('<CampaignCard> (compact variant)', () => {
  it('renders a condensed card with title + reward', () => {
    render(<CampaignCard campaign={makeCampaign()} variant="compact" />);
    const link = screen.getByRole('link');
    expect(within(link).getByText('Tasting Menu for Two')).toBeInTheDocument();
    expect(within(link).getByText(/\$180/)).toBeInTheDocument();
  });
});
