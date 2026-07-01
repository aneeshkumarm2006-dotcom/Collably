import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge, statusTone } from '@/components/shared/status-badge';

describe('statusTone', () => {
  it('maps known campaign + application statuses to tones', () => {
    expect(statusTone('Active')).toBe('success');
    expect(statusTone('Pending')).toBe('warn');
    expect(statusTone('Rejected')).toBe('danger');
    expect(statusTone('Completed')).toBe('info');
    expect(statusTone('Draft')).toBe('neutral');
  });

  it('falls back to neutral for an unknown status', () => {
    expect(statusTone('Something else')).toBe('neutral');
  });
});

describe('<StatusBadge>', () => {
  it('renders the status label', () => {
    render(<StatusBadge status="Active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('applies the auto-derived tone class', () => {
    const { container } = render(<StatusBadge status="Rejected" />);
    expect(container.firstChild).toHaveClass('bg-danger-soft', 'text-danger');
  });

  it('honors a tone override', () => {
    const { container } = render(<StatusBadge status="Active" tone="warn" />);
    expect(container.firstChild).toHaveClass('bg-warn-soft', 'text-warn');
  });

  it('renders a leading dot by default and hides it on request', () => {
    const { container, rerender } = render(<StatusBadge status="Active" />);
    // dot + label = 2 spans nested in the badge span
    expect(container.querySelectorAll('span').length).toBeGreaterThan(1);

    rerender(<StatusBadge status="Active" hideDot />);
    // only the outer badge span remains (no inner dot span)
    expect(container.querySelectorAll('span').length).toBe(1);
  });

  it('merges a custom className', () => {
    const { container } = render(<StatusBadge status="Active" className="custom-x" />);
    expect(container.firstChild).toHaveClass('custom-x');
  });
});
