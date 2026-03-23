import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AddTeamMemberForm } from '@/components/dashboard/add-team-member-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AddTeamMemberPage() {
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
