'use client';

import { useState, useEffect } from 'react';
import { doc, updateDoc, collection, getDoc, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';

import { useFirebase } from '@/firebase/provider';
import { useUserProfile } from '@/firebase/auth/use-user-profile';

import type { UserProfile } from '@/firebase/auth/use-user-profile';
import { RoleSchema } from '@/lib/schemas';

import { Skeleton } from '../ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '../ui/label';

type Role = RoleSchema & { id: string };

export function EditTeamMemberForm({ userId }: { userId: string }) {
  const { firestore, user: authUser } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');

  const { profile: currentUserProfile } = useUserProfile();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    const userRole = currentUserProfile?.role;
    // Wait for auth AND role to be fully resolved
    if (!authUser?.uid || userRole === undefined || userRole === null) return;
    if (!userId) return;

    const fetchMember = async () => {
      try {
        const memberRef = doc(firestore, 'users', userId);
        const snapshot = await getDoc(memberRef);
        if (snapshot.exists()) {
            setUser({ id: snapshot.id, ...snapshot.data() } as UserProfile);
        } else {
            setUser(null);
            console.warn('Member document does not exist');
        }
      } catch (error) {
        if (error instanceof Error && 'code' in error) {
            console.error('Failed to fetch member (Code):', (error as { code?: string }).code, error.message);
        } else {
            console.error('Failed to fetch member:', error instanceof Error ? error.message : String(error));
        }
      } finally {
        setIsUserLoading(false);
      }
    };
    fetchMember();
  }, [firestore, userId, currentUserProfile, authUser]);

  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  useEffect(() => {
    const userRole = currentUserProfile?.role;
    if (!authUser?.uid || userRole === undefined || userRole === null || userRole !== 'super_admin') return;

    const fetchRoles = async () => {
      try {
        const rolesCollection = collection(firestore, 'roles');
        const snapshot = await getDocs(rolesCollection);
        const data = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
        })) as Role[];
        setRoles(data);
      } catch (error) {
        console.error('Failed to fetch roles:', error instanceof Error ? error.message : String(error));
      } finally {
        setRolesLoading(false);
      }
    };
    fetchRoles();
  }, [firestore, currentUserProfile?.role, authUser?.uid]);

  useEffect(() => {
    if (!user) return;
    // Pre-populate role from fetched member data
    const u = user as UserProfile & { roleId?: string };
    setSelectedRole(u.role || u.assignedRoleId || u.roleId || '');
  }, [user]);

  const handleSaveChanges = async () => {
    if (!currentUserProfile || currentUserProfile.role !== 'super_admin') return;

    // Validate against state, not form field directly
    if (!selectedRole || selectedRole === '') {
        toast({ title: 'Error', description: 'Please select a role.', variant: 'destructive' });
        return;
    }
    
    if (!firestore) {
        toast({ title: 'Error', description: 'Firestore not initialized.', variant: 'destructive' });
        return;
    };
    
    const memberDocRef = doc(firestore, 'users', userId);
    
    const selectedRoleObj = roles?.find(r => r.id === selectedRole);
    if (!selectedRoleObj) {
        toast({ title: 'Error', description: 'Selected role not found.', variant: 'destructive' });
        return;
    }

    setIsSubmitting(true);
    
    const updatePayload = {
        role: selectedRole,
        permissions: selectedRoleObj.permissions,
        assignedRoleId: selectedRoleObj.id,
        assignedRoleName: selectedRoleObj.name,
        updatedAt: new Date()
    };

    try {
      await updateDoc(memberDocRef, updatePayload);
      toast({
        title: 'Success!',
        description: `Permissions for ${user?.email} updated.`,
      });
      router.push(`/dashboard/team/${userId}`);
    } catch (error) {
      const isPermissionError = error instanceof FirestorePermissionError;
      if (!isPermissionError) {
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: memberDocRef.path,
            operation: 'update',
            requestResourceData: updatePayload,
          })
        );
      }
      console.error("Error updating permissions:", error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update permissions.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!currentUserProfile?.role) return null;

  const isLoading = isUserLoading || rolesLoading;

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <Skeleton className="h-10 w-full" />
        <div className="flex justify-end">
            <Skeleton className="h-10 w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
       <div className="space-y-2">
         <Label htmlFor="role-select">Assign Role</Label>
         <Select onValueChange={setSelectedRole} value={selectedRole} disabled={isSubmitting || rolesLoading}>
            <SelectTrigger id="role-select">
                <SelectValue placeholder={rolesLoading ? "Loading roles..." : "Select a role"} />
            </SelectTrigger>
            <SelectContent>
                {rolesLoading ? (
                    <SelectItem value="loading" disabled>Loading roles...</SelectItem>
                ) : (
                    roles?.map(role => (
                        <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                    ))
                )}
            </SelectContent>
        </Select>
       </div>

        <div className="flex justify-end">
            <Button
                onClick={handleSaveChanges}
                disabled={isSubmitting || !selectedRole}
                className="bg-accent hover:bg-accent/90"
            >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
                <Save className="ml-2 h-4 w-4" />
            </Button>
        </div>
    </div>
  );
}
