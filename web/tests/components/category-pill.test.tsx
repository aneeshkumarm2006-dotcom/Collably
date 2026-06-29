import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoryPill } from '@/components/shared/category-pill';

describe('<CategoryPill> (static span)', () => {
  it('renders the icon + name for a known category', () => {
    const { container } = render(<CategoryPill category="Restaurant" />);
    // Restaurant maps to the UtensilsCrossed icon.
    expect(container.querySelector('.lucide-utensils-crossed')).toBeTruthy();
    expect(screen.getByText('Restaurant')).toBeInTheDocument();
    // No onClick renders a <span>, not a button.
    expect((container.firstChild as HTMLElement).tagName).toBe('SPAN');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('falls back to the tag icon for an unknown category', () => {
    const { container } = render(<CategoryPill category="Quantum Widgets" />);
    expect(container.querySelector('.lucide-tag')).toBeTruthy();
    expect(screen.getByText('Quantum Widgets')).toBeInTheDocument();
  });

  it('renders the count (green mono) when a number is supplied', () => {
    render(<CategoryPill category="Cafe" count={12} />);
    const count = screen.getByText('12');
    expect(count).toBeInTheDocument();
    expect(count).toHaveClass('text-money');
  });

  it('renders a count of 0 (boundary: typeof number is the gate, not truthiness)', () => {
    render(<CategoryPill category="Cafe" count={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('omits the count when it is undefined', () => {
    const { container } = render(<CategoryPill category="Cafe" />);
    // The only numeric/mono node is the count; none should exist.
    expect(container.querySelector('.text-money')).toBeNull();
  });

  it('forwards an extra className onto the root span', () => {
    const { container } = render(<CategoryPill category="Tech" className="custom-y" />);
    expect(container.firstChild as HTMLElement).toHaveClass('custom-y');
  });
});

describe('<CategoryPill> (interactive button)', () => {
  it('renders a <button type=button> when onClick is provided', () => {
    render(<CategoryPill category="Beauty" onClick={() => {}} />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('type', 'button');
    expect(screen.getByText('Beauty')).toBeInTheDocument();
  });

  it('fires onClick when pressed', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<CategoryPill category="Beauty" onClick={onClick} />);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('reflects active state via aria-pressed and the brand styling', () => {
    render(<CategoryPill category="Fitness" active onClick={() => {}} />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(btn).toHaveClass('border-brand');
    expect(btn).toHaveClass('text-brand');
  });

  it('marks aria-pressed false and uses the muted styling when inactive', () => {
    render(<CategoryPill category="Fitness" active={false} onClick={() => {}} />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(btn).toHaveClass('text-muted');
  });
});

describe('<CategoryPill> dark mode', () => {
  it('renders the same content nested under a .dark wrapper (jsdom has no CSS)', () => {
    // jsdom applies no CSS; the honest assertion is structural stability.
    const { container } = render(
      <div className="dark">
        <CategoryPill category="Travel" count={3} />
      </div>,
    );
    expect(screen.getByText('Travel')).toBeInTheDocument();
    expect(container.querySelector('.lucide-plane')).toBeTruthy();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
