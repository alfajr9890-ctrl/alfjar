'use client';

import { useMemo } from 'react';
import { collection, query, orderBy, limit, where, documentId } from 'firebase/firestore';
import { Users, ArrowLeftRight, ArrowUpCircle, ArrowDownCircle, User, AlertCircle } from 'lucide-react';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useUserProfile } from '@/firebase/auth/use-user-profile';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

// --- Reusable StatCard Component ---
function StatCard({
  icon,
  title,
  value,
  description,
  isLoading
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
  isLoading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-primary h-12 w-12 flex items-center justify-center">{icon}</div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="mt-1 h-4 w-1/2" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// --- Main Dashboard Page Component ---
interface Transaction {
    id: string;
    memberId: string;
    date: string | { seconds: number; nanoseconds: number }; // Allow Firebase Timestamp
    amount: number;
    type: 'credit' | 'debit';
}

interface Member {
    id: string;
    fullName: string;
    photoUrl?: string;
    status: 'active' | 'inactive';
}

const RECENT_TRANSACTIONS_LIMIT = 5;

export default function DashboardPage() {
  const { firestore } = useFirebase();
  const { profile, isLoading: isProfileLoading } = useUserProfile();

  // --- DATA FETCHING --- //
  // Fetch ALL members for summary calculations
  const allMembersQuery = useMemoFirebase(() => 
    (firestore && profile?.permissions.dashboard.read) ? collection(firestore, 'members') : null, 
    [firestore, profile]
  );
  const { data: allMembers, isLoading: isLoadingAllMembers } = useCollection<Member>(allMembersQuery);

  // Fetch ALL transactions for summary calculations
  const allTransactionsQuery = useMemoFirebase(() => 
    (firestore && profile?.permissions.dashboard.read) ? collection(firestore, 'transactions') : null, 
    [firestore, profile]
  );
  const { data: allTransactions, isLoading: isLoadingAllTransactions } = useCollection<Transaction>(allTransactionsQuery);

  // Fetch RECENT transactions for the table view (limited)
  const recentTransactionsQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.permissions.transactions.read) return null;
    return query(collection(firestore, 'transactions'), orderBy('date', 'desc'), limit(RECENT_TRANSACTIONS_LIMIT));
  }, [firestore, profile]);
  const { data: recentTransactions, isLoading: isLoadingRecentTransactions } = useCollection<Transaction>(recentTransactionsQuery);


  // --- DATA PROCESSING & CALCULATIONS --- //

  // Calculate dashboard summary stats from all members and transactions
  const dashboardStats = useMemo(() => {
    if (!allMembers || !allTransactions) {
      return { totalMembers: 0, activeMembers: 0, totalTransactions: 0, totalCredit: 0, totalDebit: 0 };
    }
    const totalMembers = allMembers.length;
    const activeMembers = allMembers.filter(m => m.status === 'active').length;
    const totalTransactions = allTransactions.length;
    const { totalCredit, totalDebit } = allTransactions.reduce((acc, tx) => {
        if (tx.type === 'credit') acc.totalCredit += tx.amount;
        else acc.totalDebit += tx.amount;
        return acc;
    }, { totalCredit: 0, totalDebit: 0 });

    return { totalMembers, activeMembers, totalTransactions, totalCredit, totalDebit };
  }, [allMembers, allTransactions]);

  const netBalance = dashboardStats.totalCredit - dashboardStats.totalDebit;

  // Create a map of members for recent transactions to avoid re-rendering
  const memberIdsInRecentTransactions = useMemo(() => {
    if (!recentTransactions) return [];
    return Array.from(new Set(recentTransactions.map(tx => tx.memberId).filter(id => id)));
  }, [recentTransactions]);

  const membersForRecentTransactionsQuery = useMemoFirebase(() => {
    if (!firestore || memberIdsInRecentTransactions.length === 0) return null;
    return query(collection(firestore, 'members'), where(documentId(), 'in', memberIdsInRecentTransactions));
  }, [firestore, memberIdsInRecentTransactions]);

  const { data: membersForRecentTransactions, isLoading: isLoadingMembersForRecentTransactions } = useCollection<Member>(membersForRecentTransactionsQuery);

  const membersMapForRecentTransactions = useMemo(() => {
      if (!membersForRecentTransactions) return new Map();
      return new Map(membersForRecentTransactions.map(m => [m.id, m]));
  }, [membersForRecentTransactions]);


  // --- RENDER LOGIC --- //

  const isLoading = isProfileLoading || isLoadingAllMembers || isLoadingAllTransactions || isLoadingRecentTransactions || isLoadingMembersForRecentTransactions;
  const isSummaryLoading = isLoadingAllMembers || isLoadingAllTransactions;

  if (isLoading && !allMembers && !allTransactions) { // Show main skeleton only on initial load
    return <DashboardPageSkeleton />;
  }

  if (!profile?.permissions.dashboard.read) {
    return (
        <div className="flex items-center justify-center h-full">
            <Card className="w-96 text-center p-8">
                <CardHeader>
                    <CardTitle className="flex items-center justify-center gap-2">
                        <AlertCircle className="text-destructive" />
                        Access Denied
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p>You do not have permission to view the dashboard.</p>
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Members"
          value={dashboardStats.totalMembers.toString()}
          description={`${dashboardStats.activeMembers} active members`}
          icon={<Users className="h-6 w-6" />}
          isLoading={isSummaryLoading}
        />
        <StatCard
          title="Total Transactions"
          value={dashboardStats.totalTransactions.toString()}
          description="All recorded transactions"
          icon={<ArrowLeftRight className="h-6 w-6" />}
          isLoading={isSummaryLoading}
        />
        <StatCard
          title="Total Credit"
          value={`₹${dashboardStats.totalCredit.toLocaleString()}`}
          description="Total incoming funds"
          icon={<ArrowUpCircle className="h-6 w-6 text-emerald-500" />}
          isLoading={isSummaryLoading}
        />
        <StatCard
          title="Total Debit"
          value={`₹${dashboardStats.totalDebit.toLocaleString()}`}
          description="Total outgoing funds"
          icon={<ArrowDownCircle className="h-6 w-6 text-red-500" />}
          isLoading={isSummaryLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
           <Card>
            <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>The last {RECENT_TRANSACTIONS_LIMIT} transactions recorded.</CardDescription>
            </CardHeader>
            <CardContent>
               {isLoadingRecentTransactions || isLoadingMembersForRecentTransactions ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {recentTransactions && recentTransactions.length > 0 ? (
                        recentTransactions.map(tx => {
                            const member = membersMapForRecentTransactions.get(tx.memberId);
                            const date = typeof tx.date === 'string' ? new Date(tx.date) : new Date(tx.date.seconds * 1000);
                            return (
                                <TableRow key={tx.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={member?.photoUrl} alt={member?.fullName} />
                                            <AvatarFallback>
                                                {member?.fullName?.split(' ').map((n: string) => n[0]).join('') || <User />}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-medium">{member?.fullName || '...'}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {date.toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className={`text-right font-medium ${tx.type === 'credit' ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {tx.type === 'credit' ? '+' : '-'} ₹{tx.amount.toLocaleString()}
                                </TableCell>
                                </TableRow>
                            );
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={2} className="h-24 text-center">
                                No recent transactions.
                            </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
              )}
            </CardContent>
           </Card>
        </div>

        <div className="lg:col-span-1">
            <Card>
                <CardHeader>
                    <CardTitle>Quick Summary</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                     {isSummaryLoading ? (
                         <div className="space-y-4">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                         </div>
                     ) : (
                         <>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">System Status</span>
                                <Badge variant="default" className="bg-emerald-600/20 text-emerald-400 border-emerald-600/30">
                                    <span className="relative flex h-2 w-2 mr-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    Operational
                                </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Net Balance</span>
                                <span className={`font-bold text-lg ${netBalance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    ₹{netBalance.toLocaleString()}
                                </span>
                            </div>
                             <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Members Active</span>
                                <span className="font-bold text-lg">
                                    {dashboardStats.activeMembers}
                                </span>
                            </div>
                         </>
                     )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}

function DashboardPageSkeleton() {
    return (
        <div className="p-8 space-y-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Skeleton className="h-96" />
                </div>
                <div className="lg:col-span-1">
                    <Skeleton className="h-64" />
                </div>
            </div>
        </div>
    )
}
