import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AddRoleForm } from '@/components/dashboard/add-role-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AddRolePage() {
  return (
    <div className="p-8">
      <Link href="/dashboard/roles" passHref className="mb-4 inline-block">
        <Button variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Roles
        </Button>
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Create New Role</CardTitle>
          <CardDescription>Define a new role and set its permissions.</CardDescription>
        </CardHeader>
        <CardContent>
          <AddRoleForm />
        </CardContent>
      </Card>
    </div>
  );
}
