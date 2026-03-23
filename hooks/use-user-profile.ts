import { useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { useFirebase, useUser } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import type { PermissionsSchema } from '@/lib/schemas';
import type { User } from 'firebase/auth';

export type UserProfile = {
    id: string;
    fullName: string;
    email: string;
    role: 'super_admin' | 'team_member';
    permissions: PermissionsSchema;
    assignedRoleId?: string;
    assignedRoleName?: string;
};

export type UseUserProfileResult = {
    user: User | null;
    profile: UserProfile | undefined | null;
    loading: boolean;
    error: Error | null;
    isSuperAdmin: boolean;
    isTeamMember: boolean;
};

export function useUserProfile(): UseUserProfileResult {
    const { firestore } = useFirebase();
    const { user, isUserLoading } = useUser();

    const userDocRef = useMemo(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);

    const { data: profile, isLoading: isProfileLoading, error } = useDoc<UserProfile>(userDocRef);

    const loading = isUserLoading || (!!user && isProfileLoading);
    const isSuperAdmin = profile?.role === 'super_admin';
    const isTeamMember = profile?.role === 'team_member';

    return {
        user,
        profile,
        loading,
        error: error || null,
        isSuperAdmin,
        isTeamMember
    };
}
