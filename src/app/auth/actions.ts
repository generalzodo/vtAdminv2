'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { API_BASE_URL } from '@/lib/config';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

export async function loginAction(prevState: any, formData: FormData) {
    const validatedFields = loginSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return {
            message: 'Invalid email or password.',
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }
    
    // Validate API_BASE_URL is configured
    if (!API_BASE_URL || API_BASE_URL === 'undefined') {
        console.error('API_BASE_URL is not configured. Please set NEXT_PUBLIC_API_BASE_URL environment variable.');
        return {
            message: 'Server configuration error: API URL not set. Please contact support.',
            errors: null,
        };
    }
    
    // Fix URL construction to handle trailing slashes
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const loginUrl = `${baseUrl}/users/login`;
    
    // Log for debugging (only in development or when explicitly enabled)
    if (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV) {
        console.log('Login attempt:', {
            apiBaseUrl: API_BASE_URL,
            loginUrl,
            hasEnvVar: !!process.env.NEXT_PUBLIC_API_BASE_URL,
            vercelEnv: process.env.VERCEL_ENV,
        });
    }
    
    try {
        const response = await fetch(loginUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validatedFields.data),
            // Add cache and revalidate options for Vercel
            cache: 'no-store',
            next: { revalidate: 0 },
        });

        // Handle non-JSON responses
        let result;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            try {
                result = await response.json();
            } catch (jsonError) {
                console.error('Failed to parse JSON response:', jsonError);
                const text = await response.text();
                console.error('Response text:', text.substring(0, 200));
                return {
                    message: `Server error: Invalid response format (Status ${response.status})`,
                    errors: null,
                };
            }
        } else {
            const text = await response.text();
            console.error('Non-JSON response:', {
                status: response.status,
                statusText: response.statusText,
                contentType,
                text: text.substring(0, 200)
            });
            return {
                message: `Server error: ${response.status} ${response.statusText}`,
                errors: null,
            };
        }

        if (!response.ok || !result.token) {
             return {
                message: result.error || 'Login failed. Please check your credentials.',
                errors: null,
            };
        }

        // Check if user is admin
        if (result.user.type !== 'admin') {
            return {
                message: 'Access denied. Admin privileges required.',
                errors: null,
            };
        }

        // Set cookies - In Next.js 16, cookies() is async and must be awaited
        const cookieStore = await cookies();
        
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
            sameSite: 'lax' as const,
        };

        cookieStore.set('vts-token', result.token, cookieOptions);

        const userPayload = {
            id: result.user._id,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            email: result.user.email,
            walletBalance: result.user.walletBalance || 0,
            phone: result.user.phone,
            address: result.user.address,
            state: result.user.state,
            type: result.user.type || 'user',
            agentStatus: result.user.agentStatus || null,
            commissionRate: result.user.commissionRate || null,
        };

        cookieStore.set('vts-user', JSON.stringify(userPayload), cookieOptions);

    } catch (error) {
        // Log the actual error for debugging
        console.error('Login error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Check if it's a network error
        if (error instanceof TypeError && error.message.includes('fetch')) {
            return {
                message: 'Network error: Unable to connect to server. Please check your connection.',
                errors: null,
            };
        }
        
        return {
            message: `An unexpected error occurred: ${errorMessage}. Please try again later.`,
            errors: null,
        };
    }

    redirect('/dashboard');
}

export async function logoutAction() {
    const cookieStore = await cookies();
    cookieStore.delete('vts-token');
    cookieStore.delete('vts-user');
    redirect('/login');
}

