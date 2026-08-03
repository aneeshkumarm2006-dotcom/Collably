import { TopNav } from '@/components/TopNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-page">
      <TopNav />
      <main className="px-4 py-6 md:px-8 md:pb-16">{children}</main>
    </div>
  );
}
