'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, type User, type UserCredential } from 'firebase/auth';

import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirebase } from '@/firebase/provider';
import { findOrCreateUserDocument, type UserProfile } from '@/firebase/auth/user-profile';
import { createLog } from '@/lib/logger';

const loginSchema = z.object({
  fullName: z.string().optional(),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type AuthFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();
  
  const formSchema = loginSchema.superRefine((data, ctx) => {
      if (authMode === 'signup' && (!data.fullName || data.fullName.length < 2)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['fullName'],
          message: "Full name must be at least 2 characters.",
        });
      }
    });


  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '', fullName: '' },
    mode: 'onChange'
  });

  const onSubmit = async (data: AuthFormValues) => {
    if (!auth || !firestore) {
      toast({ title: 'Auth service not available', variant: 'destructive' });
      return;
    }

    try {
      let userCredential: UserCredential;
      if (authMode === 'signin') {
        userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      } else { // signup
        userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      }

      const user = userCredential.user;

      if (user) {
        const userProfile = await findOrCreateUserDocument(firestore, user, authMode === 'signup' ? data.fullName : undefined);
        
        if (authMode === 'signin' && userProfile) {
            await createLog(
              firestore,
              { user, profile: userProfile },
              {
                actionType: 'user_login',
                entityType: 'user',
                entityId: user.uid,
              }
            );
        }
        
        const response = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: user.uid }),
        });

        if (!response.ok) {
            const sessionResult = await response.json();
            throw new Error(sessionResult.error || 'Could not create a session.');
        }

        router.push('/dashboard');
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      let description = 'An unexpected error occurred. Please try again.';

      if (err.code) {
        switch (err.code) {
          case 'auth/invalid-credential':
            description = 'Invalid email or password. Please check your credentials and try again.';
            break;
          case 'auth/email-already-in-use':
            description = 'An account with this email already exists. Please sign in instead.';
            break;
          default:
            description = err.message || 'An unexpected error occurred.';
        }
      } else {
        description = err.message;
      }
      
      toast({
        title: `Failed to ${authMode}`,
        description: description,
        variant: 'destructive',
      });
    }
  };

  const toggleAuthMode = () => {
    setAuthMode(current => (current === 'signin' ? 'signup' : 'signin'));
  };

  return (
    <main className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-sm shadow-2xl rounded-[2.5rem] p-4">
        <CardHeader className="text-center flex flex-col items-center">
          <Image src="/logo.jpeg" alt="Al Fajr Logo" width={80} height={80} className="rounded-full mb-2 object-cover" />
          {/* <CardTitle className="text-3xl font-headline text-primary">Al Fajr</CardTitle> */}
          <CardDescription>
            {authMode === 'signin' 
              ? 'Sign in to your account.' 
              : "Create an account. The first user to sign up will become the Super Admin."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {authMode === 'signup' && (
               <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  {...register('fullName')}
                  disabled={isSubmitting}
                  className="rounded-full"
                />
                {errors.fullName && (
                  <p className="text-sm text-destructive">{errors.fullName.message}</p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                {...register('email')}
                disabled={isSubmitting}
                className="rounded-full"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...register('password')}
                  disabled={isSubmitting}
                  className="pr-10 rounded-full"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent rounded-full"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="sr-only">
                    {showPassword ? "Hide password" : "Show password"}
                  </span>
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full rounded-full" disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : (authMode === 'signin' ? 'Sign In' : 'Sign Up')}
              {authMode === 'signin' ? <LogIn className="ml-2 h-4 w-4" /> : <UserPlus className="ml-2 h-4 w-4" />}
            </Button>
          </form>
          {/* <div className="mt-4 text-center text-sm">
            {authMode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
            <Button variant="link" onClick={toggleAuthMode} disabled={isSubmitting} className="pl-1">
              {authMode === 'signin' ? 'Sign Up' : 'Sign In'}
            </Button>
          </div> */}
        </CardContent>
      </Card>
    </main>
  );
}
