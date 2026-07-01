import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { StepProgress } from '@/components/shared/step-progress';

const STEPS = ['Account', 'Profile', 'Niche', 'Review'];

describe('<StepProgress>', () => {
  it('renders one desktop indicator (<li>) per step', () => {
    render(<StepProgress steps={STEPS} current={1} />);
    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(STEPS.length);
  });

  it('marks exactly the steps before `current` as done (rendered as a check icon)', () => {
    // Done circles render a lucide <Check> svg in place of the number; active and
    // upcoming circles render a plain number. So the svg count in the <ol> equals
    // the number of completed steps, i.e. `current`.
    const list = render(<StepProgress steps={STEPS} current={2} />).container.querySelector('ol')!;
    expect(list.querySelectorAll('svg')).toHaveLength(2);
  });

  it('first step: nothing is done and the active circle shows "1"', () => {
    const { container } = render(<StepProgress steps={STEPS} current={0} />);
    const ol = container.querySelector('ol')!;
    // No completed steps → no check icons.
    expect(ol.querySelectorAll('svg')).toHaveLength(0);
    // Active circle shows the 1-based number.
    expect(within(ol).getByText('1')).toBeInTheDocument();
    // Mobile counter reflects step 1 of 4.
    expect(screen.getByText(/^1\/4$/)).toBeInTheDocument();
  });

  it('last step: every prior step is done and the active circle shows the final number', () => {
    const { container } = render(<StepProgress steps={STEPS} current={3} />);
    const ol = container.querySelector('ol')!;
    // Steps 0,1,2 are done → 3 check icons.
    expect(ol.querySelectorAll('svg')).toHaveLength(3);
    // The active (last) circle shows "4"; earlier numbers are replaced by checks.
    expect(within(ol).getByText('4')).toBeInTheDocument();
    expect(within(ol).queryByText('1')).not.toBeInTheDocument();
    // Mobile counter reflects step 4 of 4.
    expect(screen.getByText(/^4\/4$/)).toBeInTheDocument();
  });

  it('shows the active step label in both the mobile summary and the desktop list', () => {
    render(<StepProgress steps={STEPS} current={1} />);
    // Active label appears twice: once in the mobile header, once in the desktop list.
    expect(screen.getAllByText('Profile')).toHaveLength(2);
    // A non-active label appears only in the desktop list.
    expect(screen.getAllByText('Account')).toHaveLength(1);
  });

  it('renders the mobile fill bar width from the 1-based progress percentage', () => {
    const { container } = render(<StepProgress steps={STEPS} current={1} />);
    // (current + 1) / steps.length * 100 = 2/4 * 100 = 50%.
    const fill = container.querySelector('[style*="width"]') as HTMLElement;
    expect(fill.style.width).toBe('50%');
  });

  it('single-step progress renders one item and a full (100%) bar', () => {
    const { container } = render(<StepProgress steps={['Only']} current={0} />);
    const ol = container.querySelector('ol')!;
    expect(within(ol).getAllByRole('listitem')).toHaveLength(1);
    // length === 1 short-circuits pct to 100.
    const fill = container.querySelector('[style*="width"]') as HTMLElement;
    expect(fill.style.width).toBe('100%');
    expect(screen.getByText(/^1\/1$/)).toBeInTheDocument();
  });

  it('merges a custom className onto the root container', () => {
    const { container } = render(<StepProgress steps={STEPS} current={0} className="mb-8" />);
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass('mb-8');
    expect(root).toHaveClass('w-full');
  });

  // jsdom has no CSS, so dark-mode visuals are not assertable. We only verify the
  // stepper still renders the same indicators/labels without crashing inside a
  // `.dark` wrapper.
  it('renders the same indicators inside a dark-mode wrapper', () => {
    const { container } = render(
      <div className="dark">
        <StepProgress steps={STEPS} current={2} />
      </div>,
    );
    const ol = container.querySelector('ol')!;
    expect(within(ol).getAllByRole('listitem')).toHaveLength(STEPS.length);
    expect(within(ol).getByText('Niche')).toBeInTheDocument();
    // Two completed steps render check icons even in dark mode.
    expect(ol.querySelectorAll('svg')).toHaveLength(2);
  });
});
