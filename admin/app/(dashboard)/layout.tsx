import { Sidebar } from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 px-6 py-8 md:px-10">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
