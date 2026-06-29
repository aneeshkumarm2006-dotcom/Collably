import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar } from '@/components/shared/avatar';

/**
 * NOTE on the image branch: `Avatar` is built on the Radix avatar primitive,
 * which only mounts its <img> once the browser reports the image as *loaded*
 * (and shows the initials fallback only after a delay timer otherwise). jsdom
 * never fetches resources, so by default the <img> never resolves and the
 * fallback is gated behind its `delayMs` timer. The tests below assert what
 * ACTUALLY renders:
 *   - src case: we stub `window.Image` with a "loaded" image so the real
 *     AvatarImage branch mounts, then assert the <img> (role="img").
 *   - fallback case: we wait for the delay timer and assert the initials text.
 */

// A fake Image whose `complete`/`naturalWidth` make Radix treat it as loaded.
class LoadedImage {
  complete = true;
  naturalWidth = 1;
  referrerPolicy = '';
  crossOrigin: string | null = null;
  private _src = '';
  set src(v: string) {
    this._src = v;
  }
  get src() {
    return this._src;
  }
  addEventListener() {}
  removeEventListener() {}
}

describe('<Avatar> with a src (image branch)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the <img> with the given src and alt=name (role "img")', () => {
    vi.stubGlobal('Image', LoadedImage as unknown as typeof Image);
    render(<Avatar name="Maya Bennett" src="https://img/a.jpg" />);
    const img = screen.getByRole('img', { name: 'Maya Bennett' });
    expect(img).toHaveAttribute('src', 'https://img/a.jpg');
    expect(img).toHaveAttribute('alt', 'Maya Bennett');
  });

  it('exposes the name as the root aria-label', () => {
    vi.stubGlobal('Image', LoadedImage as unknown as typeof Image);
    const { container } = render(<Avatar name="Maya Bennett" src="https://img/a.jpg" />);
    expect(container.firstChild as HTMLElement).toHaveAttribute('aria-label', 'Maya Bennett');
  });
});

describe('<Avatar> without a src (initials fallback)', () => {
  it('shows the initials when no src is given', async () => {
    render(<Avatar name="Maya Bennett" />);
    // Fallback is gated behind a (0ms) delay timer → query asynchronously.
    expect(await screen.findByText('MB')).toBeInTheDocument();
  });

  it('shows the initials when src is explicitly null', async () => {
    render(<Avatar name="Cher" src={null} />);
    expect(await screen.findByText('C')).toBeInTheDocument();
  });

  it('exposes the name as the root aria-label even without an image', () => {
    const { container } = render(<Avatar name="Maya Bennett" />);
    expect(container.firstChild as HTMLElement).toHaveAttribute('aria-label', 'Maya Bennett');
  });
});

describe('<Avatar> shape', () => {
  it('uses a circle (rounded-full) radius by default', () => {
    const { container } = render(<Avatar name="Maya Bennett" />);
    expect(container.firstChild as HTMLElement).toHaveClass('rounded-full');
  });

  it('uses a rounded-square (rounded-md) radius when shape="square"', () => {
    const { container } = render(<Avatar name="Maya Bennett" shape="square" />);
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass('rounded-md');
    // tailwind-merge collapses the conflicting radius → no rounded-full left.
    expect(root).not.toHaveClass('rounded-full');
  });
});

describe('<Avatar> sizing + className', () => {
  it('applies the size as inline width/height (default 40px)', () => {
    const { container } = render(<Avatar name="Maya Bennett" />);
    const root = container.firstChild as HTMLElement;
    expect(root.style.width).toBe('40px');
    expect(root.style.height).toBe('40px');
  });

  it('honors an explicit size', () => {
    const { container } = render(<Avatar name="Maya Bennett" size={64} />);
    const root = container.firstChild as HTMLElement;
    expect(root.style.width).toBe('64px');
    expect(root.style.height).toBe('64px');
  });

  it('forwards an extra className onto the root', () => {
    const { container } = render(<Avatar name="Maya Bennett" className="ring-2" />);
    expect(container.firstChild as HTMLElement).toHaveClass('ring-2');
  });
});

describe('<Avatar> dark mode', () => {
  it('renders the initials fallback stably under a .dark wrapper (jsdom has no CSS)', async () => {
    render(
      <div className="dark">
        <Avatar name="Anees Kumar" />
      </div>,
    );
    expect(await screen.findByText('AK')).toBeInTheDocument();
  });
});
