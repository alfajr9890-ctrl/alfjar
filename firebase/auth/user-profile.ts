'use client';
import { doc, getDoc, setDoc, Firestore } from 'firebase/firestore';
import { User } from 'firebase/auth';
import type { PermissionsSchema } from '@/lib/schemas';

const SUPER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@example.com';

const adminPermissions: PermissionsSchema = {
  dashboard: { read: true },
  members: { create: true, read: true, update: true, delete: true },
  transactions: { create: true, read: true, update: true, delete: true },
  team: { create: true, read: true, update: true, delete: true },
};

const defaultPermissions: PermissionsSchema = {
  dashboard: { read: false },
  members: { create: false, read: false, update: false, delete: false },
  transactions: { create: false, read: false, update: false, delete: false },
  team: { create: false, read: false, update: false, delete: false },
};

export type UserProfile = {
    id: string;
    fullName: string;
    email: string;
    role: 'super_admin' | 'team_member';
    permissions: PermissionsSchema;
    assignedRoleId?: string;
    assignedRoleName?: string;
};

export async function findOrCreateUserDocument(firestore: Firestore, user: User, formFullName?: string | null): Promise<UserProfile> {
  if (!user || !user.email) throw new Error("User object with email is required.");

  const userDocRef = doc(firestore, `users/${user.uid}`);
  const userDoc = await getDoc(userDocRef);

  if (userDoc.exists()) {
    return { ...userDoc.data(), id: userDoc.id } as UserProfile;
  }

  // This function now only handles organic signups (including the first super admin).
  // Team members created by an admin are handled in a separate workflow.
  const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;
  const role = isSuperAdmin ? 'super_admin' : 'team_member';
  const permissions = isSuperAdmin ? adminPermissions : defaultPermissions;

  const profileData = {
      fullName: formFullName || user.displayName || user.email,
      email: user.email,
      role: role,
      permissions: permissions,
  };
  
  try {
    await setDoc(userDocRef, profileData);
    return { ...profileData, id: user.uid } as UserProfile;
  } catch (error) {
    throw new Error("Could not create user profile. Please contact support.");
  }
}
