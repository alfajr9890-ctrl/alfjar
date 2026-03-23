'use client';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useParams } from 'next/navigation';

import { EditMemberForm } from '@/components/dashboard/edit-member-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function EditMemberPage() {
  const params = useParams();
  const memberId = params.memberId as string;

  return (
    <div className="p-8">
       <Link href={`/dashboard/members/${memberId}`} passHref className="mb-4 inline-block">
        <Button variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Member View
        </Button>
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Edit Member</CardTitle>
          <CardDescription>Update the details for this member.</CardDescription>
        </CardHeader>
        <CardContent>
          <EditMemberForm memberId={memberId} />
        </CardContent>
      </Card>
    </div>
  );
}
