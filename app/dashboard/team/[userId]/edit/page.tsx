'use client';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useUserProfile } from '@/firebase/auth/use-user-profile';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EditTeamMemberForm } from '@/components/dashboard/edit-team-member-form';
import { AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditTeamMemberPage() {
  const params = useParams();
  const userId = params.userId as string;
  const router = useRouter();
  const { profile, isLoading: isProfileLoading } = useUserProfile();

  if (isProfileLoading || !profile || profile.role === undefined) {
    return (
      <div className="p-8">
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  // Redirect if not a super admin
  if (profile && profile.role !== 'super_admin') {
      router.replace('/dashboard');
      return null;
  }
  
  // Prevent super admin from editing themselves
  if (profile && profile.id === userId) {
      return (
           <div className="flex items-center justify-center h-full p-8">
            <Card className="w-96 text-center p-8">
                <CardHeader>
                    <CardTitle className="flex items-center justify-center gap-2">
                        <AlertCircle className="text-destructive" />
                        Action Not Allowed
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Super admins cannot edit their own permissions.</p>
                     <Link href="/dashboard/team" passHref className="mt-4 inline-block">
                        <Button variant="outline">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Team
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
      )
  }

  return (
    <div className="p-8">
       <Link href={`/dashboard/team/${userId}`} passHref className="mb-4 inline-block">
        <Button variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Team Member View
        </Button>
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Edit Team Member</CardTitle>
          <CardDescription>Update permissions for this team member.</CardDescription>
        </CardHeader>
        <CardContent>
          <EditTeamMemberForm userId={userId} />
        </CardContent>
      </Card>
    </div>
  );
}
