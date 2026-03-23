'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { doc } from 'firebase/firestore';
import { ArrowLeft, Edit, ShieldCheck, ShieldX } from 'lucide-react';

import { useDoc } from '@/firebase/firestore/use-doc';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useUserProfile } from '@/firebase/auth/use-user-profile';
import type { RoleSchema } from '@/lib/schemas';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Role = RoleSchema & { id: string };

export default function ViewRolePage() {
    const params = useParams();
    const roleId = params.roleId as string;
    const { profile: currentUserProfile } = useUserProfile();
    const { firestore } = useFirebase();

    const roleDocRef = useMemoFirebase(() => {
        if (!firestore || !roleId) return null;
        return doc(firestore, 'roles', roleId);
    }, [firestore, roleId]);

    const { data: role, isLoading } = useDoc<Role>(roleDocRef);

    if (isLoading) {
        return <RoleDetailSkeleton />;
    }

    if (!role) {
        return (
            <div className="p-8 text-center">
                <p>Role not found.</p>
                <Link href="/dashboard/roles" passHref className="mt-4 inline-block">
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Roles
                    </Button>
                </Link>
            </div>
        );
    }

    const permissions = role.permissions;
    const permissionCategories = [
        { name: 'Dashboard', perms: permissions.dashboard, keys: ['read'] as const },
        { name: 'Members', perms: permissions.members, keys: ['read', 'create', 'update', 'delete'] as const },
        { name: 'Transactions', perms: permissions.transactions, keys: ['read', 'create', 'update', 'delete'] as const },
        { name: 'Team', perms: permissions.team, keys: ['read', 'create', 'update', 'delete'] as const },
    ];

    return (
        <div className="p-8">
            <Link href="/dashboard/roles" passHref className="mb-4 inline-block">
                <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Roles
                </Button>
            </Link>
            <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle className="text-2xl">{role.name}</CardTitle>
                        <CardDescription>Role ID: {role.id}</CardDescription>
                    </div>
                     {currentUserProfile?.role === 'super_admin' && (
                        <Link href={`/dashboard/roles/${role.id}/edit`} passHref>
                            <Button variant="outline">
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Role
                            </Button>
                        </Link>
                     )}
                </CardHeader>
                <CardContent>
                    <h3 className="text-lg font-semibold mb-4">Permissions</h3>
                     <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Resource</TableHead>
                                    <TableHead className="text-center">View</TableHead>
                                    <TableHead className="text-center">Create</TableHead>
                                    <TableHead className="text-center">Edit</TableHead>
                                    <TableHead className="text-center">Delete</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {permissionCategories.map(cat => (
                                    <TableRow key={cat.name}>
                                        <TableCell className="font-medium">{cat.name}</TableCell>
                                        {['read', 'create', 'update', 'delete'].map(p => (
                                            <TableCell key={p} className="text-center">
                                                {Object.prototype.hasOwnProperty.call(cat.perms, p) ? (
                                                   // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                    (cat.perms as any)[p] ? (
                                                        <ShieldCheck className="h-5 w-5 text-emerald-500 inline-block" />
                                                    ) : (
                                                        <ShieldX className="h-5 w-5 text-red-500 inline-block" />
                                                    )
                                                ) : (
                                                   <span>-</span>
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function RoleDetailSkeleton() {
    return (
        <div className="p-8">
            <Skeleton className="h-10 w-40 mb-4" />
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Skeleton className="h-6 w-1/4" />
                        <Skeleton className="h-40 w-full" />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
