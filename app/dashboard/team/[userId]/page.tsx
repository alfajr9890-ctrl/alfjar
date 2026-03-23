'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { doc } from 'firebase/firestore';
import { ArrowLeft, Edit } from 'lucide-react';

import { useDoc } from '@/firebase/firestore/use-doc';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useUserProfile } from '@/firebase/auth/use-user-profile';
import type { UserProfile } from '@/firebase/auth/use-user-profile';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function ViewTeamMemberPage() {
    const params = useParams();
    const userId = params.userId as string;
    const { profile: currentUserProfile } = useUserProfile();
    const { firestore } = useFirebase();

    const userDocRef = useMemoFirebase(() => {
        if (!firestore || !userId) return null;
        return doc(firestore, 'users', userId);
    }, [firestore, userId]);

    const { data: user, isLoading } = useDoc<UserProfile>(userDocRef);

    if (isLoading) {
        return <TeamMemberDetailSkeleton />;
    }

    if (!user) {
        return (
            <div className="p-8 text-center">
                <p>User not found.</p>
                <Link href="/dashboard/team" passHref className="mt-4 inline-block">
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Team
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="p-8">
            <Link href="/dashboard/team" passHref className="mb-4 inline-block">
                <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Team
                </Button>
            </Link>
            <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle className="text-2xl">{user.fullName}</CardTitle>
                        <CardDescription>{user.email}</CardDescription>
                        <Badge className="mt-2 capitalize">{user.role.replace('_', ' ')}</Badge>
                    </div>
                     {currentUserProfile?.role === 'super_admin' && user.role !== 'super_admin' && (
                        <Link href={`/dashboard/team/${user.id}/edit`} passHref>
                            <Button variant="outline">
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Role & Permissions
                            </Button>
                        </Link>
                     )}
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col space-y-1.5">
                            <p className="text-sm font-medium text-muted-foreground">Assigned Role</p>
                            {user.assignedRoleName ? (
                                <p className="font-semibold">{user.assignedRoleName}</p>
                            ) : (
                                <p className="text-muted-foreground italic">No role assigned</p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function TeamMemberDetailSkeleton() {
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
                        <Skeleton className="h-10 w-full" />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
