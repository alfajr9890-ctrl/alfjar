'use client';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useParams } from 'next/navigation';

import { EditTransactionForm } from '@/components/dashboard/edit-transaction-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function EditTransactionPage() {
  const params = useParams();
  const transactionId = params.transactionId as string;

  return (
    <div className="p-8">
       <Link href={`/dashboard/transactions/${transactionId}`} passHref className="mb-4 inline-block">
        <Button variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Transaction View
        </Button>
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Edit Transaction</CardTitle>
          <CardDescription>Update the details for this transaction.</CardDescription>
        </CardHeader>
        <CardContent>
          <EditTransactionForm transactionId={transactionId} />
        </CardContent>
      </Card>
    </div>
  );
}
