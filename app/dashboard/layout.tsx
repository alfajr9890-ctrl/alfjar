import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { MobileNav } from '@/components/dashboard/mobile-nav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b bg-sidebar">
        <h1 className="text-xl font-bold font-headline text-primary">Al Fajr</h1>
        <MobileNav />
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-[30%] min-w-[280px] max-w-[320px] bg-sidebar border-r flex-col sticky top-0 h-screen">
        <DashboardSidebar />
      </aside>

      {/* Main Content */}
      <main className="w-full lg:flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
