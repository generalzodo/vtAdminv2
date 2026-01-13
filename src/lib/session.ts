import { cookies } from 'next/headers';

export type User = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    walletBalance: number;
    phone: string;
    address: string;
    state: string;
    type?: string;
    agentStatus?: string;
    commissionRate?: number;
}

export async function getSession(): Promise<User | null> {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('vts-user')?.value;

    if (!userCookie) {
        return null;
    }

    try {
        const user: User = JSON.parse(userCookie);
        // The cookie contains all the user data we need,
        // and because it's an httpOnly cookie, we can trust it's not been tampered with by the client.
        return user;
    } catch (error) {
        console.error("Failed to parse user cookie", error);
        // If parsing fails, the cookie is invalid, so treat as not logged in.
        return null;
    }
}

