import { cookies } from 'next/headers';
import { getSession } from './session';
import { redirect } from 'next/navigation';

/**
 * Check if user is authenticated and is an admin
 */
export async function requireAdmin() {
    const session = await getSession();
    
    if (!session) {
        redirect('/login');
    }
    
    if (session.type !== 'admin') {
        redirect('/login?error=unauthorized');
    }
    
    return session;
}

/**
 * Get auth token from cookies
 */
export async function getAuthToken(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get('vts-token')?.value || null;
}

/**
 * Check if user is authenticated (any type)
 */
export async function requireAuth() {
    const session = await getSession();
    
    if (!session) {
        redirect('/login');
    }
    
    return session;
}

