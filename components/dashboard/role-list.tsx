'use client';

import Link from 'next/link';
import { collection, doc } from 'firebase/firestore';
import { MoreVertical, Pencil, Eye, Trash2 } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
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

import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Skeleton } from '../ui/skeleton';
import { useUserProfile } from '@/firebase/auth/use-user-profile';
import type { RoleSchema } from '@/lib/schemas';

type Role = RoleSchema & { id: string };

export function RoleList() {
  const { firestore } = useFirebase();
  const { profile } = useUserProfile();

  const rolesCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'roles');
  }, [firestore]);

  const { data: roles, isLoading: areRolesLoading } = useCollection<Role>(rolesCollection);

  const handleDelete = (roleId: string) => {
    if (!firestore) return;
    const roleDoc = doc(firestore, 'roles', roleId);
    deleteDocumentNonBlocking(roleDoc);
  };
  
  if (areRolesLoading) {
      return (
        <div className="w-full space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
        </div>
      )
  }

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Role Name</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles && roles.length > 0 ? (
            roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-medium">{role.name}</TableCell>
                <TableCell className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Actions for {role.name}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                                <Link href={`/dashboard/roles/${role.id}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    <span>View</span>
                                </Link>
                            </DropdownMenuItem>
                            {profile?.role === 'super_admin' &&
                              <DropdownMenuItem asChild>
                                  <Link href={`/dashboard/roles/${role.id}/edit`}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      <span>Edit</span>
                                  </Link>
                              </DropdownMenuItem>
                            }
                            {profile?.role === 'super_admin' &&
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
                                      This action cannot be undone. This will permanently delete the role.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(role.id)} className="bg-destructive hover:bg-destructive/90">
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                            }
                        </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
             <TableRow>
                <TableCell colSpan={2} className="h-24 text-center">
                    No roles found.
                </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
