'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { collection, doc, query, orderBy, where, limit, startAfter, getDocs, DocumentData, Query } from 'firebase/firestore';
import { MoreVertical, Pencil, Eye, Trash2, User, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { format } from 'date-fns';
// import type { DateRange } from 'react-day-picker';

import { useFirebase } from '@/firebase/provider';
import { useUserProfile } from '@/firebase/auth/use-user-profile';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { generateTransactionPDF, generateSingleTransactionPDF } from '@/lib/pdf-utils';
import { generateTransactionCSV, generateSingleTransactionCSV } from '@/lib/csv-utils';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';

interface Transaction {
    id: string;
    memberId: string;
    creatorId: string;
    creatorName: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    date: any;
    amount: number;
    type: 'credit' | 'debit';
    description: string;
}

interface Member {
    id: string;
    fullName: string;
    photoUrl?: string;
}

const TRANSACTIONS_PER_PAGE = 10;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatDateSafe = (date: any) => {
    try {
        if (!date) return 'N/A';
        if (typeof date === 'object' && 'seconds' in date) {
            return format(new Date(date.seconds * 1000), 'PPP');
        }
        if (typeof date === 'string') {
            return format(new Date(date), 'PPP');
        }
        if (date instanceof Date) {
            return format(date, 'PPP');
        }
        return 'N/A';
    } catch {
        return 'Invalid Date';
    }
}

export function TransactionList() {
    const { firestore } = useFirebase();
    const { profile, isLoading: isProfileLoading } = useUserProfile();
    const { toast } = useToast();

    // Data and loading state
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [membersMap, setMembersMap] = useState<Map<string, Member>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);

    // Filter and search state
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    // const [typeFilter, setTypeFilter] = useState('all');
    // const [dateRange, setDateRange] = useState<DateRange | undefined>();

    // Pagination state
    const [page, setPage] = useState(1);
    const pageCursors = useRef<(DocumentData | null)[]>([null]);
    const [hasPrevPage, setHasPrevPage] = useState(false);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [totalTransactions, setTotalTransactions] = useState<number | null>(null);
    const lastCountFilters = useRef<string>('');

    // Debounce search term
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    // Reset pagination when filters change
    useEffect(() => {
        setPage(1);
        pageCursors.current = [null];
        setTotalTransactions(null);
    }, [debouncedSearchTerm]); // Removed typeFilter, dateRange

    // Fetch members once
    useEffect(() => {
        if (!firestore) return;
        const fetchMembers = async () => {
            try {
                const membersCollection = collection(firestore, 'members');
                const memberSnapshots = await getDocs(membersCollection);
                const newMembersMap = new Map<string, Member>();
                memberSnapshots.forEach(doc => {
                    newMembersMap.set(doc.id, { ...doc.data(), id: doc.id } as Member);
                });
                setMembersMap(newMembersMap);
            } catch (error) {
                console.error("Error fetching members:", error);
            }
        };
        fetchMembers();
    }, [firestore]);

    // Main data fetching effect
    useEffect(() => {
        if (!firestore || !profile) {
            return;
        }

        setIsLoading(true);

        const fetchTransactions = async () => {
            try {
                let q: Query<DocumentData> = collection(firestore, 'transactions');

                if (debouncedSearchTerm) {
                    const searchLower = debouncedSearchTerm.toLowerCase();
                    const matchingMemberIds = Array.from(membersMap.values())
                        .filter(member => member.fullName.toLowerCase().includes(searchLower))
                        .map(member => member.id);

                    if (matchingMemberIds.length === 0) {
                        setTransactions([]);
                        setTotalTransactions(0);
                        setIsLoading(false);
                        return;
                    }

                    // Firestore 'in' query supports up to 30 items
                    // We take the first 30 matches
                    const limitedMemberIds = matchingMemberIds.slice(0, 30);
                    q = query(q, where('memberId', 'in', limitedMemberIds));
                }
                /*
                if (typeFilter !== 'all') {
                    q = query(q, where('type', '==', typeFilter));
                }
                if (dateRange?.from) {
                    q = query(q, where('date', '>=', dateRange.from.toISOString()));
                }
                if (dateRange?.to) {
                    const toDate = new Date(dateRange.to);
                    toDate.setHours(23, 59, 59, 999);
                    q = query(q, where('date', '<=', toDate.toISOString()));
                }
                */

                // Fetch count if needed
                const currentFilterKey = JSON.stringify({
                    term: debouncedSearchTerm,
                });

                if (currentFilterKey !== lastCountFilters.current) {
                     import('firebase/firestore').then(({ getCountFromServer }) => {
                         getCountFromServer(q).then(snapshot => {
                             setTotalTransactions(snapshot.data().count);
                             lastCountFilters.current = currentFilterKey;
                         }).catch(e => console.error("Error fetching count:", e));
                     });
                }

                let paginatedQuery = query(q, orderBy('date', 'desc'), limit(TRANSACTIONS_PER_PAGE));
                
                const cursor = pageCursors.current[page - 1];
                if (cursor) {
                    paginatedQuery = query(paginatedQuery, startAfter(cursor));
                }

                const docSnapshots = await getDocs(paginatedQuery);
                const newTransactions = docSnapshots.docs.map(doc => ({ ...doc.data(), id: doc.id } as Transaction));
                setTransactions(newTransactions);

                setHasNextPage(newTransactions.length === TRANSACTIONS_PER_PAGE);
                setHasPrevPage(page > 1);

                if (page > pageCursors.current.length - 1 && docSnapshots.docs.length > 0) {
                    const lastDoc = docSnapshots.docs[docSnapshots.docs.length - 1];
                    pageCursors.current[page] = lastDoc;
                }
            } catch (error) {
                console.error("Error fetching transactions:", error);
                toast({ title: 'Error', description: 'Failed to fetch transactions.', variant: 'destructive' });
            } finally {
                setIsLoading(false);
            }
        };

        fetchTransactions();
    }, [firestore, profile, membersMap, page, debouncedSearchTerm, toast]);


    const handleDelete = (transactionId: string) => {
        if (!firestore) return;
        const transactionDoc = doc(firestore, 'transactions', transactionId);
        deleteDocumentNonBlocking(transactionDoc);
        setTransactions(prev => prev.filter(t => t.id !== transactionId));
        toast({ title: 'Deleted', description: 'Transaction deleted successfully.' });
    };

    const handleDownloadSinglePDF = (transaction: Transaction) => {
        try {
            const member = membersMap.get(transaction.memberId);
            const enrichedTransaction = { ...transaction, memberName: member?.fullName || 'N/A' };
            generateSingleTransactionPDF(enrichedTransaction);
        } catch {
            toast({ title: 'Error', description: 'Failed to generate PDF.', variant: 'destructive' });
        }
    };

    const handleDownloadSingleCSV = (transaction: Transaction) => {
        try {
            const member = membersMap.get(transaction.memberId);
            const enrichedTransaction = { ...transaction, memberName: member?.fullName || 'N/A' };
            generateSingleTransactionCSV(enrichedTransaction);
        } catch {
            toast({ title: 'Error', description: 'Failed to generate CSV.', variant: 'destructive' });
        }
    };

    const handleDownloadAll = async (format: 'pdf' | 'csv') => {
        if (!firestore || !profile) return;
        setIsDownloading(true);

        try {
            let q: Query<DocumentData> = collection(firestore, 'transactions');

             if (debouncedSearchTerm) {
                const searchLower = debouncedSearchTerm.toLowerCase();
                const matchingMemberIds = Array.from(membersMap.values())
                    .filter(member => member.fullName.toLowerCase().includes(searchLower))
                    .map(member => member.id);

                if (matchingMemberIds.length === 0) {
                     toast({ title: 'No Data', description: 'No transactions found for the selected filters.' });
                     setIsDownloading(false);
                     return;
                }
                const limitedMemberIds = matchingMemberIds.slice(0, 30);
                q = query(q, where('memberId', 'in', limitedMemberIds));
            }
            
            // Re-apply filters (commented out in original but keeping structure)
            /*
            if (typeFilter !== 'all') {
                q = query(q, where('type', '==', typeFilter));
            }
            if (dateRange?.from) {
                q = query(q, where('date', '>=', dateRange.from.toISOString()));
            }
            if (dateRange?.to) {
                const toDate = new Date(dateRange.to);
                toDate.setHours(23, 59, 59, 999);
                q = query(q, where('date', '<=', toDate.toISOString()));
            }
            */

            const querySnapshot = await getDocs(query(q, orderBy('date', 'desc')));
            const allTransactions = querySnapshot.docs.map(doc => {
                const data = doc.data();
                const member = membersMap.get(data.memberId);
                return { 
                    ...data, 
                    id: doc.id,
                    memberName: member?.fullName || 'N/A'
                } as Transaction & { memberName: string };
            });
            
            if (allTransactions.length === 0) {
                toast({ title: 'No Data', description: 'No transactions found for the selected filters.' });
                return;
            }

            if (format === 'pdf') {
                generateTransactionPDF(allTransactions, 'All Transactions');
                toast({ title: 'Success', description: 'PDF generated successfully.' });
            } else {
                generateTransactionCSV(allTransactions, 'all_transactions.csv');
                toast({ title: 'Success', description: 'CSV generated successfully.' });
            }
        } catch (error) {
            console.error("Error downloading transactions:", error);
            toast({ title: 'Error', description: `Failed to generate ${format.toUpperCase()} report.`, variant: 'destructive' });
        } finally {
            setIsDownloading(false);
        }
    };

    if (isProfileLoading) {
        return <div className="w-full space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
    }

    const goToNextPage = () => hasNextPage && setPage(p => p + 1);
    const goToPreviousPage = () => hasPrevPage && setPage(p => p - 1);

    return (
        <div className="w-full space-y-4">
             <div className="flex flex-col md:flex-row gap-2">
                <Input
                    placeholder="Search by member name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                     className="max-w-sm"
                />
                 {/* <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="credit">Credit</SelectItem>
                        <SelectItem value="debit">Debit</SelectItem>
                    </SelectContent>
                </Select>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn("w-[300px] justify-start text-left font-normal",!dateRange && "text-muted-foreground")}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>) : (format(dateRange.from, "LLL dd, y"))) : (<span>Pick a date range</span>)}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                    />
                    </PopoverContent>
                </Popover> */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="ml-auto" disabled={isDownloading}>
                            <Download className="mr-2 h-4 w-4" />
                            {isDownloading ? 'Downloading...' : 'Export'}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDownloadAll('pdf')}>
                            Export as PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadAll('csv')}>
                            Export as CSV
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="border rounded-md overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Member</TableHead>
                            <TableHead>Creator</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (<TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell></TableRow>))
                        ) : transactions.length > 0 ? (
                            transactions.map((transaction) => {
                                const member = membersMap.get(transaction.memberId);
                                return (
                                    <TableRow key={transaction.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarImage src={member?.photoUrl} alt={member?.fullName} />
                                                    <AvatarFallback>{member?.fullName?.split(' ').map(n => n[0]).join('') || <User />}</AvatarFallback>
                                                </Avatar>
                                                <div className="font-medium">{member?.fullName || '...'}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{transaction.creatorName}</TableCell>
                                        <TableCell>{formatDateSafe(transaction.date)}</TableCell>
                                        <TableCell>₹{transaction.amount.toLocaleString()}</TableCell>
                                        <TableCell>
                                            <Badge 
                                                variant={transaction.type === 'credit' ? 'secondary' : 'destructive'} 
                                                className={cn(
                                                    "capitalize font-medium shadow-sm",
                                                    transaction.type === 'credit' ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20" : ""
                                                )}
                                            >
                                                {transaction.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild><Link href={`/dashboard/transactions/${transaction.id}`}><Eye className="mr-2 h-4 w-4" /><span>View</span></Link></DropdownMenuItem>
                                                    {profile?.permissions.transactions.update && <DropdownMenuItem asChild><Link href={`/dashboard/transactions/${transaction.id}/edit`}><Pencil className="mr-2 h-4 w-4" /><span>Edit</span></Link></DropdownMenuItem>}
                                                    <DropdownMenuItem onClick={() => handleDownloadSinglePDF(transaction)}><Download className="mr-2 h-4 w-4" /><span>Download PDF</span></DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDownloadSingleCSV(transaction)}><Download className="mr-2 h-4 w-4" /><span>Download CSV</span></DropdownMenuItem>
                                                    {profile?.permissions.transactions.delete &&
                                                        <>
                                                            <DropdownMenuSeparator />
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" /><span>Delete</span></DropdownMenuItem></AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the transaction.</AlertDialogDescription></AlertDialogHeader>
                                                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(transaction.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </>
                                                    }
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        ) : (
                            <TableRow><TableCell colSpan={6} className="h-24 text-center">No transactions found.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                    {totalTransactions !== null && (
                        <>Page {page} of {Math.ceil(totalTransactions / TRANSACTIONS_PER_PAGE)}</>
                    )}
                </div>
                <Button variant="outline" size="sm" onClick={goToPreviousPage} disabled={!hasPrevPage || isLoading}><ChevronLeft className="mr-2 h-4 w-4" />Previous</Button>
                <Button variant="outline" size="sm" onClick={goToNextPage} disabled={!hasNextPage || isLoading}>Next<ChevronRight className="ml-2 h-4 w-4" /></Button>
            </div>
        </div>
    );
}