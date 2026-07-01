import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorState } from '@/components/shared/error-state';

describe('<ErrorState>', () => {
  it('renders the default title and description when no props are passed', () => {
    render(<ErrorState />);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Something went wrong');
    expect(
      screen.getByText(/An unexpected error occurred\. You can try again/i),
    ).toBeInTheDocument();
  });

  it('renders a custom title', () => {
    render(<ErrorState title="Failed to load campaigns" />);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Failed to load campaigns');
  });

  it('renders a custom description', () => {
    render(<ErrorState description="The server hiccuped." />);
    expect(screen.getByText('The server hiccuped.')).toBeInTheDocument();
  });

  it('omits the description paragraph when description is an empty string (falsy)', () => {
    const { container } = render(<ErrorState description="" />);
    expect(container.querySelector('p')).toBeNull();
  });

  it('does not render the "Try again" button when onRetry is absent', () => {
    render(<ErrorState />);
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('renders a "Try again" button when onRetry is provided', () => {
    render(<ErrorState onRetry={() => {}} />);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('fires onRetry when the "Try again" button is clicked', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders an extra action node alongside the retry button', () => {
    render(
      <ErrorState onRetry={() => {}} action={<a href="/">Go home</a>} />,
    );
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go home' })).toBeInTheDocument();
  });

  it('renders an action node even when onRetry is absent', () => {
    render(<ErrorState action={<a href="/">Go home</a>} />);
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go home' })).toBeInTheDocument();
  });

  it('merges a custom className onto the root container alongside the base classes', () => {
    const { container } = render(<ErrorState className="my-custom-class" />);
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass('my-custom-class');
    expect(root).toHaveClass('text-center');
    expect(root).toHaveClass('flex');
  });

  // jsdom has no CSS, so dark-mode colors are not assertable. We only verify the
  // component still renders the same content/structure (and the retry handler
  // still wires up) without crashing inside a `.dark` wrapper.
  it('renders and stays interactive inside a dark-mode wrapper', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <div className="dark">
        <ErrorState title="Dark error" onRetry={onRetry} />
      </div>,
    );
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Dark error');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
