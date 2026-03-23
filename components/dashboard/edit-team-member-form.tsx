'use client';

import { useState, useEffect } from 'react';
import { doc, updateDoc, collection } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';

import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useDoc as useDocHook } from '@/firebase/firestore/use-doc';
import { useCollection as useCollectionHook } from '@/firebase/firestore/use-collection';

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
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>(undefined);

  // Fetch the user to edit
  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return doc(firestore, 'users', userId);
  }, [firestore, userId]);
  const { data: user, isLoading: isUserLoading } = useDocHook<UserProfile>(userDocRef);

  // Fetch all available roles
  const rolesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'roles') : null, [firestore]);
  const { data: roles, isLoading: areRolesLoading } = useCollectionHook<Role>(rolesCollection);

  // When user data loads, set the currently selected role
  useEffect(() => {
    if (user?.assignedRoleId) {
      setSelectedRoleId(user.assignedRoleId);
    }
  }, [user]);

  const handleSaveChanges = async () => {
    if (!firestore || !userDocRef || !selectedRoleId) {
        toast({ title: 'Error', description: 'Please select a role.', variant: 'destructive' });
        return;
    };
    
    const selectedRole = roles?.find(r => r.id === selectedRoleId);
    if (!selectedRole) {
        toast({ title: 'Error', description: 'Selected role not found.', variant: 'destructive' });
        return;
    }

    setIsSubmitting(true);
    
    const updatePayload = {
        permissions: selectedRole.permissions,
        assignedRoleId: selectedRole.id,
        assignedRoleName: selectedRole.name,
    };

    try {
      await updateDoc(userDocRef, updatePayload);
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
            path: userDocRef.path,
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
  
  const isLoading = isUserLoading || areRolesLoading;

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
         <Select onValueChange={setSelectedRoleId} value={selectedRoleId} disabled={isSubmitting}>
            <SelectTrigger id="role-select">
                <SelectValue placeholder="Select a role..." />
            </SelectTrigger>
            <SelectContent>
                {roles?.map(role => (
                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                ))}
            </SelectContent>
        </Select>
       </div>

        <div className="flex justify-end">
            <Button
                onClick={handleSaveChanges}
                disabled={isSubmitting || !selectedRoleId}
                className="bg-accent hover:bg-accent/90"
            >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
                <Save className="ml-2 h-4 w-4" />
            </Button>
        </div>
    </div>
  );
}
