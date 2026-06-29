import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from '@/components/shared/stat-card';

describe('<StatCard>', () => {
  it('renders the value and the label', () => {
    render(<StatCard label="Total earnings" value="$1,200" />);
    expect(screen.getByText('$1,200')).toBeInTheDocument();
    expect(screen.getByText('Total earnings')).toBeInTheDocument();
  });

  it('accepts a numeric value', () => {
    render(<StatCard label="Active collabs" value={7} />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('uses the neutral ink color by default (no money accent)', () => {
    render(<StatCard label="Active collabs" value="42" />);
    const value = screen.getByText('42');
    expect(value).toHaveClass('text-ink');
    expect(value).not.toHaveClass('text-money');
  });

  it('adds the money/green accent class when money is set', () => {
    render(<StatCard label="Earnings" value="$1,200" money />);
    const value = screen.getByText('$1,200');
    expect(value).toHaveClass('text-money');
    expect(value).not.toHaveClass('text-ink');
  });

  it('renders an up delta with its value and the up-right arrow', () => {
    const { container } = render(
      <StatCard label="Earnings" value="$1,200" delta={{ value: '+12%', direction: 'up' }} />,
    );
    const delta = screen.getByText('+12%');
    expect(delta).toBeInTheDocument();
    // Container of the delta carries the success tone; arrow is the up-right glyph.
    expect(delta).toHaveClass('text-success');
    expect(container.querySelector('svg.lucide-arrow-up-right')).not.toBeNull();
    expect(container.querySelector('svg.lucide-arrow-down-right')).toBeNull();
  });

  it('renders a down delta with its value and the down-right arrow', () => {
    const { container } = render(
      <StatCard label="Earnings" value="$1,200" delta={{ value: '-4%', direction: 'down' }} />,
    );
    const delta = screen.getByText('-4%');
    expect(delta).toBeInTheDocument();
    expect(delta).toHaveClass('text-danger');
    expect(container.querySelector('svg.lucide-arrow-down-right')).not.toBeNull();
    expect(container.querySelector('svg.lucide-arrow-up-right')).toBeNull();
  });

  it('omits the delta row entirely when no delta is given', () => {
    const { container } = render(<StatCard label="Earnings" value="$1,200" />);
    expect(container.querySelector('svg')).toBeNull();
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it('renders the optional icon slot when provided', () => {
    render(
      <StatCard
        label="Earnings"
        value="$1,200"
        icon={<svg data-testid="stat-icon" />}
      />,
    );
    expect(screen.getByTestId('stat-icon')).toBeInTheDocument();
  });

  it('omits the icon chip when no icon is provided', () => {
    render(<StatCard label="Earnings" value="$1,200" />);
    expect(screen.queryByTestId('stat-icon')).toBeNull();
  });

  it('forwards an extra className onto the root card', () => {
    const { container } = render(
      <StatCard label="Earnings" value="$1,200" className="col-span-2" />,
    );
    expect(container.firstChild as HTMLElement).toHaveClass('col-span-2');
  });

  it('renders the full set of slots together (value + label + delta + icon)', () => {
    render(
      <StatCard
        label="Earnings"
        value="$1,200"
        money
        delta={{ value: '+12%', direction: 'up' }}
        icon={<svg data-testid="stat-icon" />}
      />,
    );
    expect(screen.getByText('$1,200')).toHaveClass('text-money');
    expect(screen.getByText('Earnings')).toBeInTheDocument();
    expect(screen.getByText('+12%')).toBeInTheDocument();
    expect(screen.getByTestId('stat-icon')).toBeInTheDocument();
  });

  it('renders the same content under a .dark wrapper (jsdom has no CSS: content stability only)', () => {
    // jsdom applies no CSS; assert the content/structure survives a dark ancestor.
    render(
      <div className="dark">
        <StatCard label="Earnings" value="$1,200" money delta={{ value: '+12%', direction: 'up' }} />
      </div>,
    );
    expect(screen.getByText('$1,200')).toBeInTheDocument();
    expect(screen.getByText('Earnings')).toBeInTheDocument();
    expect(screen.getByText('+12%')).toBeInTheDocument();
  });
});
