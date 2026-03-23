'use client';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, Firestore } from 'firebase/firestore';
import { firebaseConfig } from '../config';
import type { AddTeamMemberSchema } from '@/lib/schemas';

/**
 * Creates a new team member user in Firebase Authentication and their profile in Firestore.
 * This function uses a temporary, secondary Firebase App instance to create the user,
 * which prevents the currently logged-in admin from being signed out.
 *
 * @param firestore The main Firestore instance from the admin's session.
 * @param input An object containing the new user's details (email, password, fullName, roleId).
 * @returns A promise that resolves when the user and their profile are successfully created.
 */
export async function createTeamMember(
    firestore: Firestore,
    input: AddTeamMemberSchema
) {
    const { email, password, fullName, roleId } = input;

    // 1. Get the details of the selected role from Firestore.
    const roleDocRef = doc(firestore, 'roles', roleId);
    const roleDoc = await getDoc(roleDocRef);
    if (!roleDoc.exists()) {
        throw new Error('Selected role not found.');
    }
    const roleData = roleDoc.data();
    const { permissions, name: roleName } = roleData;


    // 2. Create a temporary, secondary Firebase App instance.
    // The name 'userCreation' is a unique identifier for this temporary app.
    const tempApp = initializeApp(firebaseConfig, 'userCreation');
    const tempAuth = getAuth(tempApp);

    try {
        // 3. Create the user with email and password using the temporary auth instance.
        const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
        const newUser = userCredential.user;

        // 4. Create the user's profile document in Firestore using the main Firestore instance.
        const userDocRef = doc(firestore, 'users', newUser.uid);
        const profileData = {
            fullName: fullName,
            email: email,
            role: 'team_member', // All users created this way are team members
            permissions: permissions,
            assignedRoleId: roleId,
            assignedRoleName: roleName,
        };
        await setDoc(userDocRef, profileData);

        return { success: true, userId: newUser.uid };

    } catch (error) {
        // Re-throw the error to be handled by the form.
        throw error;
    } finally {
        // 5. IMPORTANT: Clean up and delete the temporary app instance to avoid memory leaks.
        await deleteApp(tempApp);
    }
}
