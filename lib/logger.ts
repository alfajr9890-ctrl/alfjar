'use client';
import { collection, addDoc, serverTimestamp, Firestore } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { UserProfile } from '@/firebase/auth/use-user-profile';

// Defines the context for who performed the action
interface LogActorContext {
    user: User;
    profile: UserProfile | null;
}

// Defines the details of the action itself
interface LogActionDetails {
    actionType: string;
    entityType?: string;
    entityId?: string;
}

/**
 * Creates a sanitized and detailed log entry in Firestore.
 * This function handles resolving actor details and ensures no `undefined` values are sent.
 *
 * @param firestore The Firestore instance.
 * @param context An object containing the Firebase Auth `user` and the Firestore `profile`.
 * @param details An object describing the action that was performed.
 */
export async function createLog(firestore: Firestore, context: LogActorContext, details: LogActionDetails) {
    const { user, profile } = context;

    try {
        // Sanitize and construct the log payload, providing fallbacks for every field.
        // This prevents Firestore errors from `undefined` values.
        const logPayload = {
            // Actor details are resolved with a clear priority order.
            actorId: user.uid,
            actorName: profile?.fullName || user.displayName || user.email || 'Unknown Actor',
            actorEmail: profile?.email || user.email || 'unknown@example.com',
            actorRole: profile?.role || 'team_member',

            // Action details
            actionType: details.actionType,
            entityType: details.entityType || null,
            entityId: details.entityId || null,
            
            // Server-side timestamp for accuracy
            timestamp: serverTimestamp(),
        };

        await addDoc(collection(firestore, 'logs'), logPayload);
    } catch (error) {
        console.error("Failed to write log:", error);
        // In a production app, you might send this to a monitoring service.
    }
}
