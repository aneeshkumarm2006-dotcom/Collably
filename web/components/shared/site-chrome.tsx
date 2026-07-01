import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';

/**
 * Public site chrome: the auth-aware `Navbar`, the page content, and the dark
 * `Footer`. Shared by the marketing and public-app route groups so both surfaces
 * frame their pages identically. `main` flexes to push the footer down on short
 * pages.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
