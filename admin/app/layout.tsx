import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Collably Admin',
  description: 'Verify creators and businesses',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-page font-sans text-ink antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
