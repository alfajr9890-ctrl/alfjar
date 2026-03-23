'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { collection, doc, query, where, orderBy, limit, getDocs, startAfter, Query, DocumentData } from 'firebase/firestore';
import { Pencil, Eye, Trash2, User, ChevronLeft, ChevronRight, RotateCcw, Download, Loader2, FileText, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useFirebase } from '@/firebase/provider';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Skeleton } from '../ui/skeleton';
import { useUserProfile } from '@/firebase/auth/use-user-profile';
import { useToast } from '@/hooks/use-toast';
import { deleteImageFromCloudinary, getOptimizedImageUrl } from '@/lib/cloudinary';
import { exportMembersToPDF, exportMembersToCSV } from '@/lib/export-utils';
import { fetchAllMembers } from '@/lib/firebase-utils';

interface Member {
    id: string;
    fullName: string;
    fullNameLowerCase?: string;
    dateOfJoining: string;
    photoUrl?: string;
    status: 'active' | 'inactive';
    photoId?: string;
    membershipType: 'yearly' | 'lifetime' | 'half-yearly';
    role?: string;
    team?: string;
    email?: string;
}

const MEMBERS_PER_PAGE = 10;

export function MemberList() {
  const { firestore } = useFirebase();
  const { profile, isLoading: isProfileLoading } = useUserProfile();

  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [membershipTypeFilter, setMembershipTypeFilter] = useState('all');

  // Export state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf'|'csv'>('pdf');
  const [exportRoleFilter, setExportRoleFilter] = useState('all');
  const [exportTeamFilter, setExportTeamFilter] = useState('all');
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Teams for dropdown
  const [teams, setTeams] = useState<{id: string, name: string}[]>([]);

  // Pagination state
  const [page, setPage] = useState(1);
  const pageCursors = useRef<(DocumentData | null)[]>([null]);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalMembers, setTotalMembers] = useState<number | null>(null);
  const lastCountFilters = useRef<string>('');

  // Fetch teams for export optional filter
  useEffect(() => {
    if (!firestore) return;
    const fetchTeams = async () => {
        try {
            const teamSnap = await getDocs(collection(firestore, 'teams'));
            setTeams(teamSnap.docs.map(d => ({ 
                id: d.id, 
                name: d.data().name || d.data().teamName || d.id 
            })));
        } catch(e) {
            console.error("Error fetching teams", e);
        }
    }
    fetchTeams();
  }, [firestore]);

  // Reset pagination when status/membership filters change
  useEffect(() => {
    setPage(1);
    pageCursors.current = [null];
    setTotalMembers(null);
  }, [statusFilter, membershipTypeFilter, searchTerm]);
  
  // Main data fetching effect
  useEffect(() => {
    if (!firestore || !profile) return;

    setIsLoading(true);

    const fetchList = async () => {
        let q: Query<DocumentData> = collection(firestore, 'members');
        const isSearching = searchTerm.trim().length > 0;

        if (statusFilter !== 'all') {
            q = query(q, where('status', '==', statusFilter));
        }
        if (membershipTypeFilter !== 'all') {
            q = query(q, where('membershipType', '==', membershipTypeFilter));
        }

        if (isSearching) {
             const lowerSearch = searchTerm.toLowerCase();
             q = query(q, 
                where('fullNameLowerCase', '>=', lowerSearch),
                where('fullNameLowerCase', '<=', lowerSearch + '\uf8ff'),
                orderBy('fullNameLowerCase') 
             );
        } else {
             q = query(q, orderBy('fullName', 'asc'));
        }
        
        const currentFilterKey = JSON.stringify({ s: statusFilter, m: membershipTypeFilter, q: searchTerm });

        if (currentFilterKey !== lastCountFilters.current) {
             import('firebase/firestore').then(({ getCountFromServer }) => {
                 getCountFromServer(q).then(snapshot => {
                     setTotalMembers(snapshot.data().count);
                     lastCountFilters.current = currentFilterKey;
                 }).catch(e => console.error("Error fetching count:", e));
             });
        }

        let paginatedQuery = query(q, limit(MEMBERS_PER_PAGE));
        
        const cursor = pageCursors.current[page - 1];
        if (cursor) {
            paginatedQuery = query(paginatedQuery, startAfter(cursor));
        }

        try {
            const docSnapshots = await getDocs(paginatedQuery);
            const newMembers = docSnapshots.docs.map(doc => ({ ...doc.data(), id: doc.id } as Member));
            setMembers(newMembers);

            setHasNextPage(newMembers.length === MEMBERS_PER_PAGE);
            setHasPrevPage(page > 1);

            if (page > pageCursors.current.length - 1 && docSnapshots.docs.length > 0) {
                const lastDoc = docSnapshots.docs[docSnapshots.docs.length - 1];
                pageCursors.current[page] = lastDoc;
            }
        } catch (error) {
            console.error("Error fetching members:", error);
        } finally {
            setIsLoading(false);
        }
    };

    fetchList();
  }, [firestore, profile, page, statusFilter, membershipTypeFilter, searchTerm]);

  const filteredMembers = members;
  const isFiltered = searchTerm !== '' || statusFilter !== 'all' || membershipTypeFilter !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setMembershipTypeFilter('all');
    setPage(1);
    pageCursors.current = [null];
  };

  const { toast } = useToast();

  const handleDelete = async (member: Member) => {
    if (!firestore) return;
    try {
        if (member.photoId) {
            await deleteImageFromCloudinary(member.photoId);
        }
    } catch (error) {
        console.error("Error deleting image from Cloudinary:", error);
    }
    const memberDoc = doc(firestore, 'members', member.id);
    deleteDocumentNonBlocking(memberDoc);
    setMembers(prev => prev.filter(m => m.id !== member.id));
    toast({ title: 'Deleted', description: 'Member deleted successfully.' });
  };
  
  const handleDownloadSingle = async (member: Member, formatType: 'pdf' | 'csv') => {
      try {
          const timestamp = format(new Date(), "yyyyMMdd_HHmm");
          const safeName = (member.fullName || 'unknown').replace(/\s+/g, '_');
          
          if (formatType === 'pdf') {
              await exportMembersToPDF([member], `ALF_Member_${safeName}_${timestamp}.pdf`, true);
          } else {
              exportMembersToCSV([member], `ALF_Member_${safeName}_${timestamp}.csv`);
          }
      } catch {
          toast({ title: 'Error', description: `Failed to generate ${formatType.toUpperCase()}`, variant: 'destructive' });
      }
  };

  const handleDownloadAll = async () => {
      if (!firestore || !profile) return;
      setIsDownloading(true);
      
      try {
          const allMembers = await fetchAllMembers(firestore, profile, {
              status: statusFilter,
              membershipType: membershipTypeFilter,
              searchTerm,
              role: exportRoleFilter,
              team: exportTeamFilter
          });
          
          if (allMembers.length === 0) {
              toast({ title: 'No Data', description: 'No members found for the selected filters.' });
              setIsDownloading(false);
              return;
          }
          
          const timestamp = format(new Date(), "yyyyMMdd_HHmm");
          
          if (exportFormat === 'pdf') {
              await exportMembersToPDF(allMembers, `ALF_Members_Export_${timestamp}.pdf`, false);
          } else {
              exportMembersToCSV(allMembers, `ALF_Members_Export_${timestamp}.csv`);
          }
          
          toast({ title: 'Success', description: `${exportFormat.toUpperCase()} generated successfully.` });
          setIsExportModalOpen(false);
      } catch (error) {
          console.error("Error downloading members:", error);
          toast({ title: 'Error', description: `Failed to generate ${exportFormat.toUpperCase()} report.`, variant: 'destructive' });
      } finally {
          setIsDownloading(false);
      }
  };

  const goToNextPage = () => hasNextPage && setPage(p => p + 1);
  const goToPreviousPage = () => hasPrevPage && setPage(p => p - 1);

  if (isProfileLoading) {
      return (
        <div className="w-full space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
        </div>
      )
  }

  return (
    <TooltipProvider>
        <div className="w-full space-y-4">
        <div className="flex flex-col md:flex-row gap-2">
            <Input
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
            </Select>
            <Select value={membershipTypeFilter} onValueChange={setMembershipTypeFilter}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="lifetime">Lifetime</SelectItem>
                    <SelectItem value="half-yearly">Half-Yearly</SelectItem>
                </SelectContent>
            </Select>
            {isFiltered && (
                <Button variant="outline" size="icon" onClick={clearFilters} title="Clear all filters & refresh">
                    <RotateCcw className="h-4 w-4" />
                    <span className="sr-only">Clear filters</span>
                </Button>
            )}

            <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="ml-auto flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        <span>Export All</span>
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Export Members</DialogTitle>
                        <DialogDescription>
                            Export all members across all pages. Optionally apply filters.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="format" className="text-right">Format</Label>
                            <Select value={exportFormat} onValueChange={(val: 'pdf'|'csv') => setExportFormat(val)}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select Format" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pdf">PDF</SelectItem>
                                    <SelectItem value="csv">CSV</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="role" className="text-right">Role</Label>
                            <Select value={exportRoleFilter} onValueChange={setExportRoleFilter}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="All" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="super_admin">Super Admin</SelectItem>
                                    <SelectItem value="team_member">Team Member</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="team" className="text-right">Team</Label>
                            <Select value={exportTeamFilter} onValueChange={setExportTeamFilter}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="All" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    {teams.map(team => (
                                        <SelectItem key={team.id} value={team.name}>{team.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleDownloadAll} disabled={isDownloading}>
                            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            {isDownloading ? 'Generating...' : `Download ${exportFormat.toUpperCase()}`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>

        <div className="border rounded-md overflow-x-auto">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                Array.from({ length: MEMBERS_PER_PAGE }).map((_, i) => (<TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-10 w-full" /></TableCell></TableRow>))
                ) : filteredMembers.length > 0 ? (
                filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                    <TableCell>
                        <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                            <AvatarImage 
                                src={getOptimizedImageUrl(member.photoUrl || '', 80, 80)} 
                                alt={member.fullName} 
                                loading="lazy"
                            />
                            <AvatarFallback>
                            {member.fullName?.split(' ').map(n => n[0]).join('') || <User />}
                            </AvatarFallback>
                        </Avatar>
                        <div className="font-medium">{member.fullName}</div>
                        </div>
                    </TableCell>
                    <TableCell>
                        <Badge variant={member.status === 'active' ? 'default' : 'destructive'} className="capitalize bg-accent">
                        {member.status}
                        </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{member.membershipType}</TableCell>
                    <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                            <DropdownMenu>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" aria-label="Download export">
                                                <Download className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>Download Export</TooltipContent>
                                </Tooltip>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleDownloadSingle(member, 'pdf')}><FileText className="mr-2 h-4 w-4" /><span>Download PDF</span></DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDownloadSingle(member, 'csv')}><FileSpreadsheet className="mr-2 h-4 w-4" /><span>Download CSV</span></DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Button variant="ghost" size="icon" asChild title="View Member">
                                <Link href={`/dashboard/members/${member.id}`}>
                                    <Eye className="h-4 w-4" />
                                    <span className="sr-only">View</span>
                                </Link>
                            </Button>
                            
                            {profile?.permissions.members.update && (
                                <Button variant="ghost" size="icon" asChild title="Edit Member">
                                    <Link href={`/dashboard/members/${member.id}/edit`}>
                                        <Pencil className="h-4 w-4" />
                                        <span className="sr-only">Edit</span>
                                    </Link>
                                </Button>
                            )}

                            {profile?.permissions.members.delete && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" title="Delete Member">
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">Delete</span>
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete this member&apos;s data.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(member)} className="bg-destructive hover:bg-destructive/90">
                                                Delete
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </div>
                    </TableCell>
                    </TableRow>
                ))
                ) : (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        No members found.
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
            </Table>
        </div>

        <div className="flex items-center justify-end space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                    {searchTerm ? (
                        <>Showing matching results</>
                    ) : (
                        totalMembers !== null && (
                            <>
                                Page {page} of {Math.ceil(totalMembers / MEMBERS_PER_PAGE)}
                            </>
                        )
                    )}
                </div>
                <Button variant="outline" size="sm" onClick={goToPreviousPage} disabled={!hasPrevPage || isLoading}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                </Button>
                <Button variant="outline" size="sm" onClick={goToNextPage} disabled={!hasNextPage || isLoading}>
                    Next <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
    </TooltipProvider>
  );
}
