'use client';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { useUserProfile } from '@/firebase/auth/use-user-profile';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TeamList } from '@/components/dashboard/team-list';

export default function TeamPage() {
  const { profile, isLoading } = useUserProfile();

  if (isLoading || !profile) {
    return (
      <div className="p-8">
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Team Management</CardTitle>
              <CardDescription>Manage roles and permissions for your team members.</CardDescription>
            </div>
            {(profile?.role === 'super_admin' || profile?.permissions?.team?.create) && (
              <Link href="/dashboard/team/add" passHref>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Team Member
                </Button>
              </Link>
            )}
        </CardHeader>
        <CardContent>
          <TeamList />
        </CardContent>
      </Card>
    </div>
  );
}
