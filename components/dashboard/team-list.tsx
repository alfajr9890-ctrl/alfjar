'use client';

import Link from 'next/link';
import { collection, doc } from 'firebase/firestore';
import { MoreVertical, Pencil, Eye, User, Trash2 } from 'lucide-react';

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import { Badge } from '@/components/ui/badge';

import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Skeleton } from '../ui/skeleton';
import { useUserProfile } from '@/firebase/auth/use-user-profile';
import type { UserProfile } from '@/firebase/auth/use-user-profile';

export function TeamList() {
  const { firestore } = useFirebase();
  const { profile: currentUserProfile, isLoading: isProfileLoading } = useUserProfile();

  const usersCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);

  const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(usersCollection);

  const handleDelete = (userId: string) => {
    if (!firestore) return;
    const userDoc = doc(firestore, 'users', userId);
    deleteDocumentNonBlocking(userDoc);
  };
  
  if (isProfileLoading || areUsersLoading) {
      return (
        <div className="w-full space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
        </div>
      )
  }
  
  const canUpdate = currentUserProfile?.role === 'super_admin' || currentUserProfile?.permissions?.team?.update;
  const canDelete = currentUserProfile?.role === 'super_admin' || currentUserProfile?.permissions?.team?.delete;

  return (
    <div className="w-full">
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Assigned Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users && users.length > 0 ? (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>
                          {user.fullName?.split(' ').map(n => n[0]).join('') || <User />}
                        </AvatarFallback>
                      </Avatar>
                      <div className="font-medium">{user.fullName}</div>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                      {user.role === 'super_admin' ? (
                          <Badge variant="secondary" className="capitalize border-primary/50 text-primary">Super Admin</Badge>
                      ) : user.assignedRoleName ? (
                          <Badge variant="secondary" className="capitalize">{user.assignedRoleName}</Badge>
                      ) : (
                          <span className="text-xs text-muted-foreground">Not Assigned</span>
                      )}
                  </TableCell>
                  <TableCell className="text-right">
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                  <span className="sr-only">Actions for {user.fullName}</span>
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                  <Link href={`/dashboard/team/${user.id}`}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      <span>View</span>
                                  </Link>
                              </DropdownMenuItem>
                              {canUpdate && user.role !== 'super_admin' && (
                                <DropdownMenuItem asChild>
                                    <Link href={`/dashboard/team/${user.id}/edit`}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        <span>Edit</span>
                                    </Link>
                                </DropdownMenuItem>
                              )}
                              {canDelete && user.role !== 'super_admin' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Delete</span>
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will permanently delete the user account and remove their data from our servers.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(user.id)} className="bg-destructive hover:bg-destructive/90">
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </>
                              )}
                          </DropdownMenuContent>
                      </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                      No team members found.
                  </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
