import { collection, query, where, orderBy, getDocs, Firestore, DocumentData } from 'firebase/firestore';

export interface MemberFilters {
    searchTerm?: string;
    status?: string;
    membershipType?: string;
    role?: string;
    team?: string;
}

export async function fetchAllMembers(
    firestore: Firestore,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    profile: any,
    filters: MemberFilters
) {
    if (!firestore || !profile) return [];

    let q = query(collection(firestore, 'members'));

    if (filters.status && filters.status !== 'all') {
        q = query(q, where('status', '==', filters.status));
    }

    if (filters.membershipType && filters.membershipType !== 'all') {
        q = query(q, where('membershipType', '==', filters.membershipType));
    }

    if (filters.searchTerm) {
        const lowerSearch = filters.searchTerm.toLowerCase();
        q = query(q, 
            where('fullNameLowerCase', '>=', lowerSearch),
            where('fullNameLowerCase', '<=', lowerSearch + '\uf8ff'),
            orderBy('fullNameLowerCase') 
        );
    } else {
        q = query(q, orderBy('fullName', 'asc'));
    }

    // Role and Team filters
    if (filters.role && filters.role !== 'all') {
        q = query(q, where('role', '==', filters.role));
    }

    if (filters.team && filters.team !== 'all') {
        q = query(q, where('team', '==', filters.team));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as DocumentData));
}
