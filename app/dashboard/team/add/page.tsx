'use client';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useUserProfile } from '@/firebase/auth/use-user-profile';
import { AddTeamMemberForm } from '@/components/dashboard/add-team-member-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export default function AddTeamMemberPage() {
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
      <Link href="/dashboard/team" passHref className="mb-4 inline-block">
        <Button variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Team
        </Button>
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Create New Team Member</CardTitle>
          <CardDescription>
            Create a new team member account and assign them a role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddTeamMemberForm />
        </CardContent>
      </Card>
    </div>
  );
}
