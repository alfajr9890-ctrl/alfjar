'use client';

import { useTransition } from 'react';
import { LogOut } from 'lucide-react';

import { logout } from '@/lib/actions';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <form action={() => startTransition(() => logout())}>
      <Button type="submit" variant="ghost" className="w-full justify-start" disabled={isPending}>
        <LogOut className="mr-2 h-4 w-4" />
        {isPending ? 'Logging out...' : 'Logout'}
      </Button>
    </form>
  );
}
