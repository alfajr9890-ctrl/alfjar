import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { AddTransactionForm } from '@/components/dashboard/add-transaction-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AddTransactionPage() {
  return (
    <div className="p-8">
       <Link href="/dashboard/transactions" passHref className="mb-4 inline-block">
        <Button variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Transactions
        </Button>
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Add New Transaction</CardTitle>
          <CardDescription>Fill out the form below to record a new transaction.</CardDescription>
        </CardHeader>
        <CardContent>
          <AddTransactionForm />
        </CardContent>
      </Card>
    </div>
  );
}
