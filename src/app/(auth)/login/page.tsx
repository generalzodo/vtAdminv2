import { LoginForm } from '@/components/auth/login-form';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const error = resolvedSearchParams?.error;
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/50 p-4">
      <LoginForm />
    </div>
  );
}

