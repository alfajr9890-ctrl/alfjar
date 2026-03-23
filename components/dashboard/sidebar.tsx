'use client'

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Home, Users, ArrowLeftRight, Users2, Shield, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LogoutButton } from '@/components/dashboard/logout-button';
import { useUserProfile } from '@/hooks/use-user-profile';
import { SidebarProfile } from '@/components/sidebar-profile';
import { Skeleton } from '../ui/skeleton';

export function DashboardSidebar() {
  const pathname = usePathname();
  const { profile, loading } = useUserProfile();

  const isSuperAdmin = profile?.role === 'super_admin';

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home, canView: profile?.permissions.dashboard.read },
    { href: '/dashboard/members', label: 'Members', icon: Users, canView: profile?.permissions.members.read },
    { href: '/dashboard/transactions', label: 'Transactions', icon: ArrowLeftRight, canView: profile?.permissions.transactions.read },
    { href: '/dashboard/team', label: 'Team', icon: Users2, canView: isSuperAdmin || profile?.permissions.team?.read },
    { href: '/dashboard/roles', label: 'Role Management', icon: Shield, canView: isSuperAdmin },
    { href: '/dashboard/logs', label: 'Logs', icon: ListChecks, canView: isSuperAdmin },
  ];
  
  const isActive = (href: string) => {
    if (href === '/dashboard/members') {
      return pathname.startsWith('/dashboard/members') || pathname === '/dashboard/add-member';
    }
    if (href === '/dashboard/transactions') {
      return pathname.startsWith('/dashboard/transactions');
    }
     if (href === '/dashboard/team') {
      return pathname.startsWith('/dashboard/team');
    }
    if (href === '/dashboard/roles') {
      return pathname.startsWith('/dashboard/roles');
    }
    if (href === '/dashboard/logs') {
      return pathname.startsWith('/dashboard/logs');
    }
    return pathname === href;
  };
  
  if (loading) {
      return (
          <div className="flex h-full flex-col">
              <div className="p-4 border-b flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-8 w-32" />
              </div>
              <nav className="flex-grow px-4 py-4 space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
              </nav>
              <div className="mt-auto p-4 border-t">
                  <Skeleton className="h-10 w-full" />
              </div>
          </div>
      )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="p-4 border-b flex items-center gap-3">
        <Image src="/logo.jpeg" alt="Al Fajr Logo" width={40} height={40} className="rounded-full object-cover" />
        <h1 className="text-2xl font-bold font-headline text-primary">
          Al Fajr
        </h1>
      </div>
      <nav className="flex-grow px-4 py-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            item.canView && (
            <li key={item.href}>
              <Button
                asChild
                variant={isActive(item.href) ? 'secondary' : 'ghost'}
                className="w-full justify-start"
              >
                <Link href={item.href}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            </li>
            )
          ))}
        </ul>
      </nav>
      <div className="mt-auto p-4 border-t flex flex-col gap-2">
        <SidebarProfile />
        <LogoutButton />
      </div>
    </div>
  );
}
