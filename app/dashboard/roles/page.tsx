'use client';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { useUserProfile } from '@/firebase/auth/use-user-profile';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RoleList } from '@/components/dashboard/role-list';

export default function RolesPage() {
  const { profile } = useUserProfile();

  return (
    <div className="p-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Role Management</CardTitle>
              <CardDescription>Manage roles and their permissions.</CardDescription>
            </div>
            {profile?.role === 'super_admin' && (
              <Link href="/dashboard/roles/add" passHref>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Role
                </Button>
              </Link>
            )}
        </CardHeader>
        <CardContent>
          <RoleList />
        </CardContent>
      </Card>
    </div>
  );
}
