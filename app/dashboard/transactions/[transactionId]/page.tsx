'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc } from 'firebase/firestore';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';

import { useDoc } from '@/firebase/firestore/use-doc';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useUserProfile } from '@/firebase/auth/use-user-profile';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Transaction {
    id: string;
    memberId: string;
    type: 'credit' | 'debit';
    amount: number;
    description: string;
    date: string;
}

interface Member {
    id: string;
    fullName: string;
}

export default function ViewTransactionPage() {
    const params = useParams();
    const router = useRouter();
    const transactionId = params.transactionId as string;
    const { profile } = useUserProfile();
    const { firestore } = useFirebase();

    const transactionDocRef = useMemoFirebase(() => {
        if (!firestore || !transactionId) return null;
        return doc(firestore, 'transactions', transactionId);
    }, [firestore, transactionId]);

    const { data: transaction, isLoading: isTransactionLoading } = useDoc<Transaction>(transactionDocRef);

    const memberDocRef = useMemoFirebase(() => {
        if (!firestore || !transaction?.memberId) return null;
        return doc(firestore, 'members', transaction.memberId);
    }, [firestore, transaction?.memberId]);

    const { data: member, isLoading: isMemberLoading } = useDoc<Member>(memberDocRef);

    const handleDelete = () => {
        if (!transactionDocRef) return;
        deleteDocumentNonBlocking(transactionDocRef);
        router.push('/dashboard/transactions');
    };

    if (isTransactionLoading || isMemberLoading) {
        return <TransactionDetailSkeleton />;
    }

    if (!transaction) {
        return (
            <div className="p-8 text-center">
                <p>Transaction not found.</p>
                <Link href="/dashboard/transactions" passHref className="mt-4 inline-block">
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Transactions
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="p-8">
            <Link href="/dashboard/transactions" passHref className="mb-4 inline-block">
                <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Transactions
                </Button>
            </Link>
            <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle className="text-2xl">Transaction Details</CardTitle>
                        <CardDescription>Transaction ID: {transaction.id}</CardDescription>
                    </div>
                     <div className="flex gap-2">
                        {profile?.permissions.transactions.update &&
                            <Link href={`/dashboard/transactions/${transaction.id}/edit`} passHref>
                                <Button variant="outline" size="icon">
                                    <Edit className="h-4 w-4" />
                                    <span className="sr-only">Edit</span>
                                </Button>
                            </Link>
                        }
                        {profile?.permissions.transactions.delete &&
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon">
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete</span>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete this transaction.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                                        Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        }
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Member</p>
                            <p>{member?.fullName || 'Loading...'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Transaction Date</p>
                            <p>{new Date(transaction.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Amount</p>
                            <p>₹{transaction.amount.toLocaleString()}</p>
                        </div>
                         <div>
                            <p className="text-sm font-medium text-muted-foreground">Type</p>
                            <Badge variant={transaction.type === 'credit' ? 'default' : 'destructive'} className="capitalize bg-accent">
                                {transaction.type}
                            </Badge>
                        </div>
                        <div className="md:col-span-2">
                            <p className="text-sm font-medium text-muted-foreground">Description</p>
                            <p>{transaction.description || 'N/A'}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}


function TransactionDetailSkeleton() {
    return (
        <div className="p-8">
            <Skeleton className="h-10 w-48 mb-4" />
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-6 w-3/4" /></div>
                        <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-6 w-3/4" /></div>
                        <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-6 w-1/2" /></div>
                        <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-8 w-20" /></div>
                        <div className="md:col-span-2 space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
