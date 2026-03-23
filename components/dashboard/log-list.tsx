'use client';

import { useState, useEffect, useRef } from 'react';
import { collectionGroup, query, orderBy, Timestamp, where, limit, startAfter, getDocs, DocumentData, Query, getCountFromServer } from 'firebase/firestore';
import { Skeleton } from '../ui/skeleton';
import { useFirebase } from '@/firebase/provider';
import { useUserProfile } from '@/firebase/auth/use-user-profile';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '../ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DateRange } from "react-day-picker";
import { format } from 'date-fns';

interface Log {
    id: string;
    actorId: string;
    actorName: string;
    actorEmail: string;
    actorRole: string;
    actionType: string;
    entityType: string;
    entityId: string;
    timestamp: Timestamp;
}

const LOGS_PER_PAGE = 10;

export function LogList() {
    const { firestore } = useFirebase();
    const { profile, isLoading: isProfileLoading } = useUserProfile();

    const [logs, setLogs] = useState<Log[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Filter and search state
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [entityTypeFilter, setEntityTypeFilter] = useState('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    // Pagination state
    const [page, setPage] = useState(1);
    const [pageCursors, setPageCursors] = useState<(DocumentData | null)[]>([null]);
    const [hasPrevPage, setHasPrevPage] = useState(false);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [totalLogs, setTotalLogs] = useState<number | null>(null);
    const lastCountFilters = useRef<string>('');


    // Debounce search term to avoid excessive queries
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setPage(1); // Reset to first page on new search
            setPageCursors([null]);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    // Reset pagination when filters change
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPage(1);
        setPageCursors([null]);
        setTotalLogs(null); // Reset total count to force re-fetch
    }, [entityTypeFilter, dateRange, debouncedSearchTerm]);


    useEffect(() => {
        if (!firestore || !profile) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsLoading(false);
            return;
        };

        setIsLoading(true);

        const fetchLogs = async () => {
            let q: Query<DocumentData> = collectionGroup(firestore, 'logs');

            // ---------------------------------------------------------
            // SCENARIO A: SEARCH ACTIVE (Priority: ACTOR NAME)
            // ---------------------------------------------------------
            if (profile.role === 'super_admin' && debouncedSearchTerm) {
                // 1. Name Search (Range)
                q = query(q, 
                    where('actorName', '>=', debouncedSearchTerm), 
                    where('actorName', '<=', debouncedSearchTerm + '\uf8ff')
                );

                // 2. Entity Type (Equality)
                if (entityTypeFilter !== 'all') {
                    q = query(q, where('entityType', '==', entityTypeFilter));
                }

                // 3 & 4. Sorting
                // Note: We need a composite index: actorName ASC, timestamp DESC
                // Or if entityType is used: entityType ASC, actorName ASC, timestamp DESC
                q = query(q, orderBy('actorName', 'asc'), orderBy('timestamp', 'desc'));

                // Fetch slightly more to account for client-side filtering
                const SEARCH_LIMIT = 50; 
                q = query(q, limit(SEARCH_LIMIT));

                try {
                    const documentSnapshots = await getDocs(q);
                    let newLogs = documentSnapshots.docs.map(doc => ({ ...doc.data(), id: doc.id } as Log));

                    // 5. Client-Side Date Filtering
                    if (dateRange?.from || dateRange?.to) {
                        newLogs = newLogs.filter(log => {
                            if (!log.timestamp) return false;
                            const logDate = log.timestamp.toDate();
                            
                            if (dateRange.from && logDate < dateRange.from) return false;
                            if (dateRange.to) {
                                const toDate = new Date(dateRange.to);
                                toDate.setHours(23, 59, 59, 999);
                                if (logDate > toDate) return false;
                            }
                            return true;
                        });
                    }
                    
                    // Client-side pagination for search is simplified to "First Page Only" or "Load More" style
                    // For this implementation, we just show what we found. 
                    // To strictly follow local pagination we'd need to fetch ALL matches which is expensive.
                    // We'll stick to showing the top 50 matches.
                    setLogs(newLogs);
                    setHasNextPage(false); // Disable next page in search mode for simplicity
                    setHasPrevPage(false);
                    setTotalLogs(newLogs.length); // Use current length as pseudo-total
                    
                } catch (error) {
                    console.error("Error searching logs:", error);
                }
            } 
            
            // ---------------------------------------------------------
            // SCENARIO B: NO SEARCH (Priority: TIMESTAMP)
            // ---------------------------------------------------------
            else {
                 // Base query for role (if not super_admin)
                if (profile.role !== 'super_admin') {
                     // Note: CollectionGroup queries require specific security rules. 
                     // Ensure 'logs' group has read access for the user.
                     // For non-admins, we might want to restrict by actorId if that's the intended behavior.
                     q = query(q, where('actorId', '==', profile.id));
                }
            
                // 1. Date Range (Range)
                // Only applied if NO search term is present
                if (profile.role === 'super_admin') {
                     if (dateRange?.from) {
                        q = query(q, where('timestamp', '>=', dateRange.from));
                    }
                    if (dateRange?.to) {
                        const toDate = new Date(dateRange.to);
                        toDate.setHours(23, 59, 59, 999);
                        q = query(q, where('timestamp', '<=', toDate));
                    }
                }

                // 2. Entity Type (Equality)
                if (profile.role === 'super_admin' && entityTypeFilter !== 'all') {
                    q = query(q, where('entityType', '==', entityTypeFilter));
                }
                
                // Get Total Count
                // We track the filters used for the last count to avoid re-fetching on page change
                // or when state updates spuriously.
                const currentFilterKey = JSON.stringify({
                    r: profile.role,
                    t: entityTypeFilter,
                    d: dateRange ? { f: dateRange.from, t: dateRange.to } : null
                });

                if (currentFilterKey !== lastCountFilters.current) {
                    try {
                        // Capture query for counting BEFORE ordering/pagination
                        const countQuery = q; 
                        
                        // Run in background, don't block logs fetch
                        getCountFromServer(countQuery).then(snapshot => {
                             setTotalLogs(snapshot.data().count);
                             lastCountFilters.current = currentFilterKey;
                        }).catch(e => console.error("Error fetching count:", e));
                        
                    } catch (error) {
                         console.error("Error initiating count fetch:", error);
                    }
                }

                // 3. Sorting
                q = query(q, orderBy('timestamp', 'desc'));

                // Pagination
                let paginatedQuery = query(q, limit(LOGS_PER_PAGE));
                const cursor = pageCursors[page - 1];
                if (cursor) {
                    paginatedQuery = query(paginatedQuery, startAfter(cursor));
                }

                try {
                    const documentSnapshots = await getDocs(paginatedQuery);
                    const newLogs = documentSnapshots.docs.map(doc => ({ ...doc.data(), id: doc.id } as Log));
                    setLogs(newLogs);

                    setHasNextPage(newLogs.length === LOGS_PER_PAGE);
                    setHasPrevPage(page > 1);

                    if (page > pageCursors.length - 1 && documentSnapshots.docs.length > 0) {
                        const lastDoc = documentSnapshots.docs[documentSnapshots.docs.length - 1];
                        setPageCursors(prev => {
                            const newCursors = [...prev];
                            newCursors[page] = lastDoc;
                            return newCursors;
                        });
                    }
                } catch (error) {
                    console.error("Error fetching logs:", error);
                }
            }
            
             setIsLoading(false);
        }

        fetchLogs();

    }, [firestore, profile, page, pageCursors, debouncedSearchTerm, entityTypeFilter, dateRange]);
    
    const goToNextPage = () => {
       if (hasNextPage) {
           setPage(p => p + 1);
       }
    };
    
    const goToPreviousPage = () => {
        if (hasPrevPage) {
            setPage(p => p - 1);
        }
    };
    
    if (isProfileLoading) {
        return (
             <div className="w-full space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        )
    }

    const formatActionType = (actionType: string) => {
        return actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    return (
        <div className="w-full space-y-4">
            {profile?.role === 'super_admin' && (
                 <div className="flex flex-col md:flex-row gap-2">
                    <Input
                        placeholder="Search by actor name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-sm"
                    />
                     <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="transaction">Transaction</SelectItem>
                        </SelectContent>
                    </Select>
                    {/* Start Date Picker */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-[180px] justify-start text-left font-normal",
                                    !dateRange?.from && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? format(dateRange.from, "PPP") : <span>Start Date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={dateRange?.from}
                                onSelect={(date) => setDateRange(prev => ({ from: date, to: prev?.to }))}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>

                    {/* End Date Picker */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                disabled={!dateRange?.from}
                                className={cn(
                                    "w-[180px] justify-start text-left font-normal",
                                    !dateRange?.to && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.to ? format(dateRange.to, "PPP") : <span>End Date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={dateRange?.to}
                                onSelect={(date) => setDateRange(prev => ({ from: prev?.from, to: date }))}
                                disabled={(date) => dateRange?.from ? date < dateRange.from : false}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>

                    {/* Clear Date Filter */}
                    {dateRange?.from && (
                         <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDateRange(undefined)}
                            title="Clear date filter"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            )}
           
            <div className="border rounded-md overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Actor</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Entity</TableHead>
                            <TableHead className="text-right">Time</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                             Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell>
                                </TableRow>
                            ))
                        ) : logs && logs.length > 0 ? (
                            logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell>
                                        <div className="font-medium">{log.actorName}</div>
                                        <div className="text-xs text-muted-foreground">{log.actorEmail}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{formatActionType(log.actionType)}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium capitalize">{log.entityType}</div>
                                        <div className="text-xs text-muted-foreground">{log.entityId}</div>
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        {log.timestamp ? formatDistanceToNow(log.timestamp.toDate(), { addSuffix: true }) : 'just now'}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No logs found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
             <div className="flex items-center justify-end space-x-2 py-4">
                 <div className="flex-1 text-sm text-muted-foreground">
                     {debouncedSearchTerm ? (
                         <>Showing top results</>
                     ) : (
                         totalLogs !== null && (
                             <>
                                 Page {page} of {Math.ceil(totalLogs / LOGS_PER_PAGE)}
                             </>
                         )
                     )}
                 </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousPage}
                    disabled={!hasPrevPage || isLoading}
                >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={!hasNextPage || isLoading}
                >
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
