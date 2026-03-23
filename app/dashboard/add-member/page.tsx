import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { AddMemberForm } from '@/components/dashboard/add-member-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AddMemberPage() {
  return (
    <div className="p-8">
       <Link href="/dashboard/members" passHref className="mb-4 inline-block">
        <Button variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Members
        </Button>
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Add New Member</CardTitle>
          <CardDescription>Fill out the form below to register a new member.</CardDescription>
        </CardHeader>
        <CardContent>
          <AddMemberForm />
        </CardContent>
      </Card>
    </div>
  );
}
