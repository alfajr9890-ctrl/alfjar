'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc } from 'firebase/firestore';
import { ArrowLeft, Edit, Trash2, User } from 'lucide-react';

import { useDoc } from '@/firebase/firestore/use-doc';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useUserProfile } from '@/firebase/auth/use-user-profile';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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

interface Member {
    id: string;
    fullName: string;
    mobileNumber: string;
    address: string;
    membershipType: string;
    dateOfJoining: string;
    status: 'active' | 'inactive';
    openingBalance: number;
    adharNumber: string;
    photoUrl?: string;
}

export default function ViewMemberPage() {
    const params = useParams();
    const router = useRouter();
    const memberId = params.memberId as string;
    const { profile } = useUserProfile();
    const { firestore } = useFirebase();

    const memberDocRef = useMemoFirebase(() => {
        if (!firestore || !memberId) return null;
        return doc(firestore, 'members', memberId);
    }, [firestore, memberId]);

    const { data: member, isLoading } = useDoc<Member>(memberDocRef);

    const handleDelete = () => {
        if (!memberDocRef) return;
        deleteDocumentNonBlocking(memberDocRef);
        router.push('/dashboard/members');
    };

    if (isLoading) {
        return <MemberDetailSkeleton />;
    }

    if (!member) {
        return (
            <div className="p-8 text-center">
                <p>Member not found.</p>
                <Link href="/dashboard/members" passHref className="mt-4 inline-block">
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Members
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="p-8">
            <Link href="/dashboard/members" passHref className="mb-4 inline-block">
                <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Members
                </Button>
            </Link>
            <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle className="text-2xl">{member.fullName}</CardTitle>
                        <CardDescription>Member ID: {member.id}</CardDescription>
                    </div>
                     <div className="flex gap-2">
                        {profile?.permissions.members.update && 
                            <Link href={`/dashboard/members/${member.id}/edit`} passHref>
                                <Button variant="outline" size="icon">
                                    <Edit className="h-4 w-4" />
                                    <span className="sr-only">Edit</span>
                                </Button>
                            </Link>
                        }
                        {profile?.permissions.members.delete &&
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
                                        This action cannot be undone. This will permanently delete this member&apos;s data.
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
                    <div className="flex flex-col md:flex-row gap-8">
                        <Avatar className="h-32 w-32">
                            <AvatarImage src={member.photoUrl} alt={member.fullName} />
                            <AvatarFallback className="text-4xl">
                                {member.fullName?.split(' ').map(n => n[0]).join('') || <User />}
                            </AvatarFallback>
                        </Avatar>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 flex-1">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Mobile Number</p>
                                <p>{member.mobileNumber}</p>
                            </div>
                             <div>
                                <p className="text-sm font-medium text-muted-foreground">Aadhaar Number</p>
                                <p>{member.adharNumber}</p>
                            </div>
                            <div className="md:col-span-2">
                                <p className="text-sm font-medium text-muted-foreground">Address</p>
                                <p>{member.address}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Membership Type</p>
                                <p className="capitalize">{member.membershipType}</p>
                            </div>
                             <div>
                                <p className="text-sm font-medium text-muted-foreground">Date of Joining</p>
                                <p>{new Date(member.dateOfJoining).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            </div>
                             <div>
                                <p className="text-sm font-medium text-muted-foreground">Status</p>
                                <Badge variant={member.status === 'active' ? 'default' : 'destructive'} className="capitalize bg-accent">
                                    {member.status}
                                </Badge>
                            </div>
                             <div>
                                <p className="text-sm font-medium text-muted-foreground">Opening Balance</p>
                                <p>₹{member.openingBalance.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}


function MemberDetailSkeleton() {
    return (
        <div className="p-8">
            <Skeleton className="h-10 w-40 mb-4" />
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-8">
                        <Skeleton className="h-32 w-32 rounded-full" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 flex-1">
                            <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-6 w-3/4" /></div>
                            <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-6 w-3/4" /></div>
                            <div className="md:col-span-2 space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-6 w-full" /></div>
                            <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-6 w-1/2" /></div>
                            <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-6 w-1/2" /></div>
                            <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-8 w-20" /></div>
                            <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-6 w-1/3" /></div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
