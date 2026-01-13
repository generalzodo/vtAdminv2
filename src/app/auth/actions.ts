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
    
    // Fix URL construction to handle trailing slashes
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const loginUrl = `${baseUrl}/users/login`;
    
    try {
        const response = await fetch(loginUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validatedFields.data),
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

        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        };

        cookies().set('vts-token', result.token, cookieOptions);

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

        cookies().set('vts-user', JSON.stringify(userPayload), cookieOptions);

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
    cookies().delete('vts-token');
    cookies().delete('vts-user');
    redirect('/login');
}

