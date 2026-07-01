import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import {
  ApplicationCard,
  type ApplicationCardProps,
} from '@/components/shared/application-card';

/**
 * Realistic props built from ApplicationCardProps. `creator` mirrors the
 * `{ name, handle?, avatar?, followers? }` shape the component types.
 */
function makeProps(overrides: Partial<ApplicationCardProps> = {}): ApplicationCardProps {
  return {
    creator: { name: 'Maya Bennett', handle: '@maya', avatar: null, followers: 12000 },
    status: 'Pending',
    meta: 'Applied 2 days ago · Spring Tasting Menu',
    pitch: 'I would love to feature your tasting menu to my food-loving audience.',
    portfolio: ['/p1.jpg', '/p2.jpg'],
    date: 'Applied 2 days ago',
    ...overrides,
  };
}

function root(container: HTMLElement): HTMLElement {
  return container.firstChild as HTMLElement;
}

describe('<ApplicationCard> identity block', () => {
  it('renders the creator name, handle, compact follower count and meta', () => {
    render(<ApplicationCard {...makeProps()} />);
    expect(screen.getByRole('heading', { name: 'Maya Bennett' })).toBeInTheDocument();
    expect(screen.getByText('@maya')).toBeInTheDocument();
    // followers run through formatCompactNumber: 12000 -> "12K".
    expect(screen.getByText(/12K followers/)).toBeInTheDocument();
    expect(screen.getByText('Applied 2 days ago · Spring Tasting Menu')).toBeInTheDocument();
  });

  it('exposes the avatar via its aria-label', () => {
    const { container } = render(<ApplicationCard {...makeProps()} />);
    expect(container.querySelector('[aria-label="Maya Bennett"]')).not.toBeNull();
  });

  it('renders followers when the count is exactly 0 (typeof number, not falsy-skipped)', () => {
    render(
      <ApplicationCard {...makeProps({ creator: { name: 'Zero Fan', followers: 0 } })} />,
    );
    expect(screen.getByText(/0 followers/)).toBeInTheDocument();
  });

  it('shows the handle alone when there is no follower count', () => {
    render(
      <ApplicationCard {...makeProps({ creator: { name: 'Solo Star', handle: '@solo' } })} />,
    );
    expect(screen.getByText('@solo')).toBeInTheDocument();
    expect(screen.queryByText(/followers/)).toBeNull();
  });

  it('omits the handle/followers row entirely when neither is present', () => {
    render(
      <ApplicationCard {...makeProps({ creator: { name: 'Nameless Only' } })} />,
    );
    expect(screen.getByRole('heading', { name: 'Nameless Only' })).toBeInTheDocument();
    expect(screen.queryByText(/followers/)).toBeNull();
    expect(screen.queryByText('@')).toBeNull();
  });
});

describe('<ApplicationCard> across decision states', () => {
  it('PENDING: shows the status badge and a neutral (non-success/danger) accent without dimming', () => {
    const { container } = render(<ApplicationCard {...makeProps({ status: 'Pending' })} />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(root(container)).toHaveClass('border-l-hair');
    expect(root(container)).not.toHaveClass('opacity-65');
  });

  it('ACCEPTED: shows the status badge and a success (green) left accent, not dimmed', () => {
    const { container } = render(<ApplicationCard {...makeProps({ status: 'Accepted' })} />);
    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(root(container)).toHaveClass('border-l-success');
    expect(root(container)).not.toHaveClass('opacity-65');
  });

  it('REJECTED: shows the status badge, a danger (red) accent AND the dimmed opacity', () => {
    const { container } = render(<ApplicationCard {...makeProps({ status: 'Rejected' })} />);
    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(root(container)).toHaveClass('border-l-danger');
    expect(root(container)).toHaveClass('opacity-65');
  });
});

describe('<ApplicationCard> pitch + portfolio', () => {
  it('renders the pitch inside a blockquote when provided', () => {
    const { container } = render(
      <ApplicationCard {...makeProps({ pitch: 'My standout pitch sentence.' })} />,
    );
    expect(screen.getByText(/My standout pitch sentence\./)).toBeInTheDocument();
    expect(container.querySelector('blockquote')).not.toBeNull();
  });

  it('omits the blockquote when there is no pitch', () => {
    const { container } = render(<ApplicationCard {...makeProps({ pitch: undefined })} />);
    expect(container.querySelector('blockquote')).toBeNull();
  });

  it('renders portfolio thumbnails (decorative imgs, queried via the DOM)', () => {
    const { container } = render(
      <ApplicationCard {...makeProps({ portfolio: ['/a.jpg', '/b.jpg', '/c.jpg'] })} />,
    );
    const imgs = container.querySelectorAll('img');
    expect(imgs).toHaveLength(3);
    expect(imgs[0]).toHaveAttribute('src', '/a.jpg');
  });

  it('caps the portfolio strip at the first 5 thumbnails', () => {
    const { container } = render(
      <ApplicationCard
        {...makeProps({
          portfolio: ['/1.jpg', '/2.jpg', '/3.jpg', '/4.jpg', '/5.jpg', '/6.jpg'],
        })}
      />,
    );
    const imgs = container.querySelectorAll('img');
    expect(imgs).toHaveLength(5);
    const srcs = Array.from(imgs).map((i) => i.getAttribute('src'));
    expect(srcs).not.toContain('/6.jpg');
  });

  it('renders no thumbnails for an empty or absent portfolio', () => {
    const { container: emptyArr } = render(
      <ApplicationCard {...makeProps({ portfolio: [] })} />,
    );
    expect(emptyArr.querySelectorAll('img')).toHaveLength(0);

    const { container: noProp } = render(
      <ApplicationCard {...makeProps({ portfolio: undefined })} />,
    );
    expect(noProp.querySelectorAll('img')).toHaveLength(0);
  });
});

describe('<ApplicationCard> footer (date + actions)', () => {
  it('renders the date when provided', () => {
    render(<ApplicationCard {...makeProps({ date: 'Applied 4 days ago', actions: undefined })} />);
    expect(screen.getByText('Applied 4 days ago')).toBeInTheDocument();
  });

  it('renders decision actions when provided', () => {
    render(
      <ApplicationCard
        {...makeProps({
          date: undefined,
          actions: (
            <>
              <button>Accept</button>
              <button>Reject</button>
            </>
          ),
        })}
      />,
    );
    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
  });

  it('renders no footer affordances when neither date nor actions are present', () => {
    render(<ApplicationCard {...makeProps({ date: undefined, actions: undefined })} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText(/Applied 2 days ago$/)).toBeNull();
  });

  it('forwards a custom className onto the root element', () => {
    const { container } = render(
      <ApplicationCard {...makeProps({ className: 'my-custom-card' })} />,
    );
    expect(root(container)).toHaveClass('my-custom-card');
  });
});

describe('<ApplicationCard> dark mode', () => {
  it('renders the same content/structure inside a .dark wrapper (jsdom has no CSS, so this only asserts a stable render, not colors)', () => {
    const { container } = render(
      <div className="dark">
        <ApplicationCard {...makeProps({ status: 'Accepted' })} />
      </div>,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('dark');
    expect(within(wrapper).getByRole('heading', { name: 'Maya Bennett' })).toBeInTheDocument();
    expect(within(wrapper).getByText('Accepted')).toBeInTheDocument();
    expect(within(wrapper).getByText(/12K followers/)).toBeInTheDocument();
  });
});
