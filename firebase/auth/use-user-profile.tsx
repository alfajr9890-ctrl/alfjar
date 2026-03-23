'use client';

import { doc } from 'firebase/firestore';
import { useDoc } from '../firestore/use-doc';
import { useFirebase, useMemoFirebase, useUser } from '../provider';
import type { PermissionsSchema } from '@/lib/schemas';

export type UserProfile = {
    id: string;
    fullName: string;
    email: string;
    role: 'super_admin' | 'team_member';
    permissions: PermissionsSchema;
    assignedRoleId?: string;
    assignedRoleName?: string;
};

export function useUserProfile() {
    const { firestore } = useFirebase();
    const { user, isUserLoading: isAuthLoading } = useUser();

    const userDocRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);

    const { data: profile, isLoading: isProfileLoading, error } = useDoc<UserProfile>(userDocRef);

    const isLoading = isAuthLoading || (!!user && isProfileLoading);

    return { profile, isLoading, error };
}
