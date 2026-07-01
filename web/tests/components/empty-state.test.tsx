import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/components/shared/empty-state';

describe('<EmptyState>', () => {
  it('always renders the title as an <h3> heading', () => {
    render(<EmptyState title="Nothing here yet" />);
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toHaveTextContent('Nothing here yet');
  });

  it('omits the description when not provided', () => {
    const { container } = render(<EmptyState title="Empty" />);
    // No <p> (description) should be in the tree.
    expect(container.querySelector('p')).toBeNull();
  });

  it('renders the description paragraph when provided', () => {
    render(<EmptyState title="Empty" description="Try a different filter." />);
    expect(screen.getByText('Try a different filter.')).toBeInTheDocument();
  });

  it('omits the description when given an empty string (falsy)', () => {
    const { container } = render(<EmptyState title="Empty" description="" />);
    expect(container.querySelector('p')).toBeNull();
  });

  it('omits the icon wrapper when no icon is provided', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByTestId('the-icon')).not.toBeInTheDocument();
  });

  it('renders the icon only when provided', () => {
    render(<EmptyState title="Empty" icon={<svg data-testid="the-icon" />} />);
    expect(screen.getByTestId('the-icon')).toBeInTheDocument();
  });

  it('omits the action when not provided', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders the action node only when provided', () => {
    render(<EmptyState title="Empty" action={<button type="button">Reset</button>} />);
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  });

  it('merges a custom className onto the root container alongside the base classes', () => {
    const { container } = render(<EmptyState title="Empty" className="my-custom-class" />);
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass('my-custom-class');
    // Base layout classes are preserved by cn()/twMerge.
    expect(root).toHaveClass('text-center');
    expect(root).toHaveClass('flex');
  });

  it('renders all optional slots together (happy path)', () => {
    render(
      <EmptyState
        title="No campaigns"
        description="Nothing matches your search."
        icon={<svg data-testid="the-icon" />}
        action={<button type="button">Clear filters</button>}
      />,
    );
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('No campaigns');
    expect(screen.getByText('Nothing matches your search.')).toBeInTheDocument();
    expect(screen.getByTestId('the-icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
  });

  // jsdom has no CSS, so we cannot assert dark-mode colors. The honest extent of
  // dark-mode testing here is that the component still renders the same content
  // and structure without crashing inside a `.dark` wrapper.
  it('renders the same content/structure inside a dark-mode wrapper', () => {
    render(
      <div className="dark">
        <EmptyState title="No campaigns" description="Nothing matches." />
      </div>,
    );
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('No campaigns');
    expect(screen.getByText('Nothing matches.')).toBeInTheDocument();
  });
});
