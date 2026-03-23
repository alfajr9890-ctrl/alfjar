'use client';

import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MemberList } from '@/components/dashboard/member-list';
import { useUserProfile } from '@/firebase/auth/use-user-profile';

export default function MembersPage() {
  const { profile } = useUserProfile();
  return (
    <div className="p-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Members</CardTitle>
            <CardDescription>A list of all registered members.</CardDescription>
          </div>
          {profile?.permissions?.members?.create && (
            <Link href="/dashboard/add-member" passHref>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Member
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent>
          <MemberList />
        </CardContent>
      </Card>
    </div>
  );
}
