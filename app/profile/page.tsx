'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signOut } from 'firebase/auth';
import { LogOut, Edit2, ShieldAlert } from 'lucide-react';

import { useUserProfile } from '@/hooks/use-user-profile';
import { useFirebase } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';

import { SecuritySection } from './security-section';

// Stub schema for future edit profile form
const editProfileSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});
type EditProfileFormValues = z.infer<typeof editProfileSchema>;

export default function ProfilePage() {
    const router = useRouter();
    const { auth } = useFirebase();
    const { user, profile, loading, isSuperAdmin } = useUserProfile();

    // The form is a stub for future use
    const { handleSubmit } = useForm<EditProfileFormValues>({
        resolver: zodResolver(editProfileSchema),
        defaultValues: { fullName: profile?.fullName || '', email: profile?.email || '' }
    });

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    const handleSignOut = async () => {
        if (!auth) return;
        try {
            await signOut(auth);
            router.push('/login');
        } catch (error) {
            console.error('Failed to sign out', error);
        }
    };

    if (loading || !profile) {
        return (
            <div className="flex h-screen items-center justify-center p-4">
                <Card className="w-full max-w-2xl">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <Skeleton className="h-16 w-16 rounded-full" />
                        <div className="flex flex-col gap-2">
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-4 w-48" />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    const initials = profile.fullName
        ? profile.fullName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
        : profile.email.substring(0, 2).toUpperCase();

    const onSubmit = (data: EditProfileFormValues) => {
        console.log('Edit profile submission stub:', data);
        // Will be implemented later
    };

    return (
        <div className="flex flex-col items-center min-h-screen py-10 px-4 sm:px-6 lg:px-8 bg-background">
            <div className="w-full max-w-3xl space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
                    <p className="text-muted-foreground mt-1">Manage your account settings and preferences.</p>
                </div>

                <div className="grid gap-6">
                    <Card>
                        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-6 border-b">
                            <Avatar className="h-20 w-20">
                                <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">{initials}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-2xl">{profile.fullName}</CardTitle>
                                    <Badge 
                                        variant="outline" 
                                        className={isSuperAdmin ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-blue-100 text-blue-800 border-blue-200"}
                                    >
                                        {profile.role === 'super_admin' ? 'Super Admin' : 'Team Member'}
                                    </Badge>
                                </div>
                                <CardDescription className="text-base">{profile.email}</CardDescription>
                            </div>
                            {/* <Button className="mt-4 sm:mt-0 sm:ml-auto" variant="outline" onClick={handleSubmit(onSubmit)}>
                                <Edit2 className="h-4 w-4 mr-2" />
                                Edit Profile
                            </Button> */}
                        </CardHeader>

                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Full Name</Label>
                                    <p className="font-medium">{profile.fullName}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Email Address</Label>
                                    <p className="font-medium">{profile.email}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">System Role</Label>
                                    <p className="font-medium capitalize">{profile.role.replace('_', ' ')}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Assigned Role</Label>
                                    <p className="font-medium">{profile.assignedRoleName || 'Default Access'}</p>
                                </div>
                            </div>

                            {isSuperAdmin && (
                                <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg flex items-start gap-3">
                                    <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold text-amber-900 dark:text-amber-500">Admin Privileges Active</h4>
                                        <p className="text-sm text-amber-700 dark:text-amber-600 mt-1">
                                            You have full administrative access to all system features, including role management and system logs.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>

                        {/* <CardFooter className="border-t bg-muted/50 px-6 py-4">
                            <div className="flex w-full justify-end">
                                <Button variant="destructive" onClick={handleSignOut} className="w-full sm:w-auto">
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Sign Out
                                </Button>
                            </div>
                        </CardFooter> */}
                    </Card>

                    <SecuritySection />
                </div>
            </div>
        </div>
    );
}
