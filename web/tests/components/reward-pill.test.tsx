import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { CampaignReward } from '@/lib/shared';
import { RewardPill } from '@/components/shared/reward-pill';

function makeReward(overrides: Partial<CampaignReward> = {}): CampaignReward {
  return {
    type: 'Product',
    description: 'Free product',
    estimatedValue: 180,
    ...overrides,
  };
}

describe('<RewardPill>', () => {
  it('renders the reward-type icon (Product maps to the gift icon)', () => {
    const { container } = render(<RewardPill reward={makeReward({ type: 'Product' })} />);
    expect(container.querySelector('.lucide-gift')).toBeTruthy();
  });

  it('maps a different reward type to its own icon (Experience maps to sparkles)', () => {
    const { container } = render(<RewardPill reward={makeReward({ type: 'Experience' })} />);
    expect(container.querySelector('.lucide-sparkles')).toBeTruthy();
  });

  it('uses the description as the label when present', () => {
    render(<RewardPill reward={makeReward({ description: '7-course tasting' })} />);
    expect(screen.getByText('7-course tasting')).toBeInTheDocument();
  });

  it('falls back to the reward type as the label when the description is empty', () => {
    render(<RewardPill reward={makeReward({ description: '', type: 'Voucher' })} />);
    expect(screen.getByText('Voucher')).toBeInTheDocument();
  });

  it('shows the green money value when estimatedValue > 0', () => {
    render(<RewardPill reward={makeReward({ estimatedValue: 180 })} />);
    const value = screen.getByText(/\$180/);
    expect(value).toBeInTheDocument();
    // Value is rendered with the leading separator + the money accent class.
    expect(value).toHaveTextContent('· $180');
    expect(value).toHaveClass('text-money');
  });

  it('omits the value when estimatedValue is 0', () => {
    render(<RewardPill reward={makeReward({ estimatedValue: 0 })} />);
    expect(screen.queryByText(/\$\d/)).toBeNull();
  });

  it('omits the value when estimatedValue is undefined', () => {
    render(<RewardPill reward={makeReward({ estimatedValue: undefined })} />);
    expect(screen.queryByText(/\$\d/)).toBeNull();
  });

  it('omits the value for negative estimatedValue (only > 0 qualifies)', () => {
    render(<RewardPill reward={makeReward({ estimatedValue: -5 })} />);
    expect(screen.queryByText(/\$/)).toBeNull();
  });

  it('applies the small (sm) chip sizing by default', () => {
    const { container } = render(<RewardPill reward={makeReward()} />);
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass('px-2.5');
    expect(root).toHaveClass('text-[13px]');
    expect(root).not.toHaveClass('w-full');
  });

  it('applies the large (lg) full-width sizing when size="lg"', () => {
    const { container } = render(<RewardPill reward={makeReward()} size="lg" />);
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass('w-full');
    expect(root).toHaveClass('text-[15px]');
    expect(root).toHaveClass('px-4');
  });

  it('forwards an extra className onto the root', () => {
    const { container } = render(<RewardPill reward={makeReward()} className="custom-x" />);
    expect(container.firstChild as HTMLElement).toHaveClass('custom-x');
  });

  it('renders the same content inside a dark wrapper (jsdom has no CSS, content stability only)', () => {
    // jsdom does not apply CSS, so dark-mode = "renders the same structure/text
    // without crashing" when nested under a `.dark` ancestor.
    const { container } = render(
      <div className="dark">
        <RewardPill reward={makeReward({ description: 'Spa day', estimatedValue: 180 })} />
      </div>,
    );
    expect(screen.getByText('Spa day')).toBeInTheDocument();
    expect(screen.getByText(/\$180/)).toBeInTheDocument();
    expect(container.querySelector('.lucide-gift')).toBeTruthy();
  });
});
