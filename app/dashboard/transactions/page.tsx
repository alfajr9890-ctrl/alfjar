'use client';

import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TransactionList } from '@/components/dashboard/transaction-list';
import { useUserProfile } from '@/firebase/auth/use-user-profile';
import { useState } from 'react';
import { doc, collection, setDoc, getDocs, query, limit } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@/firebase/auth/use-user-profile';

function SeedTransactionsButton({ profile }: { profile: UserProfile }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleSeedTransactions = async () => {
        if (!firestore) return;
        
        setIsLoading(true);
        try {
            // Fetch some members to link keys to
            const membersSnapshot = await getDocs(query(collection(firestore, 'members'), limit(20)));
            const memberIds = membersSnapshot.docs.map(d => d.id);
            
            if (memberIds.length === 0) {
                 toast({ title: 'Error', description: 'No members found to seed transactions for. Please seed members first.', variant: 'destructive' });
                 setIsLoading(false);
                 return;
            }

            const batchPromises = [];
            for (let i = 1; i <= 20; i++) {
                const id = doc(collection(firestore, 'transactions')).id;
                const type = Math.random() > 0.5 ? 'credit' : 'debit';
                const amount = Math.floor(Math.random() * 1000) + 100;
                const randomMemberId = memberIds[Math.floor(Math.random() * memberIds.length)];

                const transactionData = {
                    amount,
                    type,
                    description: `Demo Transaction ${i}`,
                    date: new Date().toISOString(),
                    performedBy: profile.id,
                    createdAt: new Date().toISOString(),
                    paymentMethod: ['cash', 'upi', 'card'][Math.floor(Math.random() * 3)],
                    memberId: randomMemberId,
                    transactionId: `TXN-${Date.now()}-${i}`,
                };
                
                batchPromises.push(setDoc(doc(firestore, 'transactions', id), transactionData));
            }
            
            await Promise.all(batchPromises);
            toast({ title: 'Success', description: '20 demo transactions added successfully!' });
            window.location.reload(); 

        } catch (error) {
            console.error("Error seeding transactions:", error);
            toast({ title: 'Error', description: 'Failed to seed transactions.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button variant="outline" onClick={handleSeedTransactions} disabled={isLoading}>
            {isLoading ? 'Seeding...' : 'Seed 20 Transactions'}
        </Button>
    )
}

export default function TransactionsPage() {
  const { profile } = useUserProfile();

  return (
    <div className="p-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>A list of all recorded transactions.</CardDescription>
          </div>
          <div className="flex gap-2">
            {/* {profile?.role === 'super_admin' && (
                <SeedTransactionsButton profile={profile} />
            )} */}
            {profile?.permissions?.transactions?.create && (
                <Link href="/dashboard/transactions/add" passHref>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Transaction
                </Button>
                </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <TransactionList />
        </CardContent>
      </Card>
    </div>
  );
}
