'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';

import { loginAction } from '@/app/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { PasswordInput } from './password-input';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending} size="lg">
      {pending ? 'Signing In...' : 'Sign In'}
    </Button>
  );
}

export function LoginForm() {
  const { toast } = useToast();
  const [state, formAction] = useActionState(loginAction, { message: '', errors: null });

  useEffect(() => {
    if (state.message) {
      toast({
        variant: state.message.includes('Access denied') ? 'destructive' : 'destructive',
        title: state.message.includes('Access denied') ? 'Access Denied' : 'Error',
        description: state.message,
      });
    }
  }, [state.message, toast]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Admin Login</CardTitle>
        <CardDescription>Enter your credentials to access the admin panel.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="admin@example.com" required />
            {state.errors?.email && <p className="text-sm text-destructive">{state.errors.email[0]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput id="password" name="password" required />
            {state.errors?.password && <p className="text-sm text-destructive">{state.errors.password[0]}</p>}
          </div>
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}

